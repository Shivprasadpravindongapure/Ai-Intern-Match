"""
application_routes.py — Application Tracker endpoints for SkillProof AI

Provides protected routes to create, view, update, and delete internship
application trackers mapped to saved job descriptions.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.application import Application
from app.models.job import Job
from app.models.user import User
from app.schemas.application_schema import (
    ApplicationCreate,
    ApplicationJobData,
    ApplicationListResponse,
    ApplicationResponse,
    ApplicationResponseData,
    ApplicationUpdate,
)
from app.utils.jwt_handler import get_current_user

# ---------------------------------------------------------------------------
# Router — mounted in main.py with prefix="/api/applications"
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/api/applications", tags=["Applications"])

# Allowed status list for validation
ALLOWED_STATUSES = [
    "Saved",
    "Applied",
    "Assessment",
    "Interview",
    "Rejected",
    "Selected",
    "Follow-up",
]


# ---------------------------------------------------------------------------
# Helper — Maps DB Application to Pydantic Response Data Schema
# ---------------------------------------------------------------------------
def map_application_to_schema(app: Application) -> ApplicationResponseData:
    """Helper to convert Application ORM object to camelCase schema response data."""
    return ApplicationResponseData(
        id=app.id,
        job=ApplicationJobData(
            id=app.job.id,
            title=app.job.title,
            company=app.job.company,
        ),
        status=app.status,
        appliedDate=app.applied_date,
        notes=app.notes,
        createdAt=app.created_at,
        updatedAt=app.updated_at,
    )


# ---------------------------------------------------------------------------
# POST /api/applications (Track Saved Job Application)
# ---------------------------------------------------------------------------
@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Track a new job/internship application",
)
def create_application(
    payload: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    """
    Creates an application tracker entry for a saved job.

    Validates:
        1. Target job exists and belongs to the user.
        2. Status is a valid allowed value.
    """
    # 1 — Validate job belongs to the user
    job = (
        db.query(Job)
        .filter(Job.id == payload.jobId, Job.user_id == current_user.id)
        .first()
    )
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved job description not found or access denied.",
        )

    # 2 — Validate status
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(ALLOWED_STATUSES)}",
        )

    # 3 — Create tracker entry
    # Automatically set applied date to now if status is Applied
    applied_date = None
    if payload.status == "Applied":
        applied_date = datetime.utcnow()

    new_app = Application(
        user_id=current_user.id,
        job_id=job.id,
        status=payload.status,
        applied_date=applied_date,
        notes=payload.notes,
    )

    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    return ApplicationResponse(
        message="Job added to tracker successfully",
        application=map_application_to_schema(new_app),
    )


# ---------------------------------------------------------------------------
# GET /api/applications (List User's Applications)
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=ApplicationListResponse,
    summary="List all tracked applications for the user",
)
def list_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationListResponse:
    """
    Returns all tracked internship applications saved by the user,
    ordered by last update (newest first).
    """
    apps = (
        db.query(Application)
        .filter(Application.user_id == current_user.id)
        .order_by(Application.updated_at.desc())
        .all()
    )
    return ApplicationListResponse(
        applications=[map_application_to_schema(a) for a in apps]
    )


# ---------------------------------------------------------------------------
# GET /api/applications/{app_id} (View Single Application Detail)
# ---------------------------------------------------------------------------
@router.get(
    "/{app_id}",
    response_model=ApplicationResponse,
    summary="Get full details of a specific application tracker",
)
def get_application(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    """
    Returns full details for a single job application tracker.
    Ownership is securely validated.

    Raises:
        HTTPException 404: If not found or not owned by user.
    """
    app = (
        db.query(Application)
        .filter(Application.id == app_id, Application.user_id == current_user.id)
        .first()
    )
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application tracker not found.",
        )

    return ApplicationResponse(application=map_application_to_schema(app))


# ---------------------------------------------------------------------------
# PUT /api/applications/{app_id} (Update Application Tracker)
# ---------------------------------------------------------------------------
@router.put(
    "/{app_id}",
    response_model=ApplicationResponse,
    summary="Update application status, dates, or notes",
)
def update_application(
    app_id: int,
    payload: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    """
    Updates status, applied date, and notes on an application tracker.

    Raises:
        HTTPException 400: If status is not in allowed categories.
        HTTPException 404: If not found or not owned.
    """
    app = (
        db.query(Application)
        .filter(Application.id == app_id, Application.user_id == current_user.id)
        .first()
    )
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application tracker not found.",
        )

    # Validate status
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(ALLOWED_STATUSES)}",
        )

    # Apply updates
    app.status = payload.status
    if payload.appliedDate:
        app.applied_date = payload.appliedDate
    elif payload.status == "Applied" and not app.applied_date:
        # Auto fill date if transitioning to Applied for first time
        app.applied_date = datetime.utcnow()
        
    app.notes = payload.notes
    app.updated_at = datetime.utcnow()

    db.add(app)
    db.commit()
    db.refresh(app)

    return ApplicationResponse(
        message="Application tracker updated successfully",
        application=map_application_to_schema(app),
    )


# ---------------------------------------------------------------------------
# DELETE /api/applications/{app_id} (Remove Tracker Entry)
# ---------------------------------------------------------------------------
@router.delete(
    "/{app_id}",
    summary="Delete an application tracker entry",
)
def delete_application(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Removes a job application tracker entry.

    Raises:
        HTTPException 404: If not found or not owned.
    """
    app = (
        db.query(Application)
        .filter(Application.id == app_id, Application.user_id == current_user.id)
        .first()
    )
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application tracker not found.",
        )

    db.delete(app)
    db.commit()

    return {"message": "Application tracker deleted successfully"}
