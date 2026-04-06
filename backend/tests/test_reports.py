# Tests for the /reports endpoints, covering both guest and authenticated user scenarios, 
# as well as various edge cases.

from datetime import datetime

# This test verifies that to use the /reports/latest endpoint, the user must be authenticated
def test_get_latest_report_requires_auth(client):
    response = client.get("/api/v1/reports/latest")
    assert response.status_code in (401, 403)


# This test verifies the success case for the /reports/latest endpoint
def test_get_latest_report_success(client, monkeypatch, auth_headers):
    from app.api.api_v1.endpoints.general_routes import report_route

    monkeypatch.setattr(
        report_route,
        "get_current_user_id",
        lambda authorization: "user-123",
    )

    class DummyCursor:
        def execute(self, *args, **kwargs):
            return None

        def fetchone(self):
            return (
                "rep-1",
                "Healthy",
                0.93,
                "reports/user-123/rep-1/report.pdf",
                "report.pdf",
                datetime(2026, 4, 2, 12, 0, 0),
            )

        def close(self):
            return None

    class DummyConn:
        def cursor(self):
            return DummyCursor()

        def close(self):
            return None

    monkeypatch.setattr(report_route, "get_connection", lambda: DummyConn())

    monkeypatch.setattr(
        report_route.s3_service,
        "generate_presigned_download_url",
        lambda s3_key: "https://example.com/report.pdf",
    )

    response = client.get("/api/v1/reports/latest", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["report_id"] == "rep-1"
    assert data["prediction"] == "Healthy"
    assert data["confidence"] == 0.93
    assert data["file_name"] == "report.pdf"
    assert data["download_url"] == "https://example.com/report.pdf"

# This test verifies that to download a report using the /reports/{report_id}/download endpoint, 
# the user must be authenticated
def test_download_report_requires_auth(client):
    response = client.get("/api/v1/reports/some-id/download")
    assert response.status_code in (401, 403)