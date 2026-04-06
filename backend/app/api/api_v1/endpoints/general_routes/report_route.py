from fastapi import APIRouter, Header, HTTPException
from typing import Optional

from app.services.auth_service import get_current_user_id
from app.services.s3_service import S3Service
from ..dataBase_endpoints.dataBase_connection import get_connection

# initialize the router for report endpoints
router = APIRouter(prefix="/reports", tags=["Reports"])

s3_service = S3Service()


# generate a secure temporary s3 link to download a specific medical report
@router.get("/{report_id}/download",
            summary="Download Medical Report",
            description="Generates a secure, temporary AWS S3 link to download a specific PDF medical report. If the external AI is still working on the report in the background, then a `202 Accepted` response is generated for trying again after sometime."
             )
def get_report_download_url(report_id: str, authorization: Optional[str] = Header(None)):
    # extract user id from the auth token
    user_id = get_current_user_id(authorization)
    # block the request if the user is unauthenticated
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # establish db connection and cursor
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # fetch the s3 key and filename for this specific report
        cursor.execute(
            """
            SELECT report_s3_key, report_file_name
            FROM reports
            WHERE id = %s AND user_id = %s;
            """,
            (report_id, user_id)
        )
        row = cursor.fetchone()

        # 404 if the report doesn't exist or doesn't belong to the user
        if not row:
            raise HTTPException(status_code=404, detail="Report not found")

        s3_key, file_name = row

        # tell the client to retry later if the report is still processing
        if not s3_key or file_name == "pending":
            raise HTTPException(status_code=202, detail="Report is still being generated. Please try again in a few seconds.")

        # ask s3 for a temporary signed download url
        download_url = s3_service.generate_presigned_download_url(s3_key)
        return {"download_url": download_url}
    finally:
        # always clean up db resources
        cursor.close()
        conn.close()


# automatically find and return the most recent skin analysis report for the logged in user
@router.get("/latest", 
            summary="Get the latest report for the logged-in user",
            description="Automatically finds and returns the most recent skin analysis report for the currently logged in user. Includes the AI's prediction, confidence score, and a fresh temporary download link for the PDF. Useful for showing immediate results right after an image upload."
            )
def get_latest_report(authorization: Optional[str] = Header(None)):
    # grab the user id from the provided token
    user_id = get_current_user_id(authorization)
    # bail out if the token is invalid or missing
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # open a connection to the database
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # query the most recently created report for this user
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

        # return a simple error object if the user has no reports yet
        if not r:
            return {"error": "No report found"}

        report_id, prediction, confidence, s3_key, file_name, created_at = r

        # return a 202 if the background generation task hasn't finished yet
        if not s3_key or file_name == "pending":
            raise HTTPException(status_code=202, detail="Report is still being generated. Please try again in a few seconds.")

        # generate a short-lived download link for the pdf
        download_url = s3_service.generate_presigned_download_url(s3_key)

        return {
            "report_id": str(report_id),
            "prediction": prediction,
            "confidence": float(confidence),
            "file_name": file_name,
            "download_url": download_url,
            "created_at": created_at.isoformat()
        }
    finally:
        # ensure db connections are closed even if an error occurs
        cursor.close()
        conn.close()