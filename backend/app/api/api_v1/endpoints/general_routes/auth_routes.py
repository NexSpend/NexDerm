from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional

from app.services.auth_service import create_mfa_access_token, get_supabase_user
from app.services.otp_service import generate_and_send_otp, verify_otp
from app.services.otp_service import verify_otp_and_get_user

router = APIRouter(prefix="/auth", tags=["auth"])


class SendOTPRequest(BaseModel):
    email: str


class VerifyOTPRequest(BaseModel):
    email: str
    code: str


@router.post("/send-otp", summary="Send a 6-digit OTP to the user's email via Resend")
async def send_otp(
    body: SendOTPRequest,
    authorization: Optional[str] = Header(None),
):
    # Require a valid Supabase JWT (password already validated on client sign-in)
    user = get_supabase_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = user["id"]
    user_email = (user.get("email") or "").lower()

    # Log comparison to help debug 403 mismatch issues
    try:
        print(f"[send_otp] supabase_user_email={user_email} request_email={body.email.lower()}")
    except Exception:
        pass

    if body.email.lower() != user_email:
        # Provide more context in logs but keep HTTP response generic
        print(f"[send_otp] Email mismatch: supabase_user_email={user_email} != request_email={body.email.lower()}")
        raise HTTPException(status_code=403, detail="Email mismatch")

    try:
        generate_and_send_otp(user_id=user_id, email=body.email)
        return {"message": "Verification code sent to your email."}
    except ValueError as e:
        # Log full exception to server stdout for debugging
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")




@router.post("/send-otp-public", summary="Send a 6-digit OTP to the user's email (public - use carefully)")
async def send_otp_public(
    body: SendOTPRequest,
):
    """Send an OTP to the provided email using the server-side Supabase client.

    This endpoint does not require a user-supplied Supabase JWT and will use the
    service role key configured on the server. It's intended for flows where a
    session token is not available (e.g., immediately after sign-up). Be aware
    that exposing this endpoint publicly can be abused; consider adding rate-
    limiting in production.
    """
    try:
        generate_and_send_otp(user_id="", email=body.email)
        return {"message": "Verification code sent to your email."}
    except ValueError as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")


@router.post("/verify-otp", summary="Verify the 6-digit OTP entered by the user")
async def verify_otp_endpoint(
    body: VerifyOTPRequest,
    authorization: Optional[str] = Header(None),
):
    user = get_supabase_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = user["id"]
    user_email = (user.get("email") or "").lower()
    if body.email.lower() != user_email:
        raise HTTPException(status_code=403, detail="Email mismatch")

    valid = verify_otp(user_id=user_id, email=body.email, code=body.code)
    if not valid:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification code. Please try again."
        )

    access_token, expires_at = create_mfa_access_token(user_id=user_id, email=body.email.lower())
    return {
        "message": "Verification successful.",
        "access_token": access_token,
        "token_type": "bearer",
        "expires_at": expires_at,
    }



@router.post("/verify-otp-public", summary="Verify OTP without a user-supplied Supabase JWT")
async def verify_otp_public(
    body: VerifyOTPRequest,
):
    """Verify an OTP without requiring the client to provide a Supabase JWT.

    The server will use the service-role Supabase client to verify the OTP and
    extract the resulting user id from the Supabase response. This is useful
    immediately after sign-up where no session token is available.
    """
    # Attempt to verify the OTP via server-side Supabase client
    resp = verify_otp_and_get_user(body.email, body.code)
    if not resp:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification code. Please try again."
        )

    # Try to extract user id from the response
    user_id = None
    try:
        # resp may be a dict with keys like 'user' or 'data' depending on client
        if isinstance(resp, dict):
            user_obj = resp.get('user') or (resp.get('data') and resp['data'].get('user'))
            if user_obj:
                user_id = user_obj.get('id')
        # Fallback: look for session -> user -> id
        if not user_id:
            session = resp.get('session') if isinstance(resp, dict) else None
            if session:
                user = session.get('user')
                if user:
                    user_id = user.get('id')
    except Exception:
        user_id = None

    if not user_id:
        raise HTTPException(status_code=500, detail="Could not determine user id from verification response")

    access_token, expires_at = create_mfa_access_token(user_id=user_id, email=body.email.lower())
    return {
        "message": "Verification successful.",
        "access_token": access_token,
        "token_type": "bearer",
        "expires_at": expires_at,
    }
