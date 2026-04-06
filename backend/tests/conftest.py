# This module defines pytest fixtures and configuration for the test suite, 
# including environment setup, external service stubs, and common test utilities. 
# The fixtures provide a TestClient instance for making HTTP requests to the app, 
# as well as helper functions for generating authentication headers and test image data. 
# The configuration also includes a custom marker for integration tests.

import io
import importlib
import os
import sys
import types
from pathlib import Path
from typing import Generator

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from PIL import Image

# Ensure backend/app imports work when tests run from either repo root or backend.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def _set_test_env() -> None:
    """Provide safe defaults so settings loading never depends on local secrets."""
    defaults = {
        "DB_HOST": "localhost",
        "DB_NAME": "test_db",
        "DB_USER": "test_user",
        "DB_PASSWORD": "test_password",
        "DB_PORT": "5432",
        "SUPABASE_URL": "https://example.supabase.co",
        "SUPABASE_ANON_PUBLIC_KEY": "test_anon_key",
        "SUPABASE_JWT_SECRET": "test_jwt_secret",
        "SUPABASE_SERVICE_ROLE_KEY": "test_service_role",
        "AWS_ACCESS_KEY_ID": "test_aws_key",
        "AWS_SECRET_ACCESS_KEY": "test_aws_secret",
        "AWS_REGION": "us-east-1",
        "AWS_S3_BUCKET_NAME": "test-bucket",
    }
    for key, value in defaults.items():
        os.environ.setdefault(key, value)

    # Guard against invalid API prefix values coming from shell env or CI settings.
    os.environ.setdefault("API_V1_STR", "/api/v1")
    if not os.environ["API_V1_STR"].startswith("/"):
        os.environ["API_V1_STR"] = f"/{os.environ['API_V1_STR']}"


