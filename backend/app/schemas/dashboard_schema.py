"""
dashboard_schema.py — Pydantic Validation Schemas for Dashboard Analytics

Defines the structure for the rich dashboard metrics payload returned to
the frontend (counts, averages, timeline records, skill summaries).
"""

from datetime import datetime
from typing import Dict, List

from pydantic import BaseModel, Field


class MissingSkillItem(BaseModel):
    """Represents a missing skill tag and its occurrence count across analyses."""

    skill: str
    count: int


class RecentMatchItem(BaseModel):
    """Lightweight matching summary returned for the recent matches dashboard widget."""

    id: int
    jobTitle: str
    company: str
    score: int
    createdAt: datetime


class ApplicationStats(BaseModel):
    """Aggregated stats for application tracking statuses."""

    total: int
    byStatus: Dict[str, int] = Field(default_factory=dict)


class DashboardResponse(BaseModel):
    """Main dashboard metrics response packaging all visual metrics widgets."""

    totalResumes: int
    totalJobs: int
    totalMatches: int
    averageMatchScore: int
    bestRoleFit: str
    topMissingSkills: List[MissingSkillItem] = Field(default_factory=list)
    recentMatchResults: List[RecentMatchItem] = Field(default_factory=list)
    applications: ApplicationStats
