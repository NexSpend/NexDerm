from unittest.mock import MagicMock


def test_prediction_guest_success_returns_prediction_fields(
    client, monkeypatch, test_image_file
):
    from app.api.api_v1.endpoints.model_endpoints import predictions

    fake_result = {
        "is_skin": True,
        "prediction": "Healthy",
        "confidence": 0.94,
    }

    monkeypatch.setattr(
        predictions.model_service,
        "smart_predict",
        lambda image: fake_result,
    )

    response = client.post(
        "/api/v1/predictions/",
        files={"file": test_image_file},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] == "Healthy"
    assert data["confidence"] == 0.94
    assert data["confidence_percentage"] == 94.0
    assert data["risk_level"] == "No Risk"
    assert data["low_confidence_warning"] is None
    assert "report_id" not in data


def test_prediction_authenticated_success_returns_report_id(
    client, monkeypatch, test_image_file, auth_headers
):
    from app.api.api_v1.endpoints.model_endpoints import predictions

    fake_result = {
        "is_skin": True,
        "prediction": "Melanoma",
        "confidence": 0.92,
    }

    monkeypatch.setattr(
        predictions.model_service,
        "smart_predict",
        lambda image: fake_result,
    )

    monkeypatch.setattr(
        predictions,
        "get_optional_current_user_id",
        lambda authorization: "user-123",
    )

    class DummyCursor:
        def execute(self, *args, **kwargs):
            return None

        def close(self):
            return None

    class DummyConn:
        def cursor(self):
            return DummyCursor()

        def commit(self):
            return None

        def close(self):
            return None

    monkeypatch.setattr(predictions, "get_connection", lambda: DummyConn())

    response = client.post(
        "/api/v1/predictions/",
        files={"file": test_image_file},
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] == "Melanoma"
    assert data["risk_level"] == "High Risk"
    assert data["low_confidence_warning"] is None
    assert "report_id" in data


def test_prediction_low_confidence_warning_present(
    client, monkeypatch, test_image_file
):
    from app.api.api_v1.endpoints.model_endpoints import predictions

    fake_result = {
        "is_skin": True,
        "prediction": "Melanocytic nevi",
        "confidence": 0.52,
    }

    monkeypatch.setattr(
        predictions.model_service,
        "smart_predict",
        lambda image: fake_result,
    )

    response = client.post(
        "/api/v1/predictions/",
        files={"file": test_image_file},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] == "Melanocytic nevi"
    assert data["risk_level"] == "Low Risk"
    assert data["confidence_percentage"] == 52.0
    assert data["low_confidence_warning"] == "Confidence is low, so the result may be uncertain."


def test_prediction_invalid_image_returns_400(client):
    response = client.post(
        "/api/v1/predictions/",
        files={"file": ("bad.jpg", b"not-a-real-image", "image/jpeg")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid image file."


def test_prediction_missing_file_returns_422(client):
    response = client.post("/api/v1/predictions/")
    assert response.status_code == 422


def test_prediction_non_skin_returns_400(
    client, monkeypatch, test_image_file
):
    from app.api.api_v1.endpoints.model_endpoints import predictions

    fake_result = {
        "is_skin": False,
        "message": "Please upload a skin image.",
    }

    monkeypatch.setattr(
        predictions.model_service,
        "smart_predict",
        lambda image: fake_result,
    )

    response = client.post(
        "/api/v1/predictions/",
        files={"file": test_image_file},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Please upload a skin image."


def test_prediction_model_exception_returns_500(
    client, monkeypatch, test_image_file
):
    from app.api.api_v1.endpoints.model_endpoints import predictions

    def raise_error(image):
        raise RuntimeError("model crashed")

    monkeypatch.setattr(
        predictions.model_service,
        "smart_predict",
        raise_error,
    )

    response = client.post(
        "/api/v1/predictions/",
        files={"file": test_image_file},
    )

    assert response.status_code == 500
    assert "model crashed" in response.json()["detail"]