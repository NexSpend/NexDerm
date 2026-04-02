from datetime import datetime, timezone


def build_send_otp_payload(email: str = "user@example.com") -> dict:
    return {"email": email}


def build_verify_otp_payload(email: str = "user@example.com", code: str = "123456") -> dict:
    return {"email": email, "code": code}


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