def _install_external_service_stubs() -> None:
    """Stub heavy/external services before app imports to keep tests deterministic."""

    # botocore.exceptions.ClientError stub for route imports
    botocore_module = types.ModuleType("botocore")
    botocore_exceptions_module = types.ModuleType("botocore.exceptions")

    class ClientError(Exception):
        pass

    botocore_exceptions_module.ClientError = ClientError
    botocore_module.exceptions = botocore_exceptions_module
    sys.modules["botocore"] = botocore_module
    sys.modules["botocore.exceptions"] = botocore_exceptions_module

    # app.services.auth_service stub
    auth_module = types.ModuleType("app.services.auth_service")

    class _DummyAuthClient:
        class auth:
            @staticmethod
            def get_user(token):
                return None

            @staticmethod
            def sign_in_with_otp(payload):
                return {"ok": True}

            @staticmethod
            def verify_otp(payload):
                return {"ok": True}

    def _extract_token(authorization):
        if not authorization or " " not in authorization:
            return None
        scheme, token = authorization.split(" ", 1)
        if scheme.lower() != "bearer":
            return None
        return token.strip()

    def get_supabase_user(authorization=None):
        token = _extract_token(authorization)
        if token in {"test-token", "fake-test-token"}:
            return {"id": "user-123", "email": "user@example.com"}
        return None

    def get_optional_current_user_id(authorization=None):
        user = get_supabase_user(authorization)
        return user["id"] if user else None

    def get_current_user_id(authorization=None):
        user = get_supabase_user(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        return user["id"]

    auth_module.supabase = _DummyAuthClient()
    auth_module.get_supabase_user = get_supabase_user
    auth_module.get_optional_current_user_id = get_optional_current_user_id
    auth_module.get_current_user_id = get_current_user_id
    auth_module.require_supabase_user = lambda authorization=None: get_supabase_user(authorization)
    sys.modules["app.services.auth_service"] = auth_module

    # app.services.model_service stub (avoids torch/model checkpoint load at import time)
    model_module = types.ModuleType("app.services.model_service")

    class EnsembleDiseaseClassifier:
        def __init__(self, config=None):
            self.config = config or {}

        def load_from_checkpoints(self, densenet_paths, resnet_paths):
            self.densenet_paths = densenet_paths
            self.resnet_paths = resnet_paths

    class SkinFilterWrapper:
        def __init__(self, disease_ensemble, threshold=0.7):
            self.disease_ensemble = disease_ensemble
            self.threshold = threshold

        @staticmethod
        def smart_predict(image):
            return {"is_skin": True, "prediction": "eczema", "confidence": 0.91}

    class _DummyModelPipeline:
        @staticmethod
        def smart_predict(image):
            return {"is_skin": True, "prediction": "eczema", "confidence": 0.91}

    class ModelService:
        _instance = None
        classifier_pipeline = None

        def __new__(cls):
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance.classifier_pipeline = cls._load_model_pipeline()
            return cls._instance

        @staticmethod
        def _load_model_pipeline():
            artifacts_dir = Path("app/models/ml/artifacts")
            ensemble_cls = getattr(model_module, "EnsembleDiseaseClassifier")
            wrapper_cls = getattr(model_module, "SkinFilterWrapper")
            ensemble = ensemble_cls(config={"device": "cpu", "w_dense": 0.5, "w_resnet": 0.5})
            ensemble.load_from_checkpoints(
                [
                    artifacts_dir / "densenet121_skin_best1.pth",
                    artifacts_dir / "densenet121_skin_best2.pth",
                    artifacts_dir / "densenet121_skin_best3.pth",
                    artifacts_dir / "densenet121_skin_best4.pth",
                    artifacts_dir / "densenet121_skin_best5.pth",
                ],
                [
                    artifacts_dir / "resnet50_skin_best1.pth",
                    artifacts_dir / "resnet50_skin_best2.pth",
                    artifacts_dir / "resnet50_skin_best3.pth",
                    artifacts_dir / "resnet50_skin_best4.pth",
                    artifacts_dir / "resnet50_skin_best5.pth",
                ],
            )
            return wrapper_cls(disease_ensemble=ensemble, threshold=0.7)

        def smart_predict(self, image):
            if self.classifier_pipeline is None:
                raise RuntimeError("Model pipeline is not loaded.")
            return self.classifier_pipeline.smart_predict(image)

    model_module.ModelService = ModelService
    model_module.EnsembleDiseaseClassifier = EnsembleDiseaseClassifier
    model_module.SkinFilterWrapper = SkinFilterWrapper
    model_module.model_service = ModelService()
    sys.modules["app.services.model_service"] = model_module
    try:
        import app.services as services_pkg
        setattr(services_pkg, "model_service", model_module)
    except Exception:
        pass

    # app.services.report_service stub
    report_module = types.ModuleType("app.services.report_service")
    report_module.generate_report = lambda label, confidence: f"Predicted {label} ({confidence})"
    sys.modules["app.services.report_service"] = report_module

    # app.services.pdf_service stub
    pdf_module = types.ModuleType("app.services.pdf_service")
    pdf_module.generate_prediction_report_pdf = (
        lambda patient_id, report_id, prediction, confidence, report_text: b"%PDF-1.4\n%test"
    )
    sys.modules["app.services.pdf_service"] = pdf_module

    # app.services.s3_service stub
    s3_module = types.ModuleType("app.services.s3_service")

    class _DummyS3Client:
        @staticmethod
        def head_object(**kwargs):
            return {"ok": True}

        @staticmethod
        def list_objects_v2(**kwargs):
            return {"Contents": []}

    class S3Service:
        def __init__(self):
            self.s3_client = _DummyS3Client()

        def upload_pdf_bytes(self, pdf_bytes, s3_key):
            return s3_key

        def upload_image_bytes(self, image_bytes, s3_key, content_type="image/jpeg"):
            return s3_key

        def generate_presigned_download_url(self, s3_key, expires_in=3600):
            return f"https://example.local/{s3_key}?expires={expires_in}"

        def generate_presigned_image_url(self, s3_key, expires_in=3600):
            return f"https://example.local/{s3_key}?expires={expires_in}"

    s3_module.S3Service = S3Service
    sys.modules["app.services.s3_service"] = s3_module


_set_test_env()
_install_external_service_stubs()


def pytest_configure(config):
    config.addinivalue_line("markers", "integration: Cross-layer integration smoke tests with mocked externals.")


@pytest.fixture(scope="session")
def app_instance():
    # model_test injects a mocked app.core.config module during collection.
    # For app startup tests, force a real config module so route paths are valid.
    config_module = sys.modules.get("app.core.config")
    if config_module is not None and "unittest.mock" in type(config_module).__module__:
        del sys.modules["app.core.config"]
        importlib.invalidate_caches()
        importlib.import_module("app.core.config")

    config_module = sys.modules.get("app.core.config")
    if config_module is not None:
        settings_obj = getattr(config_module, "settings", None)
        api_prefix = getattr(settings_obj, "API_V1_STR", None)
        if not isinstance(api_prefix, str):
            try:
                settings_obj.API_V1_STR = "/api/v1"
            except Exception:
                pass
        elif not api_prefix.startswith("/"):
            settings_obj.API_V1_STR = f"/{api_prefix}"

    # If a broken partially-imported app.main exists from previous failed collection, clear it.
    if "app.main" in sys.modules:
        importlib.reload(sys.modules["app.main"])

    from app.main import app

    return app


@pytest.fixture(scope="session")
def client(app_instance) -> Generator[TestClient, None, None]:
    with TestClient(app_instance) as c:
        yield c


@pytest.fixture()
def auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer test-token"}


@pytest.fixture()
def friend_auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer fake-test-token"}


@pytest.fixture
def test_image_bytes() -> bytes:
    img = Image.new("RGB", (32, 32), color="white")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def test_image_file(test_image_bytes: bytes):
    return ("test.jpg", test_image_bytes, "image/jpeg")


@pytest.fixture
def non_image_file():
    return ("not_image.txt", b"hello world", "text/plain")
