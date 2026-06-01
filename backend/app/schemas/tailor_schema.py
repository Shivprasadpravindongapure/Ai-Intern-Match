"""
tailor_schema.py — Pydantic Schemas for AI Resume Tailoring & WYSIWYG Creator
"""

from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class TailorRequest(BaseModel):
    jobId: Optional[int] = None
    jobDescription: Optional[str] = None


class TailoredProjectSchema(BaseModel):
    name: str
    description: str
    technologies: List[str]


class TailoredWorkExperienceSchema(BaseModel):
    company: str
    role: str
    duration: str
    bullets: List[str]


class TailoredResumeDataSchema(BaseModel):
    name: str
    email: str
    phone: str
    github: str
    linkedin: str
    portfolio: str
    skills: List[str]
    experience: List[TailoredWorkExperienceSchema]
    projects: List[TailoredProjectSchema]
    education: List[Dict[str, str]]
    certifications: List[str]


class TailorResponse(BaseModel):
    message: str
    tailoredData: TailoredResumeDataSchema
    latexCode: str
