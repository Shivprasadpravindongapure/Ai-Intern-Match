"""
user_schema.py — Pydantic v2 Schemas for SkillProof AI

These schemas handle request validation and response serialisation
for all user / auth endpoints.
"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------------------------------------------------------------------------
# Request Schemas
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    """Schema for the **POST /auth/signup** request body."""

    full_name: str = Field(
        ...,
        min_length=2,
        description="User's full name (at least 2 characters).",
        examples=["Alice Johnson"],
    )
    email: EmailStr = Field(
        ...,
        description="A valid email address (used for login).",
        examples=["alice@example.com"],
    )
    password: str = Field(
        ...,
        min_length=6,
        description="Password — minimum 6 characters.",
        examples=["securePass123"],
    )


class UserLogin(BaseModel):
    """Schema for the **POST /auth/login** request body."""

    email: EmailStr = Field(
        ...,
        description="Registered email address.",
        examples=["alice@example.com"],
    )
    password: str = Field(
        ...,
        description="Account password.",
        examples=["securePass123"],
    )


# ---------------------------------------------------------------------------
# Response Schemas
# ---------------------------------------------------------------------------

class UserResponse(BaseModel):
    """
    Public-facing representation of a user.

    `from_attributes=True` lets Pydantic read data directly from
    SQLAlchemy model instances (attribute access instead of dict keys).
    """

    id: int
    full_name: str
    email: str
    is_verified: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)



class TokenResponse(BaseModel):
    """Response returned after a successful login."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    """Generic message response (e.g. for signup confirmation)."""

    message: str
