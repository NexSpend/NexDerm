# app/api/predictions.py
from fastapi import APIRouter, UploadFile, File, Header
from app.services.model_service import model_service
from app.services.report_service import generate_report
from app.services.auth_service import get_current_user
from ..dataBase_endpoints.dataBase_connection import get_connection
from typing import Optional

router = APIRouter()

@router.post("/", summary="Upload an image, get prediction, and store report")
async def classify_image(
    *,
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None)
):
    user_id = get_current_user(authorization)
    print("LOGGED-IN USER ID:", user_id)

    image_bytes = await file.read()
    label, confidence = model_service.predict_from_image_bytes(image_bytes)
    report_text = generate_report(label, confidence)

    report_id = None
    if user_id:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO reports (user_id, prediction, confidence, report_text)
            VALUES (%s, %s, %s, %s)
            RETURNING id;
            """,
            (user_id, label, confidence, report_text)
        )
        report_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()
        conn.close()

    return {
        "prediction": label,
        "confidence": confidence,
        "report_id": report_id,
        "recommendations": "This is a demo response. Please consult a dermatologist."
    }