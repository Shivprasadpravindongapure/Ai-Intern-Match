"""
application_schema.py — Pydantic Validation Schemas for Application Tracker

Validates payloads for creating, updating, and displaying application
tracking records.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ApplicationCreate(BaseModel):
    """Schema to validate request body for creating a Job Tracker entry."""

    jobId: int = Field(..., description="The ID of the saved internship description")
    status: str = Field("Saved", description="Daily status (Saved, Applied, Interview, etc.)")
    notes: Optional[str] = None


class ApplicationUpdate(BaseModel):
    """Schema to validate request body for updating tracker details."""

    status: str = Field(..., description="Target status")
    appliedDate: Optional[datetime] = None
    notes: Optional[str] = None


class ApplicationJobData(BaseModel):
    """Summarized job details embedded inside application responses."""

    id: int
    title: str
    company: str

    model_config = ConfigDict(from_attributes=True)


class ApplicationResponseData(BaseModel):
    """Fully structured application tracking details returned to the frontend."""

    id: int
    job: ApplicationJobData
    status: str
    appliedDate: Optional[datetime] = None
    notes: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplicationResponse(BaseModel):
    """Schema wrapping a single application response."""

    message: Optional[str] = None
    application: ApplicationResponseData


class ApplicationListResponse(BaseModel):
    """Schema wrapping the application list response."""

    applications: List[ApplicationResponseData]
