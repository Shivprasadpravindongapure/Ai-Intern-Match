"""
user_profile.py — SQLAlchemy UserProfile Model for SkillProof AI

Maps the `user_profiles` table used to store a user's connected professional profiles.
"""

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class UserProfile(Base):
    """
    Represents connected professional profiles for a user.

    Columns:
        id:                  Auto-incrementing primary key.
        user_id:             Foreign key linking to the owning user (one-to-one).
        linkedin_url:        LinkedIn profile URL.
        github_url:          GitHub profile URL.
        github_username:     Extracted GitHub username.
        leetcode_url:        LeetCode profile URL.
        leetcode_username:   Extracted LeetCode username.
        portfolio_url:       Portfolio URL.
        codechef_url:        CodeChef profile URL.
        codechef_username:   Extracted CodeChef username.
        hackerrank_url:      HackerRank profile URL.
        hackerrank_username: Extracted HackerRank username.
        last_analyzed_at:    Timestamp of last public fetching analysis run.
        created_at:          Timestamp set when the profile connection is saved.
        updated_at:          Timestamp set when connection fields are updated.
    """

    __tablename__ = "user_profiles"

    id: int = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: int = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    linkedin_url: str = Column(String(500), nullable=True)
    github_url: str = Column(String(500), nullable=True)
    github_username: str = Column(String(100), nullable=True)
    leetcode_url: str = Column(String(500), nullable=True)
    leetcode_username: str = Column(String(100), nullable=True)
    portfolio_url: str = Column(String(500), nullable=True)
    codechef_url: str = Column(String(500), nullable=True)
    codechef_username: str = Column(String(100), nullable=True)
    hackerrank_url: str = Column(String(500), nullable=True)
    hackerrank_username: str = Column(String(100), nullable=True)
    last_analyzed_at: datetime = Column(DateTime, nullable=True)
    created_at: datetime = Column(DateTime, default=datetime.utcnow)
    updated_at: datetime = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # --- Relationships ---
    user = relationship("User", back_populates="user_profile")
    profile_analyses = relationship(
        "ProfileAnalysis",
        back_populates="user_profile",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        """Developer-friendly representation of UserProfile."""
        return f"<UserProfile id={self.id} user_id={self.user_id}>"
