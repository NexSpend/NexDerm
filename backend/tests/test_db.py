# This module contains unit tests for the database interactions in the doctor routes 
# of the application, ensuring that the correct SQL queries are executed and that the 
# application correctly handles

import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime


# This test verifies that the get_pending_cases endpoint correctly retrieves pending cases for a doctor
@patch("app.api.api_v1.endpoints.doctor_routes.get_connection")
@patch("app.api.api_v1.endpoints.doctor_routes.get_current_user_id")
def test_get_pending_cases_success(mock_get_current_user, mock_get_connection, client):
    mock_get_current_user.return_value = "fake-doctor-uuid"

    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_get_connection.return_value = mock_conn
    mock_conn.cursor.return_value = mock_cursor

    # Simulate the DB returning one pending case
    mock_cursor.fetchall.return_value = [
    ("case-1", "Melanoma", 0.95, datetime(2026, 4, 3), "fake_image_key.jpg", "John Doe", "john.doe@example.com")
]

    response = client.get("/api/v1/doctors/pending", headers={"Authorization": "Bearer fake_token"})

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["prediction"] == "Melanoma"
    
    # Verify the correct SQL query was executed
    sql_query = mock_cursor.execute.call_args[0][0]
    assert "status = 'Pending'" in sql_query


# This test verifies that the submit_doctor_review endpoint 
# correctly updates the report with the doctor's review and diagnosis
@patch("app.api.api_v1.endpoints.doctor_routes.get_connection")
@patch("app.api.api_v1.endpoints.doctor_routes.get_current_user_id")
def test_submit_doctor_review_success(mock_get_current_user, mock_get_connection, client):
    mock_get_current_user.return_value = "fake-doctor-uuid"

    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_get_connection.return_value = mock_conn
    mock_conn.cursor.return_value = mock_cursor

    payload = {
        "doctor_notes": "Looks benign, monitoring recommended.",
        "final_diagnosis": "Benign keratosis"
    }

    response = client.patch(
        "/api/v1/doctors/case-123/review", 
        json=payload,
        headers={"Authorization": "Bearer fake_token"}
    )

    assert response.status_code == 200 
    
    # Verify the database UPDATE was executed
    assert mock_cursor.execute.called
    sql_query = mock_cursor.execute.call_args[0][0]
    
    assert "UPDATE reports" in sql_query
    assert "status = 'Reviewed'" in sql_query
    
    # Verify connection was committed and closed
    assert mock_conn.commit.called
    assert mock_conn.close.called


# This test verifies that if the database connection fails
@patch("app.api.api_v1.endpoints.doctor_routes.get_connection")
@patch("app.api.api_v1.endpoints.doctor_routes.get_current_user_id")
def test_database_connection_failure(mock_get_current_user, mock_get_connection, client):
    mock_get_current_user.return_value = "fake-doctor-uuid"
    
    # Force the database connection to throw an exception
    mock_get_connection.side_effect = Exception("Database is offline")

    response = client.get("/api/v1/doctors/pending", headers={"Authorization": "Bearer fake_token"})

    # The API should gracefully catch the error and return a 500 status code, not crash the server
    assert response.status_code == 500
    assert "Database is offline" in response.json()["detail"]