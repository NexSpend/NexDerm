# This file provides OTP-related services for FastAPI endpoints, leveraging Supabase's 
# built-in OTP generation and verification capabilities

from typing import Optional

from app.core.config import settings
from app.services.auth_service import supabase

# The following function helps to generate and send an OTP to the user's email
def generate_and_send_otp(user_id: str, email: str) -> None:

    if not settings.SUPABASE_URL:
        raise ValueError("Supabase not configured")

    try:
        # channel 'email' ensures an email OTP is sent. should_create_user=False
        # so we don't create a new user record if the email isn't registered.
        resp = supabase.auth.sign_in_with_otp({
            "email": email,
            "options": {"channel": "email", "should_create_user": False},
        })
        # Log the raw response for debugging (will print to server logs)
        try:
            print("Supabase sign_in_with_otp response:", resp)
        except Exception:
            pass
        if not resp:
            raise ValueError("Supabase did not accept the OTP request")
    except Exception as e:
        # Propagate a descriptive ValueError while leaving stack trace to server logs
        raise ValueError(f"Failed to request Supabase OTP: {e}")


# This function verifies the OTP code provided by the user against Supabase's 
# verification system.
def verify_otp(user_id: str, email: str, code: str) -> bool:
    """Verify the user-supplied OTP via Supabase.

    Returns True when Supabase verifies the OTP successfully.
    """
    try:
        # type 'email' tells Supabase to verify an email OTP
        resp = supabase.auth.verify_otp({"email": email, "token": code, "type": "email"})
        # resp may include a session/user when verified
        return resp is not None
    except Exception:
        return False


# This function combines OTP verification and user retrieval, returning the user info if
# the OTP is valid, or None if verification fails.
def verify_otp_and_get_user(email: str, code: str) -> Optional[dict]:
    """Verify an OTP and return the Supabase response (which should include
    user/session information) or None if verification failed.
    """
    try:
        resp = supabase.auth.verify_otp({"email": email, "token": code, "type": "email"})
        if not resp:
            return None
        try:
            return resp
        except Exception:
            return None
    except Exception:
        return None
