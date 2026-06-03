"""
resume.py — Resume SQLAlchemy Model for SkillProof AI

Stores uploaded PDF resumes, extracted text, parsed structured data,
and AI-generated analysis fields (Gemini AI score, suggestions, ATS keywords).
"""

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.types import JSON
from app.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)

    # ── Extracted & Parsed Content ─────────────────────────────────────────
    extracted_text = Column(Text, nullable=True)
    parsed_data = Column(JSON, nullable=True)

    # ── AI Analysis (Gemini) ───────────────────────────────────────────────
    ai_suggestions = Column(JSON, nullable=True)   # Full Gemini analysis result
    ats_keywords = Column(JSON, nullable=True)      # Extracted ATS keywords list
    ai_score = Column(Integer, nullable=True)       # 0-100 AI quality score
    ats_score = Column(Integer, nullable=True)      # Computed ATS match score

    # ── Timestamps ─────────────────────────────────────────────────────────
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
