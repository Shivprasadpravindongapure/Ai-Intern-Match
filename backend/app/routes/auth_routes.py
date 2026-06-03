"""
auth_routes.py — Authentication with OTP Email Verification for SkillProof AI

Flow:
  1. POST /auth/signup → validate email uniqueness, hash password, send OTP email
  2. POST /auth/verify-otp → validate OTP + expiry, issue JWT
  3. POST /auth/resend-otp → regenerate OTP, resend (rate-limited)
  4. POST /auth/login → verify password + email-verified status, issue JWT
  5. GET  /auth/me → return current user profile
"""

import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.user_schema import (
    MessageResponse,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.utils.email_service import generate_otp, send_otp_email
from app.utils.hashing import hash_password, verify_password
from app.utils.jwt_handler import create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _issue_otp(user: User) -> str:
    """Generate a fresh OTP and update the user record (does NOT commit)."""
    otp = generate_otp()
    user.otp_code = otp
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
    return otp


# ─────────────────────────────────────────────────────────────────────────────
# POST /auth/signup
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/signup",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user — sends OTP to their email",
)
async def signup(user_data: UserCreate, db: Session = Depends(get_db)) -> MessageResponse:
    """
    Create a new unverified user account and send a 6-digit OTP to their email.

    The account is NOT active until /auth/verify-otp is called.
    One email address can only ever have one account.
    """
    # 1 — Check for duplicate email (permanent, even if unverified)
    existing: User | None = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        if existing.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email is already registered. Please login.",
            )
        # Re-use unverified account — just refresh OTP
        otp = _issue_otp(existing)
        db.commit()
        await send_otp_email(existing.email, otp, existing.full_name)
        return MessageResponse(
            message="Account already exists. A new OTP has been sent to your email."
        )

    # 2 — Hash the password
    hashed_pw = hash_password(user_data.password)

    # 3 — Create the user (unverified)
    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        hashed_password=hashed_pw,
        is_verified=False,
    )
    db.add(new_user)
    db.flush()  # Get the ID before generating OTP

    # 4 — Generate + save OTP
    otp = _issue_otp(new_user)
    db.commit()
    db.refresh(new_user)

    # 5 — Send OTP email (async, non-blocking failure)
    await send_otp_email(new_user.email, otp, new_user.full_name)

    return MessageResponse(
        message=f"Account created! Please check your email ({new_user.email}) for the OTP."
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /auth/verify-otp
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/verify-otp",
    response_model=TokenResponse,
    summary="Verify OTP and activate account — returns JWT",
)
async def verify_otp(payload: dict, db: Session = Depends(get_db)) -> TokenResponse:
    """
    Validate the 6-digit OTP and activate the account.
    Issues a JWT on success (logs the user in immediately).
    """
    email = (payload.get("email") or "").strip().lower()
    otp_input = (payload.get("otp_code") or "").strip()

    if not email or not otp_input:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email and OTP code are required.",
        )

    user: User | None = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found for this email.",
        )

    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is already verified. Please login.",
        )

    # Validate OTP
    if not user.otp_code or user.otp_code != otp_input:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP. Please check your email and try again.",
        )

    # Check expiry
    if not user.otp_expiry or datetime.utcnow() > user.otp_expiry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new one.",
        )

    # Mark verified and clear OTP fields
    user.is_verified = True
    user.otp_code = None
    user.otp_expiry = None
    user.otp_resend_count = 0
    user.last_login_at = datetime.utcnow()
    user.login_count = 1
    db.commit()
    db.refresh(user)

    # Issue JWT
    access_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /auth/resend-otp
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/resend-otp",
    response_model=MessageResponse,
    summary="Resend OTP email (rate-limited to 3 per hour)",
)
async def resend_otp(payload: dict, db: Session = Depends(get_db)) -> MessageResponse:
    """Regenerate and resend the OTP. Maximum 3 resends per hour."""
    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email is required.",
        )

    user: User | None = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found for this email.")

    if user.is_verified:
        raise HTTPException(status_code=400, detail="Account already verified. Please login.")

    # Rate limit: max 3 resends per hour
    now = datetime.utcnow()
    window_start = user.otp_resend_window_start
    if window_start and (now - window_start).total_seconds() < 3600:
        if (user.otp_resend_count or 0) >= settings.OTP_MAX_RESEND_PER_HOUR:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many OTP requests. Please wait 1 hour before trying again.",
            )
        user.otp_resend_count = (user.otp_resend_count or 0) + 1
    else:
        # Reset window
        user.otp_resend_window_start = now
        user.otp_resend_count = 1

    otp = _issue_otp(user)
    db.commit()

    await send_otp_email(user.email, otp, user.full_name)

    return MessageResponse(message="A new OTP has been sent to your email address.")


# ─────────────────────────────────────────────────────────────────────────────
# POST /auth/login
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login with email + password — returns JWT",
)
def login(credentials: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    """
    Authenticate user with email and password.
    Blocks login if the account is not OTP-verified.
    """
    user: User | None = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="EMAIL_NOT_VERIFIED",
        )

    # Update login tracking
    user.last_login_at = datetime.utcnow()
    user.login_count = (user.login_count or 0) + 1
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /auth/me
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user",
)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return profile of the currently authenticated user."""
    return UserResponse.model_validate(current_user)
