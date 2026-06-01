"""
match_schema.py — Pydantic Validation Schemas for Matchmaking Endpoints

Defines request/response validation schemas for running resume-job matches
and returning score metrics and evidence-backed recommendations.
"""

from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict, Field


class MatchRequest(BaseModel):
    """Schema to validate request body for triggering a matchmaking score."""

    resumeId: int = Field(..., description="The ID of the resume to match")
    jobId: int = Field(..., description="The ID of the job description to match")


class ProofDetails(BaseModel):
    """Schema detailing the evidence checkpoints for a matched/missing skill."""

    inSkills: bool
    inProjects: bool
    inExperience: bool
    requiredByJob: bool


class SuggestionItem(BaseModel):
    """Schema representing an evidence-based ATS suggestion for a skill."""

    skill: str
    status: str
    message: str
    proof: ProofDetails


class MatchResultData(BaseModel):
    """Schema representing the matching result details returned to the frontend."""

    id: int
    resumeId: int
    jobId: int
    score: int
    matchedSkills: List[str]
    missingSkills: List[str]
    suggestions: List[SuggestionItem] = Field(default_factory=list)
    roleFit: dict | None = None
    semanticScore: int | None = None
    finalScore: int | None = None
    createdAt: datetime

    model_config = ConfigDict(from_attributes=True)


class MatchResponse(BaseModel):
    """Schema wrapping a successful match response."""

    message: str
    matchResult: MatchResultData
