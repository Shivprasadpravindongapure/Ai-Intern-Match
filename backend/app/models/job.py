"""
job.py — SQLAlchemy Job Model for SkillProof AI

Maps the `jobs` table storing internships and job description details.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class Job(Base):
    """
    Represents an internship or job description saved by a user.

    Columns:
        id:              Auto-incrementing primary key.
        user_id:        Foreign key linking to the owning user.
        title:           Title of the position (e.g. AI/ML Intern).
        company:         Name of the hiring organization.
        description:     Raw description text.
        required_skills: Cached list of extracted skills (JSON array).
        created_at:      Timestamp when the job was added.
    """

    __tablename__ = "jobs"

    id: int = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: int = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: str = Column(String(255), nullable=False)
    company: str = Column(String(255), nullable=False)
    description: str = Column(Text, nullable=False)
    required_skills: list = Column(JSON, nullable=False)
    created_at: datetime = Column(DateTime, default=datetime.utcnow)

    # --- Relationships ---
    user = relationship("User", back_populates="jobs")
    match_results = relationship(
        "MatchResult",
        back_populates="job",
        cascade="all, delete-orphan",
    )
    applications = relationship(
        "Application",
        back_populates="job",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        """Developer-friendly representation of a Job row."""
        return f"<Job id={self.id} title={self.title!r} company={self.company!r}>"
