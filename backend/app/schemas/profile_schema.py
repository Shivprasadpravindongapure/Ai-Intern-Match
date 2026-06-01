"""
profile_schema.py — Pydantic Validation Schemas for Connected Profiles

Defines input/output schemas validating payload structures when connecting profiles
and returning parsed resume-to-profile update suggestion reports.
"""

from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class UserProfileSave(BaseModel):
    """Schema validating request body for connecting or updating profile URLs."""

    linkedinUrl: Optional[str] = Field(None, description="LinkedIn profile URL")
    githubUrl: Optional[str] = Field(None, description="GitHub profile URL")
    leetcodeUrl: Optional[str] = Field(None, description="LeetCode profile URL")
    portfolioUrl: Optional[str] = Field(None, description="Personal portfolio URL")
    codechefUrl: Optional[str] = Field(None, description="CodeChef profile URL")
    hackerrankUrl: Optional[str] = Field(None, description="HackerRank profile URL")


class UserProfileResponseData(BaseModel):
    """Schema representing profile details returned to the frontend in camelCase."""

    linkedinUrl: Optional[str] = None
    githubUrl: Optional[str] = None
    githubUsername: Optional[str] = None
    leetcodeUrl: Optional[str] = None
    leetcodeUsername: Optional[str] = None
    portfolioUrl: Optional[str] = None
    codechefUrl: Optional[str] = None
    codechefUsername: Optional[str] = None
    hackerrankUrl: Optional[str] = None
    hackerrankUsername: Optional[str] = None
    lastAnalyzedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProfileResponse(BaseModel):
    """Schema wrapping connected profile responses."""

    message: str
    profile: UserProfileResponseData


class RecentRepoItem(BaseModel):
    """Schema representing a repository returned within GitHub data snapshot."""

    name: str
    description: str
    language: str
    stars: int
    forks: int
    updatedAt: Optional[str] = None
    htmlUrl: str
    topics: List[str] = Field(default_factory=list)


class GitHubDataSchema(BaseModel):
    """Schema detailing the GitHub fetched stats snapshot."""

    username: str
    name: str
    bio: str
    publicRepos: int
    followers: int
    following: int
    recentRepos: List[RecentRepoItem] = Field(default_factory=list)


class SuggestionItemSchema(BaseModel):
    """Schema detailing an actionable resume update advice item."""

    type: str
    priority: str
    message: str
    fix: str
    section: str


class ProfileAnalysisData(BaseModel):
    """Schema representing analysis snapshot details in camelCase."""

    id: int
    createdAt: datetime
    githubData: Optional[GitHubDataSchema] = None
    leetcodeData: Optional[dict] = None
    extractedSkills: List[str] = Field(default_factory=list)
    extractedProjects: List[str] = Field(default_factory=list)
    suggestions: List[SuggestionItemSchema] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ProfileAnalysisResponse(BaseModel):
    """Schema wrapping a single profile analysis response."""

    message: Optional[str] = None
    analysis: ProfileAnalysisData


class ProfileAnalysisHistoryResponse(BaseModel):
    """Schema wrapping the list of past analysis records."""

    history: List[ProfileAnalysisData]
