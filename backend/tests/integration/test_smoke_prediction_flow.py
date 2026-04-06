# This module contains integration tests for the smoke prediction flow of the application,
# ensuring that the prediction endpoint works correctly for both authenticated and guest users,
# and that it handles various edge cases such as invalid images and database failures.

import io

import pytest
from PIL import Image

from tests.helpers.mock_helpers import make_fake_db


def _make_image_bytes() -> bytes:
    image = Image.new("RGB", (8, 8), color=(120, 80, 40))
    buff = io.BytesIO()
    image.save(buff, format="JPEG")
    return buff.getvalue()


@pytest.mark.integration
def test_prediction_guest_smoke(client, monkeypatch):
    from app.api.api_v1.endpoints.model_endpoints import predictions

    monkeypatch.setattr(predictions, "get_optional_current_user_id", lambda authorization: None)

    class _FakeModel:
        @staticmethod
        def smart_predict(image):
            return {"is_skin": True, "prediction": "melanoma", "confidence": 0.88}

    monkeypatch.setattr(predictions, "model_service", _FakeModel())

    files = {"file": ("sample.jpg", _make_image_bytes(), "image/jpeg")}
    response = client.post("/api/v1/predictions/", files=files)

    assert response.status_code == 200
    body = response.json()
    assert body["prediction"] == "melanoma"
    assert "report_id" not in body


@pytest.mark.integration
def test_prediction_authenticated_smoke(client, monkeypatch, auth_headers):
    from app.api.api_v1.endpoints.model_endpoints import predictions

    monkeypatch.setattr(predictions, "get_optional_current_user_id", lambda authorization: "user-123")

    class _FakeModel:
        @staticmethod
        def smart_predict(image):
            return {"is_skin": True, "prediction": "psoriasis", "confidence": 0.81}

    monkeypatch.setattr(predictions, "model_service", _FakeModel())
    monkeypatch.setattr(predictions, "_build_and_store_report", lambda **kwargs: None)

    conn, cursor = make_fake_db()
    monkeypatch.setattr(predictions, "get_connection", lambda: conn)

    files = {"file": ("sample.jpg", _make_image_bytes(), "image/jpeg")}
    response = client.post("/api/v1/predictions/", files=files, headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["prediction"] == "psoriasis"
    assert "report_id" in body

    assert len(cursor.executed) == 1
    assert "INSERT INTO reports" in cursor.executed[0][0]
    assert conn.committed is True


@pytest.mark.integration
def test_prediction_invalid_image_returns_400(client):
    files = {"file": ("not_an_image.jpg", b"not image bytes", "image/jpeg")}
    response = client.post("/api/v1/predictions/", files=files)

    assert response.status_code == 400


@pytest.mark.integration
def test_prediction_non_skin_returns_400(client, monkeypatch):
    from app.api.api_v1.endpoints.model_endpoints import predictions

    class _FakeModel:
        @staticmethod
        def smart_predict(image):
            return {"is_skin": False, "message": "Please upload a skin image."}

    monkeypatch.setattr(predictions, "model_service", _FakeModel())

    files = {"file": ("sample.jpg", _make_image_bytes(), "image/jpeg")}
    response = client.post("/api/v1/predictions/", files=files)

    assert response.status_code == 400


@pytest.mark.integration
def test_prediction_authenticated_db_failure_returns_500(client, monkeypatch, auth_headers):
    from app.api.api_v1.endpoints.model_endpoints import predictions

    monkeypatch.setattr(predictions, "get_optional_current_user_id", lambda authorization: "user-123")

    class _FakeModel:
        @staticmethod
        def smart_predict(image):
            return {"is_skin": True, "prediction": "psoriasis", "confidence": 0.81}

    class _FailingCursor:
        @staticmethod
        def execute(query, params=None):
            raise RuntimeError("db insert failed")

        @staticmethod
        def close():
            return None

    class _FailingConnection:
        @staticmethod
        def cursor():
            return _FailingCursor()

        @staticmethod
        def commit():
            return None

        @staticmethod
        def close():
            return None

    monkeypatch.setattr(predictions, "model_service", _FakeModel())
    monkeypatch.setattr(predictions, "get_connection", lambda: _FailingConnection())

    files = {"file": ("sample.jpg", _make_image_bytes(), "image/jpeg")}
    response = client.post("/api/v1/predictions/", files=files, headers=auth_headers)

    assert response.status_code == 500
