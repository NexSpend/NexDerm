"""
backend/app/api/api_v1/endpoints/model_endpoints/predictions.py

1. ML inference → return prediction to user immediately (~5s)
2. AI text + PDF + S3 + DB → background task (doesn't block response)
"""

from fastapi import APIRouter, BackgroundTasks, UploadFile, File, Header, HTTPException
from typing import Optional
from uuid import uuid4
import traceback
import io
from PIL import Image

from app.services.model_service import model_service
from app.services.report_service import generate_report
from app.services.auth_service import get_optional_current_user_id
from app.services.s3_service import S3Service
from app.services.pdf_service import generate_prediction_report_pdf
from ..dataBase_endpoints.dataBase_connection import get_connection

router = APIRouter()
s3_service = S3Service()


# -----------------------------
# Risk classification helpers
# -----------------------------
HIGH_RISK_DISEASES = {
    "Actinic keratoses",
    "Basal cell carcinoma",
    "Chickenpox",
    "Cowpox",
    "HFMD",
    "Measles",
    "Melanoma",
    "Monkeypox",
    "Squamous cell carcinoma",
}

LOW_RISK_DISEASES = {
    "Benign keratosis-like-lesions",
    "Dermatofibroma",
    "Melanocytic nevi",
    "Vascular lesions",
}

NO_RISK_DISEASES = {
    "Healthy",
}


def _normalize_label(label: str) -> str:
    """Normalize label text for safer matching."""
    return (label or "").strip()


def _get_risk_level(label: str) -> str:
    """
    App-level risk mapping based on disease label, not confidence.
    You can adjust these groups later if your capstone supervisor/team wants different logic.
    """
    normalized_label = _normalize_label(label)

    if normalized_label in NO_RISK_DISEASES:
        return "No Risk"
    if normalized_label in HIGH_RISK_DISEASES:
        return "High Risk"
    if normalized_label in LOW_RISK_DISEASES:
        return "Low Risk"

    # Safe fallback for unknown labels
    return "Low Risk"


def _to_confidence_percentage(confidence: float) -> float:
    """
    Convert confidence into a percentage.
    Supports both:
    - 0 to 1 scale  -> converted to 0 to 100
    - 0 to 100 scale -> kept as is
    """
    if confidence is None:
        return 0.0

    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        return 0.0

    if 0.0 <= confidence <= 1.0:
        return confidence * 100.0
    return confidence


def _get_low_confidence_warning(confidence: float) -> Optional[str]:
    """
    Return a warning message if confidence is below 60%.
    """
    confidence_percentage = _to_confidence_percentage(confidence)
    if confidence_percentage < 60.0:
        return "Confidence is low, so the result may be uncertain."
    return None


def _build_response_payload(label: str, confidence: float, report_id: Optional[str] = None) -> dict:
    """
    Build API response payload while keeping old fields intact.
    """
    confidence_percentage = _to_confidence_percentage(confidence)
    risk_level = _get_risk_level(label)
    low_confidence_warning = _get_low_confidence_warning(confidence)

    response = {
        "prediction": label,
        "confidence": confidence,  # original value kept unchanged for compatibility
        "confidence_percentage": round(confidence_percentage, 2),
        "risk_level": risk_level,
        "low_confidence_warning": low_confidence_warning,
    }

    if report_id is not None:
        response["report_id"] = report_id

    return response


def _build_and_store_report(
    user_id: str,
    report_id: str,
    label: str,
    confidence: float,
    image_bytes: bytes,
    image_filename: str,
    image_content_type: str,
):
    """Runs after response is sent. Generates AI text → PDF → S3 → DB."""
    conn = cursor = None
    try:
        print(f"[bg] generating report for {report_id}")

        report_text = generate_report(label, confidence)  # plain string from AI

        image_ext = "jpg"
        if image_filename and "." in image_filename:
            image_ext = image_filename.rsplit(".", 1)[-1].lower()

        image_content_type = image_content_type or "image/jpeg"
        image_s3_key = f"reports/{user_id}/{report_id}/input_image.{image_ext}"
        s3_service.upload_image_bytes(image_bytes, image_s3_key, image_content_type)
        print("STEP 7: image uploaded to S3, key =", image_s3_key)

        pdf_bytes = generate_prediction_report_pdf(
            patient_id=user_id,
            report_id=report_id,
            prediction=label,
            confidence=confidence,
            report_text=report_text,
        )

        report_s3_key = f"reports/{user_id}/{report_id}/report.pdf"
        s3_service.upload_pdf_bytes(pdf_bytes, report_s3_key)
        print(f"[bg] uploaded → {report_s3_key}")

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE reports SET report_s3_key = %s, report_file_name = %s, image_s3_key = %s, image_file_name = %s WHERE id = %s;",
            (report_s3_key, "report.pdf", image_s3_key, f"input_image.{image_ext}", report_id),
        )
        conn.commit()
        print(f"[bg] DB updated for {report_id}")

    except Exception as e:
        print(f"[bg] ERROR: {e}")
        traceback.print_exc()
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@router.post("/")
async def classify_image(
    *,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    try:
        # Auth
        user_id = None
        try:
            if authorization and authorization.strip():
                user_id = get_optional_current_user_id(authorization)
        except Exception:
            user_id = None

        print("STEP 1: user_id =", user_id)

        # Read image
        image_bytes = await file.read()
        print("STEP 2: image read, bytes =", len(image_bytes))
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file.")

        # ML inference
        result = model_service.smart_predict(image)
        if not result.get("is_skin", True):
            raise HTTPException(status_code=400, detail=result.get("message", "Please upload a skin image."))

        label = result["prediction"]
        confidence = result["confidence"]
        print(f"STEP 3: prediction done = {label} {confidence}")

        # Guest — return immediately, no report
        if not user_id:
            return _build_response_payload(label=label, confidence=confidence)

        # Insert placeholder row
        report_id = str(uuid4())
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO reports (id, user_id, prediction, confidence, report_s3_key, report_file_name) VALUES (%s, %s, %s, %s, %s, %s);",
                (report_id, user_id, label, confidence, "", "pending"),
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()

        # Fire background task
        background_tasks.add_task(
            _build_and_store_report,
            user_id=str(user_id),
            report_id=report_id,
            label=label,
            confidence=confidence,
            image_bytes=image_bytes,
            image_filename=file.filename or "",
            image_content_type=file.content_type or "image/jpeg",
        )
        print(f"STEP 4: response sent, background task scheduled for {report_id}")

        return _build_response_payload(label=label, confidence=confidence, report_id=report_id)

    except HTTPException:
        raise
    except Exception as e:
        print("ERROR:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))