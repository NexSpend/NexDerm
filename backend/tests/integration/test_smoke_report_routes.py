from datetime import datetime, timezone

import pytest

from tests.helpers.mock_helpers import make_fake_db


@pytest.mark.integration
def test_report_latest_no_data_returns_no_report_payload(client, monkeypatch, auth_headers):
    from app.api.api_v1.endpoints.general_routes import report_route

    conn, _cursor = make_fake_db(fetchone_result=None)
    monkeypatch.setattr(report_route, "get_current_user_id", lambda authorization: "user-123")
    monkeypatch.setattr(report_route, "get_connection", lambda: conn)

    response = client.get("/api/v1/reports/latest", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == {"error": "No report found"}


@pytest.mark.integration
def test_report_latest_pending_returns_202(client, monkeypatch, auth_headers):
    from app.api.api_v1.endpoints.general_routes import report_route

    row = (
        "report-1",
        "eczema",
        0.92,
        "",
        "pending",
        datetime.now(timezone.utc),
    )
    conn, _cursor = make_fake_db(fetchone_result=row)

    monkeypatch.setattr(report_route, "get_current_user_id", lambda authorization: "user-123")
    monkeypatch.setattr(report_route, "get_connection", lambda: conn)

    response = client.get("/api/v1/reports/latest", headers=auth_headers)

    assert response.status_code == 202


@pytest.mark.integration
def test_report_download_not_found_returns_404(client, monkeypatch, auth_headers):
    from app.api.api_v1.endpoints.general_routes import report_route

    conn, _cursor = make_fake_db(fetchone_result=None)
    monkeypatch.setattr(report_route, "get_current_user_id", lambda authorization: "user-123")
    monkeypatch.setattr(report_route, "get_connection", lambda: conn)

    response = client.get("/api/v1/reports/report-123/download", headers=auth_headers)

    assert response.status_code == 404


@pytest.mark.integration
def test_report_download_ready_returns_url(client, monkeypatch, auth_headers):
    from app.api.api_v1.endpoints.general_routes import report_route

    conn, _cursor = make_fake_db(fetchone_result=("reports/user-123/report-1/report.pdf", "report.pdf"))
    monkeypatch.setattr(report_route, "get_current_user_id", lambda authorization: "user-123")
    monkeypatch.setattr(report_route, "get_connection", lambda: conn)
    monkeypatch.setattr(
        report_route.s3_service,
        "generate_presigned_download_url",
        lambda s3_key: "https://example.local/download.pdf",
    )

    response = client.get("/api/v1/reports/report-1/download", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == {"download_url": "https://example.local/download.pdf"}
