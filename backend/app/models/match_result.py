"""
match_result.py — SQLAlchemy MatchResult Model for SkillProof AI

Maps the `match_results` table storing calculated matchmaking scores
and evidence-based ATS suggestions.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class MatchResult(Base):
    """
    Represents the matching result between a resume and a job description.

    Columns:
        id:             Auto-incrementing primary key.
        user_id:        Foreign key linking to the owning user.
        resume_id:      Foreign key linking to the compared resume.
        job_id:         Foreign key linking to the compared job.
        score:           Calculated matching score percentage.
        matched_skills:  JSON array listing matched skill keywords.
        missing_skills:  JSON array listing required skills missing in the resume.
        suggestions:     JSON array of evidence-based ATS suggestions.
        created_at:      Timestamp when the match was generated.
    """

    __tablename__ = "match_results"

    id: int = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: int = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    resume_id: int = Column(
        Integer,
        ForeignKey("resumes.id", ondelete="CASCADE"),
        nullable=False,
    )
    job_id: int = Column(
        Integer,
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
    )
    score: int = Column(Integer, nullable=False)
    matched_skills: list = Column(JSON, nullable=False)
    missing_skills: list = Column(JSON, nullable=False)
    suggestions: list = Column(JSON, nullable=True)
    role_fit: dict = Column(JSON, nullable=True)
    semantic_score: int = Column(Integer, nullable=True)
    final_score: int = Column(Integer, nullable=True)
    created_at: datetime = Column(DateTime, default=datetime.utcnow)

    # --- Relationships ---
    user = relationship("User", back_populates="match_results")
    resume = relationship("Resume", back_populates="match_results")
    job = relationship("Job", back_populates="match_results")

    def __repr__(self) -> str:
        """Developer-friendly representation of a MatchResult row."""
        return f"<MatchResult id={self.id} score={self.score}>"
