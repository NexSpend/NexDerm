# app/api/report_routes.py

from fastapi import APIRouter, Header, HTTPException
from typing import Optional

from app.services.auth_service import get_current_user
from app.services.s3_service import S3Service
from ..dataBase_endpoints.dataBase_connection import get_connection

router = APIRouter(prefix="/reports", tags=["reports"])

s3_service = S3Service()


@router.get("/latest", summary="Get the latest report for the logged-in user")
def get_latest_report(authorization: Optional[str] = Header(None)):

    user_id = get_current_user(authorization)

    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, prediction, confidence, report_s3_key, report_file_name, created_at
        FROM reports
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 1;
        """,
        (user_id,)
    )

    r = cursor.fetchone()

    cursor.close()
    conn.close()

    if not r:
        return {"error": "No report found"}

    report_id, prediction, confidence, s3_key, file_name, created_at = r

    # Generate presigned download URL
    download_url = s3_service.generate_presigned_download_url(s3_key)

    return {
        "report_id": str(report_id),
        "prediction": prediction,
        "confidence": float(confidence),
        "file_name": file_name,
        "download_url": download_url,
        "created_at": created_at.isoformat()
    }