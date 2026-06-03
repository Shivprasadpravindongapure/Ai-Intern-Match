"""
automation_routes.py — Dream Job Autopilot Endpoints for SkillProof AI

Provides:
  - POST /api/automate/prepare-application — single job application package
  - POST /api/automate/batch-prepare — multiple jobs batch package
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.resume import Resume
from app.models.user import User
from app.utils.jwt_handler import get_current_user
from app.utils.platform_automator import prepare_application, prepare_batch_applications

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/automate", tags=["Dream Job Autopilot"])


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/automate/prepare-application
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/prepare-application",
    summary="Prepare a complete application package for a single job using Gemini AI",
)
def prepare_single_application(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Generate a tailored application package for a specific job.

    Requires:
        resume_id: int — user's uploaded resume
        job: dict — { title, company, description, apply_url, source, questions? }

    Returns:
        { cover_letter, tailored_summary, key_answers, cold_email, tips, apply_url, platform }
    """
    resume_id = payload.get("resume_id")
    job = payload.get("job")

    if not resume_id or not job:
        raise HTTPException(
            status_code=422,
            detail="resume_id and job (object) are required.",
        )

    if not isinstance(job, dict) or not job.get("title"):
        raise HTTPException(
            status_code=422,
            detail="job must be an object with at least a 'title' field.",
        )

    # Fetch resume (ownership check)
    resume: Resume | None = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    try:
        package = prepare_application(
            resume_data={
                "extracted_text": resume.extracted_text or "",
                "parsed_data": resume.parsed_data or {},
            },
            job=job,
            user_name=current_user.full_name,
            user_email=current_user.email,
        )
    except Exception as exc:
        logger.error("Prepare application error: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Failed to generate application package. Please try again.",
        )

    return {
        "message": "Application package ready!",
        "package": package,
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/automate/batch-prepare
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/batch-prepare",
    summary="Prepare application packages for multiple jobs at once",
)
def batch_prepare_applications(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Generate tailored application packages for up to 10 jobs simultaneously.

    Requires:
        resume_id: int
        jobs: list[dict] — list of job objects (max 10)

    Returns:
        { packages: list[package], total: int }
    """
    resume_id = payload.get("resume_id")
    jobs = payload.get("jobs") or []

    if not resume_id:
        raise HTTPException(status_code=422, detail="resume_id is required.")
    if not jobs or not isinstance(jobs, list):
        raise HTTPException(status_code=422, detail="jobs must be a non-empty list.")
    if len(jobs) > 10:
        raise HTTPException(status_code=422, detail="Maximum 10 jobs per batch.")

    # Fetch resume (ownership check)
    resume: Resume | None = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    try:
        packages = prepare_batch_applications(
            resume_data={
                "extracted_text": resume.extracted_text or "",
                "parsed_data": resume.parsed_data or {},
            },
            jobs=jobs,
            user_name=current_user.full_name,
            user_email=current_user.email,
        )
    except Exception as exc:
        logger.error("Batch prepare error: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Failed to generate batch packages. Please try again.",
        )

    return {
        "message": f"{len(packages)} application package(s) generated!",
        "packages": packages,
        "total": len(packages),
    }
