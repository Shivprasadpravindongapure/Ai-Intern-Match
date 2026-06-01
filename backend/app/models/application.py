"""
application.py — SQLAlchemy Application Tracker Model for SkillProof AI

Maps the `applications` table used to track the daily status of job
applications saved or submitted by the user.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Application(Base):
    """
    Represents an internship application tracked by the user.

    Columns:
        id:              Auto-incrementing primary key.
        user_id:        Foreign key linking to the owning user.
        job_id:         Foreign key linking to the target internship description.
        status:          Application status (e.g. Saved, Applied, Interview).
        applied_date:    Timestamp when the application was officially submitted.
        notes:           Custom text notes or follow-up details.
        created_at:      Timestamp when the application log was created.
        updated_at:      Timestamp when the application status was updated.
    """

    __tablename__ = "applications"

    id: int = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: int = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    job_id: int = Column(
        Integer,
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: str = Column(String(50), default="Saved", nullable=False)
    applied_date: datetime = Column(DateTime, nullable=True)
    notes: str = Column(Text, nullable=True)
    created_at: datetime = Column(DateTime, default=datetime.utcnow)
    updated_at: datetime = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # --- Relationships ---
    user = relationship("User", back_populates="applications")
    job = relationship("Job", back_populates="applications")

    def __repr__(self) -> str:
        """Developer-friendly representation of an Application row."""
        return f"<Application id={self.id} status={self.status!r}>"
