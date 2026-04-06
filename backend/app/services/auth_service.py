# This file provides authentication helper functions for FastAPI endpoints, 
# leveraging Supabase for user management.

from typing import Any, Dict, Optional

from fastapi import Header, HTTPException
from supabase import create_client
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


# This helper function extracts the Bearer token from the Authorization header, 
# returning None if the header is missing or malformed.
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


# This function is utilized to attain the user ID of the currently authenticated user. 
def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    token = _extract_bearer_token(authorization)

    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    try:
        user_response = supabase.auth.get_user(token)

        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        return user_response.user.id

    except HTTPException:
        raise
    except Exception as e:
        print("AUTH ERROR:", e)
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    

# This function returns the user ID if the token is valid, or None if there is no token or 
# if the token is invalid.
def get_optional_current_user_id(
    authorization: Optional[str] = Header(None),) -> Optional[str]:
    token = _extract_bearer_token(authorization)

    if not token:
        return None

    try:
        user_response = supabase.auth.get_user(token)
        if user_response and user_response.user:
            return user_response.user.id
        return None
    except Exception as e:
        print("OPTIONAL AUTH ERROR:", e)
        return None
    

# This function returns the user ID if the token is valid, or None if there is no token or 
# if the token is invalid. 
def get_supabase_user(
    authorization: Optional[str] = Header(None),) -> Optional[Dict[str, Any]]:
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
    

# This function is being used in endpoints that require authentication, and it will raise a 401 
# error if the user is not authenticated.
def require_supabase_user(
    authorization: Optional[str] = Header(None),) -> Dict[str, Any]:
    user = get_supabase_user(authorization)

    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return user