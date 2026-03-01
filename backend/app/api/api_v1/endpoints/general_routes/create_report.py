# app/api/report_routes.py
from fastapi import APIRouter, Header, HTTPException
from typing import Optional
from app.services.auth_service import get_current_user
from ..dataBase_endpoints.dataBase_connection import get_connection

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/latest", summary="Get the latest report for the logged-in user")
def get_latest_report(authorization: Optional[str] = Header(None)):
    user_id = get_current_user(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT report_text, created_at
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

    return {
        "report_text": r[0],
        "created_at": r[1].isoformat()
    }