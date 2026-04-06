# app/api/users.py
from fastapi import APIRouter, Header, HTTPException
from typing import Optional
from app.services.auth_service import get_current_user_id
from ..dataBase_endpoints.dataBase_connection import get_connection

# initialize the router for user profile endpoints
router = APIRouter(prefix="/users", tags=["Users"])


# fetch profile details for the currently authenticated user
@router.get("/info",
            summary="Retrieve User Information",
            description="Fetches the profile details i.e. Full Name and email of the curretly authenticated user. requires a valid authorization token in the header.")
async def get_user_info(authorization: Optional[str] = Header(None)):
    # grab the user id from the provided token
    user_id = get_current_user_id(authorization)
    
    # open a connection to the database
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # query name and email for this specific user
        cursor.execute(
            """
            SELECT full_name, email
            FROM "newUsers"
            WHERE id = %s
            """,
            (user_id,)
        )
        row = cursor.fetchone()
        
        # return a 404 if the user record is missing
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {
            "full_name": row[0],
            "email": row[1]
        }
        
    finally:
        # clean up db connections unconditionally
        cursor.close()
        conn.close()