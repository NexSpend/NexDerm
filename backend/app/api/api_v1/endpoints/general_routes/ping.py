from fastapi import APIRouter
from sqlalchemy import text
from app.core.database import engine


router = APIRouter()

@router.get("/",
            summary="Check API Status",
            description = "Check if the backend server is running and awake")
async def ping():
    return {"message": "Working"}

@router.get("/db",
            summary="Check Database Connection",
            description="Check if the backend is able to connect to the database.")
def ping_db():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "message": "Connected to Supabase successfully!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}