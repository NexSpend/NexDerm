from typing import Optional

from app.core.config import settings
from app.services.auth_service import supabase


def generate_and_send_otp(user_id: str, email: str) -> None:
    """Trigger Supabase to send an OTP email to the user.

    This delegates OTP generation and delivery to Supabase Auth. It requires
    that your Supabase project's email templates contain the `{{ .Token }}`
    variable so an OTP is sent (not a magic link).
    """
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


def verify_otp_and_get_user(email: str, code: str) -> Optional[dict]:
    """Verify an OTP and return the Supabase response (which should include
    user/session information) or None if verification failed.
    """
    try:
        resp = supabase.auth.verify_otp({"email": email, "token": code, "type": "email"})
        if not resp:
            return None
        # Attempt to normalize response into a dict-like object
        try:
            # If resp is a dict-like object, return as-is
            return resp
        except Exception:
            return None
    except Exception:
        return None
