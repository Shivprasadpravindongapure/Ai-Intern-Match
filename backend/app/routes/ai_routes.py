"""
ai_routes.py — Gemini AI Feature Endpoints for SkillProof AI

Provides all AI-powered API endpoints:
  - Resume analysis (score, strengths, weaknesses, ATS keywords)
  - JD analysis (required skills, red flags, experience level)
  - Resume vs JD comparison (match score, gaps, tips)
  - Cover letter generation (tailored per company/role)
  - Interview preparation (10 Q&A pairs)
  - Career chat (AI assistant)
  - Career roadmap generator
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.notification import Notification
from app.models.resume import Resume
from app.models.user import User
from app.utils import gemini_client
from app.utils.jwt_handler import get_current_user
from app.utils.websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI Features"])


# ─────────────────────────────────────────────────────────────────────────────
# Helper — push real-time notification + save to DB
# ─────────────────────────────────────────────────────────────────────────────

async def _notify(db: Session, user_id: int, notif_type: str, title: str, message: str, meta: dict = None):
    """Save a notification to DB and push it via WebSocket."""
    notif = Notification(
        user_id=user_id,
        type=notif_type,
        title=title,
        message=message,
        meta=meta or {},
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    await manager.send_to_user(user_id, {
        "type": "notification",
        "notification": {
            "id": notif.id,
            "type": notif_type,
            "title": title,
            "message": message,
            "is_read": False,
            "created_at": notif.created_at.isoformat(),
        },
    })


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/ai/analyze-resume
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/analyze-resume",
    summary="Analyse a resume using Gemini AI — returns score, strengths, suggestions, ATS keywords",
)
async def analyze_resume(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Run Gemini AI analysis on a user's uploaded resume.
    Caches results in the resume record (ai_suggestions, ai_score, ats_keywords).
    Pushes a real-time notification on completion.
    """
    resume_id = payload.get("resume_id")
    if not resume_id:
        raise HTTPException(status_code=422, detail="resume_id is required.")

    resume: Resume | None = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    if not resume.extracted_text or len(resume.extracted_text.strip()) < 50:
        raise HTTPException(
            status_code=400,
            detail="Resume has insufficient extracted text. Please re-upload a text-based PDF.",
        )

    try:
        analysis = gemini_client.analyze_resume(resume.extracted_text)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error("AI resume analysis error: %s", exc)
        raise HTTPException(status_code=500, detail="AI analysis failed. Please try again.")

    # Cache results on the resume record
    resume.ai_suggestions = analysis
    resume.ai_score = analysis.get("score")
    resume.ats_keywords = analysis.get("ats_keywords") or []
    db.commit()

    # Push real-time notification
    await _notify(
        db, current_user.id, "ai_done",
        "Resume Analysis Complete ✅",
        f"Your resume scored {analysis.get('score', 0)}/100. Check AI Studio for full report.",
        {"resume_id": resume_id, "score": analysis.get("score")},
    )

    return {"analysis": analysis, "resume_id": resume_id}


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/ai/analyze-jd
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/analyze-jd",
    summary="Analyse a job description — extract skills, red flags, experience level",
)
def analyze_jd(
    payload: dict,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Parse and extract intelligence from a raw job description text."""
    jd_text = (payload.get("jd_text") or "").strip()
    if len(jd_text) < 30:
        raise HTTPException(status_code=422, detail="Please provide a job description (min 30 characters).")

    try:
        analysis = gemini_client.analyze_jd(jd_text)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error("AI JD analysis error: %s", exc)
        raise HTTPException(status_code=500, detail="JD analysis failed. Please try again.")

    return {"analysis": analysis}


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/ai/resume-vs-jd
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/resume-vs-jd",
    summary="Compare resume against JD using Gemini — returns match score, gaps, improvement tips",
)
def resume_vs_jd(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """AI-powered comparison of a specific resume against a job description."""
    resume_id = payload.get("resume_id")
    jd_text = (payload.get("jd_text") or "").strip()

    if not resume_id:
        raise HTTPException(status_code=422, detail="resume_id is required.")
    if len(jd_text) < 30:
        raise HTTPException(status_code=422, detail="Please provide a job description.")

    resume: Resume | None = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    try:
        result = gemini_client.ai_resume_vs_jd(resume.extracted_text or "", jd_text)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error("AI resume vs JD error: %s", exc)
        raise HTTPException(status_code=500, detail="Comparison failed. Please try again.")

    return {"comparison": result}


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/ai/cover-letter
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/cover-letter",
    summary="Generate a tailored cover letter using Gemini AI",
)
def generate_cover_letter(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Generate a personalised cover letter for a specific job application."""
    resume_id = payload.get("resume_id")
    job_title = (payload.get("job_title") or "").strip()
    company = (payload.get("company") or "").strip()
    jd_text = (payload.get("jd_text") or "").strip()

    if not resume_id or not job_title or not company:
        raise HTTPException(status_code=422, detail="resume_id, job_title, and company are required.")

    resume: Resume | None = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    try:
        letter = gemini_client.generate_cover_letter(
            resume_text=resume.extracted_text or "",
            jd_text=jd_text,
            company=company,
            role=job_title,
            user_name=current_user.full_name,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error("Cover letter generation error: %s", exc)
        raise HTTPException(status_code=500, detail="Cover letter generation failed.")

    return {"cover_letter": letter, "job_title": job_title, "company": company}


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/ai/interview-prep
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/interview-prep",
    summary="Generate 10 interview Q&A pairs using Gemini AI",
)
def interview_prep(
    payload: dict,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Generate likely interview questions and model answers for a job role."""
    jd_text = (payload.get("jd_text") or "").strip()
    role = (payload.get("role") or "Software Engineer").strip()

    if len(jd_text) < 20:
        raise HTTPException(status_code=422, detail="Please provide a job description.")

    try:
        questions = gemini_client.generate_interview_prep(jd_text, role)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error("Interview prep generation error: %s", exc)
        raise HTTPException(status_code=500, detail="Interview prep generation failed.")

    return {"questions": questions, "role": role}


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/ai/chat
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/chat",
    summary="Chat with SkillBot — AI career assistant powered by Gemini",
)
def ai_chat(
    payload: dict,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Career Q&A chat powered by Gemini AI."""
    message = (payload.get("message") or "").strip()
    context = (payload.get("context") or "").strip()

    if not message:
        raise HTTPException(status_code=422, detail="Message is required.")
    if len(message) > 2000:
        raise HTTPException(status_code=422, detail="Message too long (max 2000 chars).")

    try:
        reply = gemini_client.chat_response(message, context)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error("AI chat error: %s", exc)
        raise HTTPException(status_code=500, detail="Chat failed. Please try again.")

    return {"reply": reply, "message": message}


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/ai/career-roadmap
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/career-roadmap",
    summary="Generate a personalised career roadmap for a target role",
)
def career_roadmap(
    role: str = "Software Engineer",
    skills: str = "",
    current_user: User = Depends(get_current_user),
) -> dict:
    """Generate a phase-by-phase career roadmap from current skills to target role."""
    if not role.strip():
        raise HTTPException(status_code=422, detail="Role is required.")

    current_skills = [s.strip() for s in skills.split(",") if s.strip()] if skills else []

    try:
        roadmap = gemini_client.generate_career_roadmap(role.strip(), current_skills)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error("Career roadmap error: %s", exc)
        raise HTTPException(status_code=500, detail="Roadmap generation failed.")

    return {"roadmap": roadmap}
