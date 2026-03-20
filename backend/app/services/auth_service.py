from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from supabase import create_client
from fastapi import Header
from jose import jwt, JWTError
import os
from dotenv import load_dotenv

from app.core.config import settings

# Load .env file
load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

MFA_JWT_ALGORITHM = "HS256"


def _extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None

    try:
        scheme, token = authorization.split(" ", 1)
        if scheme.lower() != "bearer":
            return None
        return token
    except Exception:
        return None


def get_supabase_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    token = _extract_bearer_token(authorization)
    if not token:
        return None

    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return None

        return {
            "id": user_response.user.id,
            "email": user_response.user.email,
        }
    except Exception as e:
        print("SUPABASE AUTH ERROR:", e)
        return None


def create_mfa_access_token(user_id: str, email: str) -> tuple[str, str]:
    """Create an MFA access token and return (token, expires_at_iso).

    Expires in minutes defined by settings.MFA_JWT_EXPIRE_MINUTES.
    """
    expires_dt = datetime.now(timezone.utc) + timedelta(minutes=settings.MFA_JWT_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "mfa_verified": True,
        "exp": int(expires_dt.timestamp()),
    }
    token = jwt.encode(payload, settings.MFA_JWT_SECRET, algorithm=MFA_JWT_ALGORITHM)
    return token, expires_dt.isoformat()


def get_current_user_mfa(authorization: Optional[str] = Header(None)) -> Optional[str]:
    token = _extract_bearer_token(authorization)
    if not token:
        return None

    try:
        payload = jwt.decode(token, settings.MFA_JWT_SECRET, algorithms=[MFA_JWT_ALGORITHM])
        if not payload.get("mfa_verified"):
            return None
        return payload.get("sub")
    except JWTError:
        return None

def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[str]:
    # Backward-compatible alias for existing routes.
    return get_current_user_mfa(authorization)