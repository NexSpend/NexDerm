import io
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from PIL import Image

# CHANGE THIS IMPORT TO MATCH YOUR PROJECT
# Example possibilities:
# from app.main import app
# from main import app
from app.main import app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_headers() -> dict[str, str]:
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