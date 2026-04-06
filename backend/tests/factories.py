# This module contains factory functions for building test data used in the test suite,
# such as payloads for API requests and database rows for report history.

from datetime import datetime, timezone

# This function builds a payload for sending an OTP code to a user's email address
def build_send_otp_payload(email: str = "user@example.com") -> dict:
    return {"email": email}


# This function builds a payload for verifying an OTP code, including the email and code
def build_verify_otp_payload(email: str = "user@example.com", code: str = "123456") -> dict:
    return {"email": email, "code": code}


# This function builds a tuple representing a row in the report history database table
def build_history_row(
    report_id: str = "report-1",
    prediction: str = "eczema",
    confidence: float = 0.92,
    report_s3_key: str = "reports/user-123/report-1/report.pdf",
    report_file_name: str = "report.pdf",
    image_s3_key: str = "reports/user-123/report-1/input_image.jpg",
):
    return (
        report_id,
        prediction,
        confidence,
        report_s3_key,
        report_file_name,
        image_s3_key,
        datetime.now(timezone.utc),
        "completed",
        "Looks stable",
        "Eczema",
        datetime.now(timezone.utc),
    )
