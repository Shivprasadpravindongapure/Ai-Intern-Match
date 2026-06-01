"""
resume.py — SQLAlchemy Resume Model for SkillProof AI

Maps the `resumes` table used to store uploaded résumés and their
extracted text content.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class Resume(Base):
    """
    Represents an uploaded résumé in the SkillProof AI platform.

    Columns:
        id:             Auto-incrementing primary key.
        user_id:        Foreign key linking to the owning user.
        filename:       Original name of the uploaded file (max 255 chars).
        file_path:      Server-side path where the file is stored (max 500 chars).
        extracted_text: Full text extracted from the PDF via PyPDF2.
        parsed_data:    Cached parsed structured resume data (JSON).
        created_at:     Timestamp set automatically when the row is created.
    """

    __tablename__ = "resumes"

    id: int = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: int = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    filename: str = Column(String(255), nullable=False)
    file_path: str = Column(String(500), nullable=False)
    extracted_text: str = Column(Text, nullable=True)
    parsed_data: dict = Column(JSON, nullable=True)
    ats_score: int = Column(Integer, nullable=True)
    created_at: datetime = Column(DateTime, default=datetime.utcnow)
    updated_at: datetime = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # --- Relationships ---
    user = relationship("User", back_populates="resumes")
    match_results = relationship(
        "MatchResult",
        back_populates="resume",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        """Developer-friendly representation of a Resume row."""
        return f"<Resume id={self.id} filename={self.filename!r}>"
