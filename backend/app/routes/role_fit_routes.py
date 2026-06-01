"""
role_fit_routes.py — Role Fit Prediction endpoints for SkillProof AI

Provides protected routes to calculate internship role fit predictions
based on candidate resume parsed data.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.resume import Resume
from app.models.user import User
from app.schemas.role_fit_schema import RoleFitResponse
from app.utils.jwt_handler import get_current_user
from app.utils.resume_parser import parse_resume
from app.utils.role_fit_engine import predict_role_fit

# ---------------------------------------------------------------------------
# Router — mounted in main.py with prefix="/api/resumes"
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/api/resumes", tags=["Role Fit"])


# ---------------------------------------------------------------------------
# GET /api/resumes/{resume_id}/role-fit (Predict Internship Role Alignment)
# ---------------------------------------------------------------------------
@router.get(
    "/{resume_id}/role-fit",
    response_model=RoleFitResponse,
    summary="Predict the best internship role fits for a specific resume",
)
def get_resume_role_fit(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RoleFitResponse:
    """
    Evaluates candidate resume technical competencies to identify matches
    across six standard internship profiles (Backend, Frontend, AI/ML, Cloud, etc.).

    Raises:
        HTTPException 404: If not found or access denied.
    """
    # 1 — Secure ownership of the Resume
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found or access denied.",
        )

    # 2 — Ensure parsed_data exists, otherwise parse on the fly
    parsed_resume = resume.parsed_data
    if not parsed_resume:
        if not resume.extracted_text or not resume.extracted_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume has no extracted text to calculate role fit. Please re-upload.",
            )
        try:
            parsed_resume = parse_resume(resume.extracted_text)
            resume.parsed_data = parsed_resume
            db.add(resume)
            db.commit()
            db.refresh(resume)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to parse resume text dynamically for role fit: {e}",
            )

    # 3 — Run prediction calculations
    try:
        prediction = predict_role_fit(parsed_resume)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate role fit prediction: {e}",
        )

    return RoleFitResponse(
        bestFit=prediction["bestFit"],
        scores=prediction["scores"],
        missingByRole=prediction["missingByRole"],
    )
