from fastapi import APIRouter, Header, HTTPException
from typing import Optional
from app.services.auth_service import get_current_user
from ..dataBase_endpoints.dataBase_connection import get_connection
import boto3
import os

router = APIRouter(prefix="/reports", tags=["Reports"])

s3_client = boto3.client("s3")
BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME")  # use your real env var name

@router.get("/history", summary="Get report history for logged-in user")
async def get_report_history(
    authorization: Optional[str] = Header(None)
):
    user_id = get_current_user(authorization)

    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT id, prediction, confidence, report_s3_key, report_file_name, created_at
            FROM reports
            WHERE user_id = %s
            ORDER BY created_at DESC;
            """,
            (user_id,)
        )

        rows = cursor.fetchall()

        reports = []
        for row in rows:
            report_id = row[0]
            prediction = row[1]
            confidence = float(row[2]) if row[2] is not None else None
            report_s3_key = row[3]
            report_file_name = row[4]
            created_at = row[5].isoformat() if row[5] else None

            report_url = None
            if report_s3_key:
                report_url = s3_client.generate_presigned_url(
                    "get_object",
                    Params={
                        "Bucket": BUCKET_NAME,
                        "Key": report_s3_key,
                    },
                    ExpiresIn=3600,
                )

            reports.append({
                "id": report_id,
                "prediction": prediction,
                "confidence": confidence,
                "report_url": report_url,
                "report_file_name": report_file_name,
                "created_at": created_at
            })

        return {
            "reports": reports
        }

    finally:
        cursor.close()
        conn.close()