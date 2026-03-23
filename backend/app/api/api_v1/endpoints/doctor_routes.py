from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional, List
from pydantic import BaseModel
import traceback

from app.services.auth_service import get_current_user
from app.api.api_v1.endpoints.dataBase_endpoints.dataBase_connection import get_connection

router = APIRouter()

# Pydantic model for the doctor's review data
class DoctorReview(BaseModel):
    doctor_notes: str
    final_diagnosis: str

# Endpoint to get all reports with a 'Pending' status
# Requires authentication and would typically require a 'doctor' role check
@router.get("/pending", summary="Get all reports with a 'Pending' status")
async def get_pending_cases(
    *,
    authorization: Optional[str] = Header(None)
):
    conn = None
    cursor = None
    try:
        user_id = get_current_user(authorization)
        if not user_id:
            # If user is not authenticated, raise 401
            raise HTTPException(status_code=401, detail="User not authenticated")

        # In a real app, you'd check if the user has a 'doctor' role here.

        # Establish database connection
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT id, prediction, confidence, created_at 
            FROM reports 
            WHERE status = 'Pending'
            ORDER BY created_at DESC;
            """
        )
        
        pending_cases = cursor.fetchall()

        # Convert list of tuples from DB to a list of dictionaries for API response
        result = [
            {
                "id": row[0],
                "prediction": row[1],
                "confidence": row[2],
                "created_at": row[3],
            }
            for row in pending_cases
        ]

        return result

    except HTTPException:
        # Re-raise HTTPExceptions directly
        raise
    except Exception as e:
        print("ERROR IN GET /pending:")
        print(str(e))
        # Print full traceback for debugging
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch pending cases: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Endpoint to submit a doctor's review for a specific case
# Requires authentication and updates the report status and doctor's input
@router.patch("/{case_id}/review", summary="Submit a doctor's review for a case")
async def review_case(
    *,
    case_id: str,
    review: DoctorReview,
    authorization: Optional[str] = Header(None)
):
    conn = None
    cursor = None
    try:
        doctor_id = get_current_user(authorization)
        if not doctor_id:
            # If doctor is not authenticated, raise 401
            raise HTTPException(status_code=401, detail="User not authenticated")

        conn = get_connection()
        cursor = conn.cursor()

        # Execute SQL UPDATE statement to modify the report
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

        if cursor.rowcount == 0:
            # If no row was updated, it means the case_id was not found or its status was not 'Pending'.
            # Rollback the transaction and raise a 404 error.
            conn.rollback()
            raise HTTPException(status_code=404, detail=f"Case with ID {case_id} not found or already reviewed.")

        # Commit the transaction if the update was successful
        conn.commit()

        # Return success message
        return {"status": "success", "message": f"Case {case_id} has been successfully reviewed."}

    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR IN PATCH /{case_id}/review:")
        print(str(e))
        # Print full traceback for debugging
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to submit review: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
