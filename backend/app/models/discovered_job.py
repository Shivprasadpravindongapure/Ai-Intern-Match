"""
discovered_job.py — Discovered Jobs cache model for SkillProof AI

Caches job listings fetched from JSearch (LinkedIn/Indeed/Glassdoor)
and Naukri APIs per user. Enables match scoring against user resume.
"""

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.types import JSON
from app.database import Base


class DiscoveredJob(Base):
    __tablename__ = "discovered_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Job Identity ───────────────────────────────────────────────────────
    job_id = Column(String(255), nullable=True, index=True)  # Platform's own ID
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)

    # ── Job Details ────────────────────────────────────────────────────────
    job_type = Column(String(50), nullable=True)    # fulltime / internship / parttime
    work_mode = Column(String(50), nullable=True)   # remote / hybrid / onsite
    salary = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    apply_url = Column(String(1000), nullable=True)

    # ── Source & Skills ────────────────────────────────────────────────────
    source = Column(String(50), nullable=False)          # linkedin / indeed / glassdoor / naukri
    required_skills = Column(JSON, nullable=True)
    match_score = Column(Integer, nullable=True)         # 0-100 match vs user resume

    # ── User Actions ───────────────────────────────────────────────────────
    is_saved = Column(Integer, default=0)                # 0=no, 1=yes
    is_applied = Column(Integer, default=0)              # 0=no, 1=yes

    # ── Raw & Timestamps ───────────────────────────────────────────────────
    raw_data = Column(JSON, nullable=True)
    fetched_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
