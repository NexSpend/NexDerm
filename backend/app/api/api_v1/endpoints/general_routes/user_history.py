from fastapi import APIRouter, Header
from typing import Optional
from app.services.auth_service import get_current_user_id
from app.services.s3_service import S3Service
from ..dataBase_endpoints.dataBase_connection import get_connection
import os
from botocore.exceptions import ClientError

router = APIRouter(prefix="/reports", tags=["Reports"])

BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME")
s3_service = S3Service()


def _generate_presigned_image_url(image_s3_key: Optional[str], report_s3_key: Optional[str]) -> Optional[str]:
    image_key = image_s3_key
    prefix = None

    if not image_key and report_s3_key and "/" in report_s3_key:
        prefix = report_s3_key.rsplit("/", 1)[0] + "/"
        # Try common names first; only requires object-level permissions.
        common_candidates = [
            prefix + "input_image.jpg",
            prefix + "input_image.jpeg",
            prefix + "input_image.png",
            prefix + "input_image.webp",
        ]

        for candidate in common_candidates:
            try:
                s3_service.s3_client.head_object(Bucket=BUCKET_NAME, Key=candidate)
                image_key = candidate
                break
            except ClientError:
                continue

        # Final fallback for non-standard names if list is permitted.
        if not image_key:
            try:
                objects = s3_service.s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=prefix)
                for obj in objects.get("Contents", []):
                    key = obj.get("Key", "")
                    lower_key = key.lower()
                    if lower_key.endswith("report.pdf"):
                        continue
                    if lower_key.endswith(".jpg") or lower_key.endswith(".jpeg") or lower_key.endswith(".png") or lower_key.endswith(".webp"):
                        image_key = key
                        break
            except ClientError:
                pass

    # Best-effort fallback for older rows where DB key is empty and list/head may be restricted.
    if not image_key and prefix:
        image_key = prefix + "input_image.jpg"

    if not image_key:
        return None

    try:
        return s3_service.generate_presigned_image_url(image_key, expires_in=86400)
    except Exception:
        return None


@router.get("/history", summary="Get report history for logged-in user")
async def get_report_history(
    authorization: Optional[str] = Header(None)
):
    user_id = get_current_user_id(authorization)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT
                id,
                prediction,
                confidence,
                report_s3_key,
                report_file_name,
                image_s3_key,
                created_at,
                status,
                doctor_notes,
                final_diagnosis,
                reviewed_at
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
            image_s3_key = row[5]
            created_at = row[6].isoformat() if row[6] else None
            status = row[7]
            doctor_notes = row[8]
            final_diagnosis = row[9]
            reviewed_at = row[10].isoformat() if row[10] else None

            report_url = None
            if report_s3_key:
                report_url = s3_service.generate_presigned_download_url(report_s3_key, expires_in=3600)

            image_url = _generate_presigned_image_url(image_s3_key, report_s3_key)

            reports.append({
                "id": str(report_id),
                "prediction": prediction,
                "confidence": confidence,
                "report_url": report_url,
                "image_url": image_url,
                "report_file_name": report_file_name,
                "created_at": created_at,
                "status": status,
                "doctor_notes": doctor_notes,
                "final_diagnosis": final_diagnosis,
                "reviewed_at": reviewed_at,
            })

        return {
            "reports": reports
        }

    finally:
        cursor.close()
        conn.close()