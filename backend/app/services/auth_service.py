from typing import Optional
from supabase import create_client
from fastapi import Header
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[str]:
    if not authorization:
        return None
    
    try:
        scheme, token = authorization.split(" ")
        if scheme.lower() != "bearer":
            return None
        
        user_response = supabase.auth.get_user(token)
        if user_response.user:
            return user_response.user.id
        return None

    except Exception as e:
        print("AUTH ERROR:", e)
        return None