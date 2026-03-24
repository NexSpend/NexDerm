from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional

from app.services.auth_service import get_supabase_user
from app.services.otp_service import generate_and_send_otp, verify_otp, verify_otp_and_get_user
from ..dataBase_endpoints.dataBase_connection import get_connection

router = APIRouter(prefix="/auth", tags=["auth"])


class SendOTPRequest(BaseModel):
    email: str


class VerifyOTPRequest(BaseModel):
    email: str
    code: str


class RegisterUserRequest(BaseModel):
    full_name: str
    email: str
    user_id: str
    role: str = "patient"


@router.post("/send-otp", summary="Send a 6-digit OTP to the user's email via Resend")
async def send_otp(
    body: SendOTPRequest,
    authorization: Optional[str] = Header(None),
):
    user = get_supabase_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = user["id"]
    user_email = (user.get("email") or "").lower()

    try:
        print(f"[send_otp] supabase_user_email={user_email} request_email={body.email.lower()}")
    except Exception:
        pass

    if body.email.lower() != user_email:
        print(
            f"[send_otp] Email mismatch: supabase_user_email={user_email} != request_email={body.email.lower()}"
        )
        raise HTTPException(status_code=403, detail="Email mismatch")

    try:
        generate_and_send_otp(user_id=user_id, email=body.email)
        return {"message": "Verification code sent to your email."}
    except ValueError as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")


@router.post("/send-otp-public", summary="Send a 6-digit OTP to the user's email (public - use carefully)")
async def send_otp_public(body: SendOTPRequest):
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

    # Supabase session remains the only auth token.
    return {
        "message": "Verification successful.",
        "mfa_verified": True,
        "user_id": user_id,
        "email": body.email.lower(),
    }


@router.post("/verify-otp-public", summary="Verify OTP")
async def verify_otp_public(body: VerifyOTPRequest):
    resp = verify_otp_and_get_user(body.email, body.code)
    if not resp:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification code. Please try again."
        )

    user_id = None
    try:
        if isinstance(resp, dict):
            user_obj = resp.get("user") or (resp.get("data") and resp["data"].get("user"))
            if user_obj:
                user_id = user_obj.get("id")

        if not user_id:
            session = resp.get("session") if isinstance(resp, dict) else None
            if session:
                user = session.get("user")
                if user:
                    user_id = user.get("id")
    except Exception:
        user_id = None

    if not user_id:
        raise HTTPException(
            status_code=500,
            detail="Could not determine user id from verification response"
        )


    return {
        "message": "Verification successful.",
        "mfa_verified": True,
        "user_id": user_id,
        "email": body.email.lower(),
    }


@router.post("/register", summary="Register user profile after OTP verification")
async def register_user(body: RegisterUserRequest, authorization: Optional[str] = Header(None)):
    """Store user profile data in newUsers table after OTP verification"""
    user = get_supabase_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_id = user["id"]
    user_email = (user.get("email") or "").lower()

    if body.email.lower() != user_email:
        raise HTTPException(status_code=403, detail="Email mismatch")

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check if user already exists
        cursor.execute(
            'SELECT id FROM "newUsers" WHERE id = %s',
            (user_id,)
        )
        existing = cursor.fetchone()

        if existing:
            # Update existing user
            cursor.execute(
                'UPDATE "newUsers" SET full_name = %s, email = %s WHERE id = %s',
                (body.full_name, body.email.lower(), user_id)
            )
        else:
            # Insert new user
            cursor.execute(
                'INSERT INTO "newUsers" (id, full_name, email, role) VALUES (%s, %s, %s, %s)',
                (user_id, body.full_name, body.email.lower(), body.role)
            )

        conn.commit()

        return {
            "message": "User profile registered successfully.",
            "user_id": user_id,
            "email": body.email.lower(),
            "full_name": body.full_name,
        }

    except Exception as e:
        conn.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to register user: {str(e)}")
    finally:
        cursor.close()
        conn.close()