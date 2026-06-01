"""
resume_routes.py — Résumé Upload Endpoints for SkillProof AI

Provides upload, list, detail, and delete routes for user résumés.
All paths are prefixed with /api/resumes (set on the router).
"""

import io
import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from PyPDF2 import PdfReader
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.resume import Resume
from app.models.user import User
from app.schemas.resume_schema import (
    ResumeData,
    ResumeDetail,
    ResumeDetailResponse,
    ResumeListItem,
    ResumeListResponse,
    ResumeUploadResponse,
    ParsedResumeResponse,
)
from app.schemas.user_schema import MessageResponse
from app.utils.jwt_handler import get_current_user
from app.utils.resume_parser import parse_resume

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MAX_FILE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
UPLOAD_DIR: str = os.path.join("uploads", "resumes")

# ---------------------------------------------------------------------------
# Router — mounted in main.py with prefix="/api/resumes"
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/api/resumes", tags=["Resumes"])


# ---------------------------------------------------------------------------
# POST /api/resumes/upload
# ---------------------------------------------------------------------------
@router.post(
    "/upload",
    response_model=ResumeUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a résumé (PDF only, max 5 MB)",
)
async def upload_resume(
    resume: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumeUploadResponse:
    """
    Upload a PDF résumé and extract its text content.

    Steps:
        1. Validate the file is a PDF (content type + extension).
        2. Validate the file size does not exceed 5 MB.
        3. Save the file to disk with a unique name.
        4. Extract text from the PDF using PyPDF2.
        5. Store a Resume record in the database.
        6. Return the resume data with extracted text.

    Raises:
        HTTPException 400: If the file is not a PDF or exceeds 5 MB.
    """
    # 1 — Validate file type (content type AND extension)
    if resume.content_type != "application/pdf" or not resume.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed.",
        )

    # 2 — Read content and validate file size
    content: bytes = await resume.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 5 MB limit.",
        )

    # 3 — Save file to disk with a UUID prefix for uniqueness
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    unique_filename: str = f"{uuid.uuid4()}_{resume.filename}"
    file_path: str = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # 4 — Extract text from the PDF
    reader = PdfReader(io.BytesIO(content))
    extracted_text: str = "".join(
        page.extract_text() or "" for page in reader.pages
    )

    # 5 — Create and persist the resume record
    new_resume = Resume(
        user_id=current_user.id,
        filename=resume.filename,
        file_path=file_path,
        extracted_text=extracted_text,
    )
    db.add(new_resume)
    db.commit()
    db.refresh(new_resume)

    # 6 — Return success
    return ResumeUploadResponse(
        message="Resume uploaded successfully!",
        resume=ResumeData.model_validate(new_resume),
    )


# ---------------------------------------------------------------------------
# GET /api/resumes
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=ResumeListResponse,
    summary="List all résumés for the current user",
)
def list_resumes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumeListResponse:
    """
    Return a list of all résumés uploaded by the authenticated user.

    Results are ordered by creation date (newest first).
    """
    resumes = (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
        .all()
    )
    return ResumeListResponse(
        resumes=[ResumeListItem.model_validate(r) for r in resumes],
    )


# ---------------------------------------------------------------------------
# GET /api/resumes/{resume_id}
# ---------------------------------------------------------------------------
@router.get(
    "/{resume_id}",
    response_model=ResumeDetailResponse,
    summary="Get full details of a specific résumé",
)
def get_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumeDetailResponse:
    """
    Return full details (including extracted text) for a single résumé.

    The résumé must belong to the currently authenticated user.

    Raises:
        HTTPException 404: If the résumé is not found or does not
            belong to the current user.
    """
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    return ResumeDetailResponse(
        resume=ResumeDetail.model_validate(resume),
    )


# ---------------------------------------------------------------------------
# DELETE /api/resumes/{resume_id}
# ---------------------------------------------------------------------------
@router.delete(
    "/{resume_id}",
    response_model=MessageResponse,
    summary="Delete a specific résumé",
)
def delete_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """
    Delete a résumé record and its associated file from disk.

    Steps:
        1. Look up the résumé (must belong to the current user).
        2. Remove the file from disk (if it still exists).
        3. Delete the database record.
        4. Return a confirmation message.

    Raises:
        HTTPException 404: If the résumé is not found or does not
            belong to the current user.
    """
    # 1 — Find the resume
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    # 2 — Remove file from disk (ignore if already deleted)
    if os.path.exists(resume.file_path):
        os.remove(resume.file_path)

    # 3 — Delete the database record
    db.delete(resume)
    db.commit()

    # 4 — Return success
    return MessageResponse(message="Resume deleted successfully.")


# ---------------------------------------------------------------------------
# GET /api/resumes/{resume_id}/parsed
# ---------------------------------------------------------------------------
@router.get(
    "/{resume_id}/parsed",
    response_model=ParsedResumeResponse,
    summary="Get parsed structured data for a specific résumé",
)
def get_parsed_resume(
    resume_id: int,
    reparse: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ParsedResumeResponse:
    """
    Parse a résumé and return its details in a highly structured format.

    If parsed data is already cached in the database, it will be returned
    immediately. Pass `reparse=True` as a query parameter to force re-parsing.

    Raises:
        HTTPException 404: If the résumé is not found or not owned by user.
        HTTPException 400: If the résumé has no extracted text.
    """
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    if not resume.extracted_text or not resume.extracted_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No extracted text available for this resume. Please re-upload.",
        )

    # Use cached data if available and re-parsing is not forced
    if resume.parsed_data and not reparse:
        return ParsedResumeResponse(parsedResume=resume.parsed_data)

    # Parse raw resume text using rule-based parser
    try:
        parsed_data = parse_resume(resume.extracted_text)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse resume text: {e}",
        )

    # Cache the parsed output in the database
    resume.parsed_data = parsed_data
    db.commit()
    db.refresh(resume)

    return ParsedResumeResponse(parsedResume=parsed_data)

