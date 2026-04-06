from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional

from app.services.auth_service import get_supabase_user
from app.services.otp_service import generate_and_send_otp, verify_otp, verify_otp_and_get_user


# initialize the router for auth endpoints
router = APIRouter(prefix="/auth", tags=["Auth"])


# schema for requesting an otp
class SendOTPRequest(BaseModel):
    email: str


# schema for submitting an otp code
class VerifyOTPRequest(BaseModel):
    email: str
    code: str


# generate and send an otp to an authenticated user
@router.post("/send-otp", 
             summary="Send OTP (For Signed In Users)",
             description="Generates and sends a 6-digit OTP to the currently signed-in user's email address. Requires a valid authorization token. Typically used for sensitive profile actions (like changing a password) where the user must re-verify their identity."
             )
async def send_otp(
    body: SendOTPRequest,
    authorization: Optional[str] = Header(None),
):
    # grab user info from the auth token
    user = get_supabase_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    user_id = user["id"]
    user_email = (user.get("email") or "").lower()
    
    try:
        print(f"[send_otp] supabase_user_email={user_email} request_email={body.email.lower()}")
    except Exception:
        pass
        
    # block the request if the token email doesn't match the payload email
    if body.email.lower() != user_email:
        print(
            f"[send_otp] Email mismatch: supabase_user_email={user_email} != request_email={body.email.lower()}"
        )
        raise HTTPException(status_code=403, detail="Email mismatch")
        
    # attempt to dispatch the email and catch any service failures
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


# send an otp to anyone without requiring an auth token
@router.post("/send-otp-public", 
             summary="Send OTP (For Sign Ups)",
             description="Generates and sends a 6-digit OTP to the provided email address without requiring prior authentication. Used primarily for new user Sign Ups and initial login flows."
             )
async def send_otp_public(body: SendOTPRequest):
    # attempt to dispatch the email for a new or unauthenticated user
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


# validate a submitted otp for a logged-in user
@router.post("/verify-otp", 
             summary="Verify OTP (For Signed In Users)",
             description="Validates the 6-digit OTP provided by an already signed-in user. Concludes the verification process and ensures the code matches the one sent to their registered email address."
             )
async def verify_otp_endpoint(
    body: VerifyOTPRequest,
    authorization: Optional[str] = Header(None),
):
    # check the token and extract user details
    user = get_supabase_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    user_id = user["id"]
    user_email = (user.get("email") or "").lower()
    
    # ensure the user isn't trying to verify someone else's email
    if body.email.lower() != user_email:
        raise HTTPException(status_code=403, detail="Email mismatch")
        
    # check the code against the database
    valid = verify_otp(user_id=user_id, email=body.email, code=body.code)
    if not valid:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification code. Please try again."
        )
        
    # return success if the code matches
    return {
        "message": "Verification successful.",
        "mfa_verified": True,
        "user_id": user_id,
        "email": body.email.lower(),
    }


# validate a submitted otp for a new or unauthenticated user
@router.post("/verify-otp-public", 
             summary="Verify OTP (For Sign Ups)",
             description="Validates a 6-digit OTP for unauthenticated flows. On successful validation, it authenticates the user, completing the Sign Up or login process, and returns the user ID and verification status."
             )
async def verify_otp_public(body: VerifyOTPRequest):
    # verify the code and fetch the user profile if successful
    resp = verify_otp_and_get_user(body.email, body.code)
    if not resp:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification code. Please try again."
        )
        
    user_id = None
    
    # safely extract the user id from the nested supabase response
    try:
        if isinstance(resp, dict):
            user_obj = resp.get("user") or (resp.get("data") and resp["data"].get("user"))
            if user_obj:
                user_id = user_obj.get("id")
                
        # try checking the session object if the user object wasn't found directly
        if not user_id:
            session = resp.get("session") if isinstance(resp, dict) else None
            if session:
                user = session.get("user")
                if user:
                    user_id = user.get("id")
    except Exception:
        user_id = None
        
    # crash if we still couldn't figure out who this user is
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