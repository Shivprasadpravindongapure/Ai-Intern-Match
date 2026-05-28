"""
auth_routes.py — Authentication Endpoints for SkillProof AI

Provides signup, login, and "current user" routes.
All paths are prefixed with /auth (set on the router).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user_schema import (
    MessageResponse,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.utils.hashing import hash_password, verify_password
from app.utils.jwt_handler import create_access_token, get_current_user

# ---------------------------------------------------------------------------
# Router — mounted in main.py with prefix="/auth"
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/auth", tags=["Authentication"])


# ---------------------------------------------------------------------------
# POST /auth/signup
# ---------------------------------------------------------------------------
@router.post(
    "/signup",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def signup(user_data: UserCreate, db: Session = Depends(get_db)) -> MessageResponse:
    """
    Create a new user account.

    Steps:
        1. Check that the email is not already taken.
        2. Hash the plain-text password with bcrypt.
        3. Insert a new User row into the database.
        4. Return a confirmation message.

    Raises:
        HTTPException 400: If the email is already registered.
    """
    # 1 — Check for duplicate email
    existing_user: User | None = (
        db.query(User).filter(User.email == user_data.email).first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # 2 — Hash the password (never store plain text!)
    hashed_pw: str = hash_password(user_data.password)

    # 3 — Create and persist the new user
    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        hashed_password=hashed_pw,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 4 — Return success
    return MessageResponse(message="Account created successfully! Please login.")


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------
@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive a JWT",
)
def login(credentials: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    """
    Authenticate a user with email + password and return a JWT.

    Steps:
        1. Look up the user by email.
        2. Verify the supplied password against the stored hash.
        3. Generate a signed JWT with the user's ID as subject.
        4. Return the token along with basic user info.

    Raises:
        HTTPException 401: If the email is not found or the password
            does not match.
    """
    # 1 — Find the user
    user: User | None = (
        db.query(User).filter(User.email == credentials.email).first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # 2 — Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # 3 — Create JWT (subject = user id)
    access_token: str = create_access_token(data={"sub": str(user.id)})

    # 4 — Build and return the response
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------
@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user",
)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """
    Return profile details for the currently authenticated user.

    The `get_current_user` dependency handles token validation and
    database lookup — this handler simply returns the result.
    """
    return UserResponse.model_validate(current_user)
