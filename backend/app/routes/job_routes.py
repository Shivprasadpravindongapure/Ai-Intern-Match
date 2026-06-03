"""
job_routes.py — Job/Internship description endpoints for SkillProof AI

Provides protected routes to create, list, view, and delete internship
descriptions saved by the user. All routes are prefixed with /api/jobs.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.job import Job
from app.models.user import User
from app.schemas.job_schema import (
    JobCreate,
    JobListResponse,
    JobResponse,
    JobResponseData,
)
from app.utils.job_parser import extract_required_skills
from app.utils.jwt_handler import get_current_user

# ---------------------------------------------------------------------------
# Router — mounted in main.py with prefix="/api/jobs"
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


# ---------------------------------------------------------------------------
# Helper — Maps DB SQLAlchemy Job into JobResponseData Pydantic Schema
# ---------------------------------------------------------------------------
def map_job_to_schema(job: Job) -> JobResponseData:
    """Helper to convert Job ORM object to camelCase schema response data."""
    return JobResponseData(
        id=job.id,
        title=job.title,
        company=job.company,
        description=job.description,
        requiredSkills=job.required_skills or [],
        createdAt=job.created_at,
    )


# ---------------------------------------------------------------------------
# POST /api/jobs (Create Job Description)
# ---------------------------------------------------------------------------
@router.post(
    "",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new job/internship description description",
)
def create_job(
    payload: JobCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobResponse:
    """
    Saves an internship description to the database.

    Features:
        1. Automatically extracts technical and conceptual skills
           using jobParser matching against 48 keywords.
        2. Validates ownership via JWT.
    """
    # 1 — Extract skills automatically using local logic
    extracted_skills = extract_required_skills(payload.description)

    # 2 — Create the Job row mapped to current user
    new_job = Job(
        user_id=current_user.id,
        title=payload.title.strip(),
        company=payload.company.strip(),
        description=payload.description.strip(),
        required_skills=extracted_skills,
    )

    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # 3 — Return response
    return JobResponse(
        message="Job description saved successfully",
        job=map_job_to_schema(new_job),
    )


# ---------------------------------------------------------------------------
# GET /api/jobs (List User's Saved Jobs)
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=JobListResponse,
    summary="List all job descriptions saved by the user",
)
def list_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobListResponse:
    """
    Returns the list of all job description posts saved by the authenticated user,
    ordered by creation date (newest first).
    """
    jobs = (
        db.query(Job)
        .filter(Job.user_id == current_user.id)
        .order_by(Job.created_at.desc())
        .all()
    )
    return JobListResponse(jobs=[map_job_to_schema(j) for j in jobs])


# ---------------------------------------------------------------------------
# GET /api/jobs/{job_id} (View Single Job Details)
# ---------------------------------------------------------------------------
@router.get(
    "/{job_id}",
    response_model=JobResponse,
    summary="Get full details of a specific job description",
)
def get_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobResponse:
    """
    Returns full details for a single job description.
    Access is secured so that users can only view their own saved descriptions.

    Raises:
        HTTPException 404: If not found or not owned by user.
    """
    job = (
        db.query(Job)
        .filter(Job.id == job_id, Job.user_id == current_user.id)
        .first()
    )
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found.",
        )

    return JobResponse(job=map_job_to_schema(job))


# ---------------------------------------------------------------------------
# DELETE /api/jobs/{job_id} (Delete Saved Job)
# ---------------------------------------------------------------------------
@router.delete(
    "/{job_id}",
    summary="Delete a saved job description",
)
def delete_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Deletes a job description record from the database.
    Access is secured so that users can only delete their own descriptions.

    Raises:
        HTTPException 404: If not found or not owned by user.
    """
    job = (
        db.query(Job)
        .filter(Job.id == job_id, Job.user_id == current_user.id)
        .first()
    )
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found.",
        )

    db.delete(job)
    db.commit()

    return {"message": "Job deleted successfully"}


# ---------------------------------------------------------------------------
# GET /api/jobs/discover/search (Real-time Job Discovery via JSearch API)
# ---------------------------------------------------------------------------
@router.get(
    "/discover/search",
    summary="Search real job listings from LinkedIn, Indeed, Glassdoor via JSearch API",
)
def discover_jobs_endpoint(
    title: str = "",
    location: str = "India",
    job_type: str = "all",
    work_mode: str = "all",
    source: str = "all",
    page: int = 1,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Fetches real-time job listings from JSearch RapidAPI (LinkedIn, Indeed, Glassdoor).
    Computes AI match scores against the user's latest resume skills.
    Results are cached for 30 minutes per query to respect API rate limits.
    """
    from app.utils.job_aggregator import search_jobs
    from app.models.resume import Resume

    # Get user's resume skills for match scoring
    user_skills = []
    latest_resume = (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
        .first()
    )
    if latest_resume and latest_resume.parsed_data:
        user_skills = latest_resume.parsed_data.get("skills") or []

    sources_list = None
    if source != "all":
        sources_list = [s.strip() for s in source.split(",") if s.strip()]

    result = search_jobs(
        title=title,
        location=location,
        job_type=job_type,
        work_mode=work_mode,
        sources=sources_list,
        page=page,
        user_skills=user_skills,
    )

    return result


# ---------------------------------------------------------------------------
# GET /api/jobs/discover/recommended (AI-Recommended Jobs by Resume Skills)
# ---------------------------------------------------------------------------
@router.get(
    "/discover/recommended",
    summary="Get AI-recommended jobs based on the user's latest resume skills",
)
def recommended_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Fetches job listings tailored to the user's top skills from their latest resume.
    Returns up to 6 best-matching jobs.
    """
    from app.utils.job_aggregator import get_recommended_jobs
    from app.models.resume import Resume

    user_skills = []
    latest_resume = (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
        .first()
    )
    if latest_resume and latest_resume.parsed_data:
        user_skills = latest_resume.parsed_data.get("skills") or []

    jobs = get_recommended_jobs(user_skills=user_skills)
    return {"jobs": jobs, "based_on_skills": user_skills[:5]}

