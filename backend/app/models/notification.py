"""
notification.py — Real-time Notifications model for SkillProof AI

Stores per-user notifications pushed via WebSocket for job matches,
AI analysis completion, application status updates, etc.
"""

from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.types import JSON
from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Notification Content ───────────────────────────────────────────────
    type = Column(String(50), nullable=False)        # job_match / ai_done / app_update / profile
    title = Column(String(255), nullable=False)
    message = Column(String(1000), nullable=False)
    is_read = Column(Boolean, default=False)
    meta = Column(JSON, nullable=True)               # extra data (job_id, resume_id, etc.)

    # ── Timestamps ─────────────────────────────────────────────────────────
    created_at = Column(DateTime, default=datetime.utcnow)
