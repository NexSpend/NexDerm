from typing import Optional
from supabase import create_client
from fastapi import Header, HTTPException
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None

    try:
        scheme, token = authorization.split(" ", 1)
        if scheme.lower() != "bearer":
            return None
        return token.strip()
    except ValueError:
        return None


def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    token = _extract_bearer_token(authorization)

    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    try:
        user_response = supabase.auth.get_user(token)

        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        return user_response.user.id

    except HTTPException:
        raise
    except Exception as e:
        print("AUTH ERROR:", e)
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_optional_current_user_id(authorization: Optional[str] = Header(None)) -> Optional[str]:
    token = _extract_bearer_token(authorization)

    if not token:
        return None

    try:
        user_response = supabase.auth.get_user(token)

        if user_response.user:
            return user_response.user.id

        return None

    except Exception as e:
        print("OPTIONAL AUTH ERROR:", e)
        return None