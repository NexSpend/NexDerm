from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional, List
from pydantic import BaseModel
import traceback

from app.services.auth_service import get_current_user_id
from app.services.s3_service import S3Service
from app.api.api_v1.endpoints.dataBase_endpoints.dataBase_connection import get_connection

router = APIRouter()
s3_service = S3Service()


# define the payload shape for incoming doctor reviews
class DoctorReview(BaseModel):
    doctor_notes: str
    final_diagnosis: str


# fetch all unreviewed cases from the database
@router.get("/pending", 
            summary="Retrieves Pending Patient Cases",
            description="Fetches a list of all patient reports currently marked with a Pending status. The response includes AI model's prediction details, confidence scores, a temporary pre-signed URL to view the uploaded skin image also the patient's name and email. Requires a valid doctor's authorization token in the header. ")
async def get_pending_cases(
    *,
    authorization: Optional[str] = Header(None)
):
    conn = None
    cursor = None
    try:
        user_id = get_current_user_id(authorization)
        # bounce unauthenticated requests immediately
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")

        conn = get_connection()
        cursor = conn.cursor()
        
        # pull pending cases along with joined user details
        cursor.execute(
            """
            SELECT 
                r.id, 
                r.prediction, 
                r.confidence, 
                r.created_at,
                r.image_s3_key,
                u.full_name,
                u.email
            FROM reports r
            LEFT JOIN "newUsers" u ON r.user_id = u.id
            WHERE r.status = 'Pending'
            ORDER BY r.created_at DESC;
            """
        )
        pending_cases = cursor.fetchall()
        result = []

        # map db rows to dicts for the json response
        for row in pending_cases:
            image_url = None
            # generate a short-lived s3 link if an image key exists
            if row[4]:
                image_url = s3_service.generate_presigned_image_url(row[4], expires_in=3600)

            result.append(
                {
                    "id": str(row[0]),
                    "prediction": row[1],
                    "confidence": float(row[2]) if row[2] is not None else 0.0,
                    "created_at": row[3].isoformat() if row[3] else None,
                    "image_url": image_url,
                    "user_name": row[5],
                    "user_email": row[6],
                }
            )
        return result

    except HTTPException:
        # pass auth errors straight through
        raise
    except Exception as e:
        print("ERROR IN GET /pending:")
        print(str(e))
        traceback.print_exc()
        # catch everything else and surface a generic 500
        raise HTTPException(status_code=500, detail=f"Failed to fetch pending cases: {str(e)}")
    finally:
        # always clean up db resources
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# apply a doctor's review and update the case status
@router.patch("/{case_id}/review", 
              summary="Submit Medical Review for a Case",
              description="Allows an authenticated doctor to submit their final diagnosis and clinical notes for a specific pending case. This updates the report's status to 'Reviewed', links the doctor to the patient's report, and records the current timestamp. Requires a valid authorization token in the header and the target `case_id` in the URL path."  
              )
async def review_case(
    *,
    case_id: str,
    review: DoctorReview,
    authorization: Optional[str] = Header(None)
):
    conn = None
    cursor = None
    try:
        doctor_id = get_current_user_id(authorization)
        # block unauthenticated requests
        if not doctor_id:
            raise HTTPException(status_code=401, detail="User not authenticated")

        conn = get_connection()
        cursor = conn.cursor()

        # update report status and assign doctor info
        cursor.execute(
            """
            UPDATE reports
            SET 
                status = 'Reviewed',
                doctor_id = %s,
                doctor_notes = %s,
                final_diagnosis = %s,
                reviewed_at = NOW()
            WHERE id = %s AND status = 'Pending';
            """,
            (doctor_id, review.doctor_notes, review.final_diagnosis, case_id)
        )

        # verify the target case was actually pending and exists
        if cursor.rowcount == 0:
            conn.rollback()
            raise HTTPException(status_code=404, detail=f"Case with ID {case_id} not found or already reviewed.")

        # lock in the update
        conn.commit()
        return {"status": "success", "message": f"Case {case_id} has been successfully reviewed."}

    except HTTPException:
        # bubble up auth or 404 errors
        raise
    except Exception as e:
        print(f"ERROR IN PATCH /{case_id}/review:")
        print(str(e))
        traceback.print_exc()
        # wrap unhandled exceptions in a 500
        raise HTTPException(status_code=500, detail=f"Failed to submit review: {str(e)}")
    finally:
        # tear down db connection
        if cursor:
            cursor.close()
        if conn:
            conn.close()