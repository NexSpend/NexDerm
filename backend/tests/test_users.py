def test_get_user_info_requires_auth(client):
    response = client.get("/api/v1/users/info")
    assert response.status_code in (401, 403)