"""
resume_schema.py — Pydantic v2 Schemas for Resume Endpoints

These schemas handle request validation and response serialisation
for all résumé upload / list / detail / delete endpoints.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Response Schemas
# ---------------------------------------------------------------------------

class ResumeData(BaseModel):
    """
    Core résumé data returned after a successful upload.

    `from_attributes=True` lets Pydantic read data directly from
    SQLAlchemy model instances (attribute access instead of dict keys).
    """

    id: int
    filename: str
    extracted_text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResumeUploadResponse(BaseModel):
    """Response returned after a successful résumé upload."""

    message: str
    resume: ResumeData


class ResumeListItem(BaseModel):
    """
    Lightweight résumé summary used in list responses.

    Omits the full extracted text to keep payloads small.
    """

    id: int
    filename: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResumeListResponse(BaseModel):
    """Response wrapping a list of the user's résumés."""

    resumes: list[ResumeListItem]


from typing import Any


class ResumeDetail(BaseModel):
    """
    Full résumé detail including file path and extracted text.

    `from_attributes=True` lets Pydantic read data directly from
    SQLAlchemy model instances (attribute access instead of dict keys).
    """

    id: int
    filename: str
    file_path: str
    extracted_text: str
    parsed_data: Any = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResumeDetailResponse(BaseModel):
    """Response wrapping a single résumé's full details."""

    resume: ResumeDetail


# ---------------------------------------------------------------------------
# Parsed Resume Schemas (Step 2: Resume Parser)
# ---------------------------------------------------------------------------

class ExperienceItem(BaseModel):
    """Represents a parsed job experience entry."""

    role: str
    company: str
    duration: str


class ParsedLinks(BaseModel):
    """Represents parsed social and portfolio URLs."""

    github: str
    linkedin: str
    portfolio: str


class ParsedSectionText(BaseModel):
    """Represents the raw text of segmented resume sections."""

    skills: str = ""
    projects: str = ""
    experience: str = ""
    education: str = ""
    certifications: str = ""


class ParsedResumeData(BaseModel):
    """Structured fields representing the full parsed contents of a résumé."""

    name: str
    email: str
    phone: str
    skills: list[str]
    projects: list[str]
    experience: list[ExperienceItem]
    education: str
    certifications: list[str]
    links: ParsedLinks
    sectionText: ParsedSectionText = None


class ParsedResumeResponse(BaseModel):
    """Response wrapping the structured parsed résumé data."""

    parsedResume: ParsedResumeData


