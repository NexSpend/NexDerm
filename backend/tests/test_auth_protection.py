import pytest


@pytest.mark.parametrize(
    "method,path,kwargs",
    [
        ("get", "/api/v1/reports/latest", {}),
        ("get", "/api/v1/reports/history", {}),
        ("get", "/api/v1/users/info", {}),
        ("get", "/api/v1/doctors/pending", {}),
        (
            "patch",
            "/api/v1/doctors/case-123/review",
            {"json": {"doctor_notes": "x", "final_diagnosis": "y"}},
        ),
    ],
)
def test_protected_endpoints_reject_missing_auth(client, method, path, kwargs):
    response = getattr(client, method)(path, **kwargs)
    assert response.status_code in (401, 403)