def test_get_pending_cases_requires_auth(client):
    response = client.get("/api/v1/doctors/pending")
    assert response.status_code in (401, 403)


def test_submit_doctor_review_requires_auth(client):
    response = client.patch(
        "/api/v1/doctors/case-123/review",
        json={"doctor_notes": "Needs follow-up", "final_diagnosis": "Melanoma"},
    )
    assert response.status_code in (401, 403)