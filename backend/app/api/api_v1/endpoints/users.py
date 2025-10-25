from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

router = APIRouter()

# ---------- Dummy Database ----------
DUMMY_USERS = [
    {"id": 1, "username": "admin", "email": "admin@example.com", "role": "admin"},
    {"id": 2, "username": "user1", "email": "user1@example.com", "role": "user"},
    {"id": 3, "username": "user2", "email": "user2@example.com", "role": "user"},]

# add this later - response_model=List[User]
@router.get("/")
async def list_users():
    """Return a list of all users (dummy)."""
    return DUMMY_USERS