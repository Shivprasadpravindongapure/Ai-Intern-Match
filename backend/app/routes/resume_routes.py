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

    # 6 — Auto-trigger Gemini AI analysis (non-blocking, best-effort)
    try:
        from app.utils.gemini_client import analyze_resume as gemini_analyze
        analysis = gemini_analyze(extracted_text)
        new_resume.ai_suggestions = analysis
        new_resume.ai_score = analysis.get("score")
        new_resume.ats_keywords = analysis.get("ats_keywords") or []
        db.commit()
        db.refresh(new_resume)
    except Exception:
        pass  # AI analysis is best-effort; don't fail the upload

    # 7 — Return success
    return ResumeUploadResponse(
        message="Resume uploaded and analysed successfully!",
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


# ---------------------------------------------------------------------------
# POST /api/resumes/{resume_id}/tailor (Tailor Resume with AI Rules)
# ---------------------------------------------------------------------------
@router.post(
    "/{resume_id}/tailor",
    response_model=dict,  # Dict format since response has custom nested schemas
    summary="Tailor a resume dynamically to match a Job Description using AI rules",
)
def tailor_resume_endpoint(
    resume_id: int,
    payload: dict,  # Avoid direct pydantic type-checks on routing for dynamic flexibility
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Scans a resume's parsed data, extracts matching Job Description keywords,
    re-writes bullet points, boosts relevant tech skills, and generates
    a downloadable Jake's style LaTeX code.
    """
    from app.schemas.tailor_schema import TailorRequest, TailorResponse
    from app.utils.tailor_engine import tailor_resume_data, generate_latex_code
    from app.models.job import Job

    # 1 — Fetch target resume
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

    # 2 — Ensure we have parsed data
    if not resume.parsed_data:
        try:
            resume.parsed_data = parse_resume(resume.extracted_text or "")
            db.commit()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Parsed data missing and auto-parse failed: {e}",
            )

    # 3 — Extract target job description
    job_id = payload.get("jobId")
    job_desc = payload.get("jobDescription") or ""
    job_title = "Target Position"

    if job_id:
        job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
        if job:
            job_desc = job.description or ""
            job_title = job.title or "Target Position"

    if not job_desc.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide either a valid jobId or a jobDescription text.",
        )

    # 4 — Run AI Tailoring Engine
    tailored = tailor_resume_data(resume.parsed_data, job_desc, job_title)
    latex_code = generate_latex_code(tailored)

    return {
        "message": "Resume tailored successfully!",
        "tailoredData": tailored,
        "latexCode": latex_code,
    }


# ---------------------------------------------------------------------------
# POST /api/resumes/{resume_id}/tailor/save (Save Tailored Resume)
# ---------------------------------------------------------------------------
@router.post(
    "/{resume_id}/tailor/save",
    summary="Save a tailored resume as a new resume record",
)
def save_tailored_resume_endpoint(
    resume_id: int,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Saves a tailored, customized resume as a brand new resume record
    in the candidate's cockpit list.
    """
    # 1 — Fetch original resume
    orig = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_id == current_user.id)
        .first()
    )
    if not orig:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original resume not found.",
        )

    # 2 — Construct flat indexing text for search/ATS parsing
    name = payload.get("name") or "Your Name"
    email = payload.get("email") or ""
    phone = payload.get("phone") or ""
    skills = ", ".join(payload.get("skills") or [])
    
    text_parts = [name, email, phone, skills]
    
    for exp in payload.get("experience") or []:
        role = exp.get("role") or ""
        company = exp.get("company") or ""
        text_parts.append(f"{role} at {company}")
        text_parts.extend(exp.get("bullets") or [])
        
    for proj in payload.get("projects") or []:
        pname = proj.get("name") or ""
        pdesc = proj.get("description") or ""
        text_parts.append(f"Project: {pname} - {pdesc}")

    tailored_text = "\n".join(text_parts)

    # 3 — Insert new Resume record
    new_resume = Resume(
        user_id=current_user.id,
        filename=f"Tailored_{orig.filename}",
        file_path=orig.file_path,  # Link to same file
        extracted_text=tailored_text,
        parsed_data=payload,
    )
    db.add(new_resume)
    db.commit()
    db.refresh(new_resume)

    return {
        "message": "Tailored resume saved successfully as a new record!",
        "resumeId": new_resume.id,
    }

# ---------------------------------------------------------------------------
# GET /api/resumes/{resume_id}/ai-analysis
# ---------------------------------------------------------------------------
@router.get(
    "/{resume_id}/ai-analysis",
    summary="Get cached Gemini AI analysis for a resume",
)
def get_ai_analysis(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Return the cached Gemini AI analysis for a resume.
    Triggers fresh analysis if no cached result exists.
    """
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    if resume.ai_suggestions:
        return {"analysis": resume.ai_suggestions, "ai_score": resume.ai_score, "cached": True}

    # Trigger fresh analysis
    if not resume.extracted_text or not resume.extracted_text.strip():
        raise HTTPException(status_code=400, detail="No text to analyse. Please re-upload.")

    try:
        from app.utils.gemini_client import analyze_resume as gemini_analyze
        analysis = gemini_analyze(resume.extracted_text)
        resume.ai_suggestions = analysis
        resume.ai_score = analysis.get("score")
        resume.ats_keywords = analysis.get("ats_keywords") or []
        db.commit()
        return {"analysis": analysis, "ai_score": resume.ai_score, "cached": False}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {exc}")


# ---------------------------------------------------------------------------
# POST /api/resumes/{resume_id}/ai-refresh
# ---------------------------------------------------------------------------
@router.post(
    "/{resume_id}/ai-refresh",
    summary="Force re-run Gemini AI analysis on a resume",
)
def refresh_ai_analysis(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Re-run Gemini AI analysis and update cached results."""
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if not resume.extracted_text or not resume.extracted_text.strip():
        raise HTTPException(status_code=400, detail="No text to analyse. Please re-upload.")

    try:
        from app.utils.gemini_client import analyze_resume as gemini_analyze
        analysis = gemini_analyze(resume.extracted_text)
        resume.ai_suggestions = analysis
        resume.ai_score = analysis.get("score")
        resume.ats_keywords = analysis.get("ats_keywords") or []
        db.commit()
        return {"analysis": analysis, "ai_score": resume.ai_score, "message": "Analysis refreshed."}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {exc}")
