"""
job_schema.py — Pydantic Validation Schemas for Job Endpoints

Defines request/response validation schemas for creating, listing, and
viewing job description details.
"""

from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict, Field


class JobCreate(BaseModel):
    """Schema to validate request body for creating a Job Description."""

    title: str = Field(..., min_length=2, max_length=150)
    company: str = Field(..., min_length=2, max_length=150)
    description: str = Field(..., min_length=50)


class JobResponseData(BaseModel):
    """Schema representing job details returned to the frontend (in camelCase)."""

    id: int
    title: str
    company: str
    description: str
    requiredSkills: List[str] = Field(default_factory=list)
    createdAt: datetime

    model_config = ConfigDict(from_attributes=True)


class JobResponse(BaseModel):
    """Schema wrapping a single job response."""

    message: str | None = None
    job: JobResponseData


class JobListResponse(BaseModel):
    """Schema wrapping a list of jobs."""

    jobs: List[JobResponseData]
