import pytest

from tests.factories import build_send_otp_payload, build_verify_otp_payload


@pytest.mark.integration
def test_send_otp_smoke_success(client, monkeypatch, auth_headers):
    from app.api.api_v1.endpoints.general_routes import auth_routes

    called = {"value": False}

    monkeypatch.setattr(
        auth_routes,
        "get_supabase_user",
        lambda authorization: {"id": "user-123", "email": "user@example.com"},
    )

    def _fake_generate_and_send_otp(user_id, email):
        called["value"] = True
        assert user_id == "user-123"
        assert email == "user@example.com"

    monkeypatch.setattr(auth_routes, "generate_and_send_otp", _fake_generate_and_send_otp)

    response = client.post(
        "/api/v1/auth/send-otp",
        json=build_send_otp_payload(),
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert "message" in response.json()
    assert called["value"] is True


@pytest.mark.integration
def test_send_otp_smoke_email_mismatch(client, monkeypatch, auth_headers):
    from app.api.api_v1.endpoints.general_routes import auth_routes

    monkeypatch.setattr(
        auth_routes,
        "get_supabase_user",
        lambda authorization: {"id": "user-123", "email": "other@example.com"},
    )

    response = client.post(
        "/api/v1/auth/send-otp",
        json=build_send_otp_payload("user@example.com"),
        headers=auth_headers,
    )

    assert response.status_code == 403


@pytest.mark.integration
def test_send_otp_unauthorized_returns_401(client, monkeypatch):
    from app.api.api_v1.endpoints.general_routes import auth_routes

    monkeypatch.setattr(auth_routes, "get_supabase_user", lambda authorization: None)

    response = client.post(
        "/api/v1/auth/send-otp",
        json=build_send_otp_payload(),
    )

    assert response.status_code == 401


@pytest.mark.integration
def test_send_otp_validation_error_returns_422(client, auth_headers):
    response = client.post(
        "/api/v1/auth/send-otp",
        json={},
        headers=auth_headers,
    )

    assert response.status_code == 422


@pytest.mark.integration
def test_send_otp_provider_failure_returns_500(client, monkeypatch, auth_headers):
    from app.api.api_v1.endpoints.general_routes import auth_routes

    monkeypatch.setattr(
        auth_routes,
        "get_supabase_user",
        lambda authorization: {"id": "user-123", "email": "user@example.com"},
    )

    def _raise_provider_error(user_id, email):
        raise Exception("provider down")

    monkeypatch.setattr(auth_routes, "generate_and_send_otp", _raise_provider_error)

    response = client.post(
        "/api/v1/auth/send-otp",
        json=build_send_otp_payload(),
        headers=auth_headers,
    )

    assert response.status_code == 500


@pytest.mark.integration
def test_verify_otp_smoke_success(client, monkeypatch, auth_headers):
    from app.api.api_v1.endpoints.general_routes import auth_routes

    monkeypatch.setattr(
        auth_routes,
        "get_supabase_user",
        lambda authorization: {"id": "user-123", "email": "user@example.com"},
    )
    monkeypatch.setattr(auth_routes, "verify_otp", lambda user_id, email, code: True)

    response = client.post(
        "/api/v1/auth/verify-otp",
        json=build_verify_otp_payload(),
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json().get("mfa_verified") is True


@pytest.mark.integration
def test_verify_otp_invalid_code_returns_400(client, monkeypatch, auth_headers):
    from app.api.api_v1.endpoints.general_routes import auth_routes

    monkeypatch.setattr(
        auth_routes,
        "get_supabase_user",
        lambda authorization: {"id": "user-123", "email": "user@example.com"},
    )
    monkeypatch.setattr(auth_routes, "verify_otp", lambda user_id, email, code: False)

    response = client.post(
        "/api/v1/auth/verify-otp",
        json=build_verify_otp_payload(),
        headers=auth_headers,
    )

    assert response.status_code == 400
