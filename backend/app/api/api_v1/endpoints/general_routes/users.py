# app/api/users.py
from fastapi import APIRouter, Header, HTTPException
from typing import Optional
from app.services.auth_service import get_current_user_id
from ..dataBase_endpoints.dataBase_connection import get_connection

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/info")
async def get_user_info(authorization: Optional[str] = Header(None)):
    user_id = get_current_user_id(authorization)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT full_name, email
            FROM "newUsers"
            WHERE id = %s
            """,
            (user_id,)
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "full_name": row[0],
            "email": row[1]
        }

    finally:
        cursor.close()
        conn.close()