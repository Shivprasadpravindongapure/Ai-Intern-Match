"""
user.py — User SQLAlchemy Model for SkillProof AI

Includes OTP-based email verification, login tracking,
and all relationship back-refs required by child models.
"""

from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    # ── Email OTP Verification ──────────────────────────────────────────────
    is_verified = Column(Boolean, default=False, nullable=False)
    otp_code = Column(String(10), nullable=True)
    otp_expiry = Column(DateTime, nullable=True)
    otp_resend_count = Column(Integer, default=0)
    otp_resend_window_start = Column(DateTime, nullable=True)

    # ── Login Tracking ─────────────────────────────────────────────────────
    last_login_at = Column(DateTime, nullable=True)
    login_count = Column(Integer, default=0)

    # ── Timestamps ─────────────────────────────────────────────────────────
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ── Back-references required by child models ────────────────────────────
    jobs = relationship("Job", back_populates="user", cascade="all, delete-orphan")
    match_results = relationship("MatchResult", back_populates="user", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="user", cascade="all, delete-orphan")
    user_profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
