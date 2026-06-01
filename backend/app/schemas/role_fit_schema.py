"""
role_fit_schema.py — Pydantic Validation Schemas for Role Fit Predictions

Structures and validates the response object containing the best internship
fit prediction, raw scores, and skill gap lists.
"""

from typing import Dict, List

from pydantic import BaseModel


class RoleFitResponse(BaseModel):
    """Schema wrapping a successful role fit prediction response."""

    bestFit: str
    scores: Dict[str, int]
    missingByRole: Dict[str, List[str]]
