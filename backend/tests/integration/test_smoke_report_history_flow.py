import pytest

from tests.factories import build_history_row
from tests.helpers.mock_helpers import make_fake_db


@pytest.mark.integration
def test_report_history_smoke(client, monkeypatch, auth_headers):
    from app.api.api_v1.endpoints.general_routes import user_history

    sample_row = build_history_row()
    conn, _cursor = make_fake_db(fetchall_result=[sample_row])

    monkeypatch.setattr(user_history, "get_current_user_id", lambda authorization: "user-123")
    monkeypatch.setattr(user_history, "get_connection", lambda: conn)
    monkeypatch.setattr(
        user_history,
        "_generate_presigned_image_url",
        lambda image_s3_key, report_s3_key: "https://example.local/image.jpg",
    )
    monkeypatch.setattr(
        user_history.s3_service,
        "generate_presigned_download_url",
        lambda s3_key, expires_in=3600: "https://example.local/report.pdf",
    )

    response = client.get("/api/v1/reports/history", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert "reports" in body
    assert len(body["reports"]) == 1
    assert body["reports"][0]["report_url"] == "https://example.local/report.pdf"


@pytest.mark.integration
def test_report_history_empty_list_contract(client, monkeypatch, auth_headers):
    from app.api.api_v1.endpoints.general_routes import user_history

    conn, _cursor = make_fake_db(fetchall_result=[])
    monkeypatch.setattr(user_history, "get_current_user_id", lambda authorization: "user-123")
    monkeypatch.setattr(user_history, "get_connection", lambda: conn)

    response = client.get("/api/v1/reports/history", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == {"reports": []}
