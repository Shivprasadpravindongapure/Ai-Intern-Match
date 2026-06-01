"""
profile_analysis.py — SQLAlchemy ProfileAnalysis Snapshot Model for SkillProof AI

Maps the `profile_analyses` table storing snapshots of resume update recommendation analyses.
"""

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class ProfileAnalysis(Base):
    """
    Represents a resume update suggestion analysis run.

    Columns:
        id:                 Auto-incrementing primary key.
        user_id:            Foreign key linking to the owning user.
        user_profile_id:    Foreign key linking to the UserProfile profile links block.
        github_data:        Snapshot of GitHub fetched statistics and repository listings (JSON).
        leetcode_data:      Snapshot of LeetCode information (JSON).
        extracted_skills:   Snapshot of skills extracted from public repositories (JSON list).
        extracted_projects: Snapshot of project names discovered from public repositories (JSON list).
        suggestions:        List of generated ATS resume advice items with priorities (JSON list).
        created_at:         Timestamp set when this analysis run is performed.
    """

    __tablename__ = "profile_analyses"

    id: int = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: int = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_profile_id: int = Column(
        Integer,
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    github_data: dict = Column(JSON, nullable=True)
    leetcode_data: dict = Column(JSON, nullable=True)
    extracted_skills: list = Column(JSON, nullable=True)
    extracted_projects: list = Column(JSON, nullable=True)
    suggestions: list = Column(JSON, nullable=True)
    created_at: datetime = Column(DateTime, default=datetime.utcnow)

    # --- Relationships ---
    user = relationship("User", back_populates="profile_analyses")
    user_profile = relationship("UserProfile", back_populates="profile_analyses")

    def __repr__(self) -> str:
        """Developer-friendly representation of ProfileAnalysis."""
        return f"<ProfileAnalysis id={self.id} user_id={self.user_id} created_at={self.created_at}>"
