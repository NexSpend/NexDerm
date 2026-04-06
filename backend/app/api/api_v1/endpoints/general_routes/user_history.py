from fastapi import APIRouter, Header
from typing import Optional
from app.services.auth_service import get_current_user_id
from app.services.s3_service import S3Service
from ..dataBase_endpoints.dataBase_connection import get_connection
import os
from botocore.exceptions import ClientError


# initialize the router for report history endpoints
router = APIRouter(prefix="/reports", tags=["Reports"])

BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME")
s3_service = S3Service()


# generate a temporary s3 url for an image with fallback logic if the key is missing
def _generate_presigned_image_url(image_s3_key: Optional[str], report_s3_key: Optional[str]) -> Optional[str]:
    image_key = image_s3_key
    prefix = None
    
    # try to guess the image path from the report path if the db lacks an image key
    if not image_key and report_s3_key and "/" in report_s3_key:
        prefix = report_s3_key.rsplit("/", 1)[0] + "/"
        
        # test standard file extensions to avoid needing s3 list permissions
        common_candidates = [
            prefix + "input_image.jpg",
            prefix + "input_image.jpeg",
            prefix + "input_image.png",
            prefix + "input_image.webp",
        ]
        
        for candidate in common_candidates:
            try:
                # check if the object actually exists in the bucket
                s3_service.s3_client.head_object(Bucket=BUCKET_NAME, Key=candidate)
                image_key = candidate
                break
            except ClientError:
                continue
                
        # scan the folder for images if the standard names weren't found
        if not image_key:
            try:
                objects = s3_service.s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=prefix)
                for obj in objects.get("Contents", []):
                    key = obj.get("Key", "")
                    lower_key = key.lower()
                    # ignore the pdf report itself
                    if lower_key.endswith("report.pdf"):
                        continue
                    # grab the first valid image file we find
                    if lower_key.endswith(".jpg") or lower_key.endswith(".jpeg") or lower_key.endswith(".png") or lower_key.endswith(".webp"):
                        image_key = key
                        break
            except ClientError:
                pass
                
    # hardcode a default path for older db rows as a last resort
    if not image_key and prefix:
        image_key = prefix + "input_image.jpg"
        
    # bail out if we couldn't resolve an image key at all
    if not image_key:
        return None
        
    # generate a secure download url valid for 24 hours
    try:
        return s3_service.generate_presigned_image_url(image_key, expires_in=86400)
    except Exception:
        return None


# retrieve all past skin analyses and metadata for the currently logged-in user
@router.get("/history", 
            summary="Get report history for logged-in user",
            description=""" 
            Retrieves all past skin analyses for the currently logged-in user, ordered from newest to oldest.

            Returns details including AI predictions, physician notes (if reviewed by a doctor), and temporary S3 links to view the original uploaded images.
            """
            )
async def get_report_history(
    authorization: Optional[str] = Header(None)
):
    # get the user id from the auth token
    user_id = get_current_user_id(authorization)
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # fetch all history rows sorted by newest first
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
        
        # format each db row into an api response dictionary
        for row in rows:
            report_id = row[0]
            prediction = row[1]
            confidence = float(row[2]) if row[2] is not None else None
            report_s3_key = row[3]
            report_file_name = row[4]
            image_s3_key = row[5]
            # convert timestamps to iso format strings safely
            created_at = row[6].isoformat() if row[6] else None
            status = row[7]
            doctor_notes = row[8]
            final_diagnosis = row[9]
            reviewed_at = row[10].isoformat() if row[10] else None
            
            # generate a short-lived download link for the pdf
            report_url = None
            if report_s3_key:
                report_url = s3_service.generate_presigned_download_url(report_s3_key, expires_in=3600)
                
            # attempt to retrieve the source image link
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
        # clean up database connections unconditionally
        cursor.close()
        conn.close()