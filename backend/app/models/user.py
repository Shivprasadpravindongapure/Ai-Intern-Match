"""
user.py — SQLAlchemy User Model for SkillProof AI

Maps the `users` table used for authentication and profile storage.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    """
    Represents a registered user in the SkillProof AI platform.

    Columns:
        id:              Auto-incrementing primary key.
        full_name:       User's display name (max 100 chars).
        email:           Unique email address used for login.
        hashed_password: Bcrypt hash — the plain-text password is never stored.
        created_at:      Timestamp set automatically when the row is created.
    """

    __tablename__ = "users"

    id: int = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name: str = Column(String(100), nullable=False)
    email: str = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password: str = Column(String(255), nullable=False)
    created_at: datetime = Column(DateTime, default=datetime.utcnow)

    # --- Relationships ---
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="user", cascade="all, delete-orphan")
    match_results = relationship("MatchResult", back_populates="user", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="user", cascade="all, delete-orphan")
    user_profile = relationship("UserProfile", uselist=False, back_populates="user", cascade="all, delete-orphan")
    profile_analyses = relationship("ProfileAnalysis", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        """Developer-friendly representation of a User row."""
        return f"<User id={self.id} email={self.email!r}>"
