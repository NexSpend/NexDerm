# This module contains integration tests for the application's routes, 
# ensuring that they respond correctly to HTTP requests.

import pytest


@pytest.mark.integration
def test_root_route_smoke(client):
    response = client.get("/")

    assert response.status_code == 200
    assert "message" in response.json()


@pytest.mark.integration
def test_ping_route_smoke(client):
    response = client.get("/api/v1/ping/")

    assert response.status_code == 200
    assert response.json() == {"message": "Working"}
