# This module contains tests to verify that the doctor-related endpoints of the application 
# correctly enforce authentication, rejecting requests that do not include valid credentials.

# This test ensures that the endpoint for retrieving pending cases for doctors requires authentication
def test_get_pending_cases_requires_auth(client):
    response = client.get("/api/v1/doctors/pending")
    assert response.status_code in (401, 403)


# This test ensures that the endpoint for submitting a doctor's review of a case requires authentication
def test_submit_doctor_review_requires_auth(client):
    response = client.patch(
        "/api/v1/doctors/case-123/review",
        json={"doctor_notes": "Needs follow-up", "final_diagnosis": "Melanoma"},
    )
    assert response.status_code in (401, 403)