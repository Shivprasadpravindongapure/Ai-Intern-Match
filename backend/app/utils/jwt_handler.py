"""
jwt_handler.py — JWT Creation & Verification for SkillProof AI

Provides helper functions to create and verify JSON Web Tokens, plus
a FastAPI dependency (`get_current_user`) that protects private routes.
"""

from datetime import datetime, timedelta
from typing import Dict

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User

# ---------------------------------------------------------------------------
# OAuth2 scheme — tells FastAPI to look for a Bearer token in the
# Authorization header.  `tokenUrl` is only used for the Swagger UI
# "Authorize" dialog; it doesn't affect runtime behaviour.
# ---------------------------------------------------------------------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ---------------------------------------------------------------------------
# Token helpers
# ---------------------------------------------------------------------------

def create_access_token(data: Dict[str, str]) -> str:
    """
    Create a signed JWT containing the supplied claims.

    Args:
        data: Payload dict — must include a ``"sub"`` (subject) key
              whose value is typically ``str(user.id)``.

    Returns:
        An encoded JWT string.
    """
    to_encode: dict = data.copy()

    # Set the expiration time
    expire: datetime = datetime.utcnow() + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})

    # Sign and return the token
    encoded_jwt: str = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


def verify_access_token(token: str) -> dict:
    """
    Decode and validate a JWT.

    Args:
        token: The raw JWT string from the Authorization header.

    Returns:
        The decoded payload dictionary.

    Raises:
        HTTPException 401: If the token is expired, malformed, or
            missing the ``sub`` claim.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload: dict = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        # Ensure the token carries a subject claim
        subject: str | None = payload.get("sub")
        if subject is None:
            raise credentials_exception
        return payload

    except JWTError:
        raise credentials_exception


# ---------------------------------------------------------------------------
# FastAPI Dependency — injects the authenticated User into a route.
# ---------------------------------------------------------------------------

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency that resolves the current authenticated user.

    1. Extracts the Bearer token from the Authorization header.
    2. Decodes and validates the JWT.
    3. Looks up the user in the database by ID (from the ``sub`` claim).
    4. Returns the User ORM instance.

    Raises:
        HTTPException 401: If the token is invalid or the user no longer
            exists in the database.
    """
    payload: dict = verify_access_token(token)
    user_id: str | None = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch the user from the database
    user: User | None = db.query(User).filter(User.id == int(user_id)).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
