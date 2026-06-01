"""
match_routes.py — Resume-to-Job matchmaking router for SkillProof AI

Provides protected routes to trigger resume matchmaking scores, role fit alignment,
and semantic similarity analysis.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.job import Job
from app.models.match_result import MatchResult
from app.models.resume import Resume
from app.models.user import User
from app.schemas.match_schema import MatchRequest, MatchResponse, MatchResultData
from app.utils.jwt_handler import get_current_user
from app.utils.match_engine import (
    calculate_score,
    compare_skills,
    generate_proof_suggestions,
    normalize_skill,
)
from app.utils.resume_parser import parse_resume
from app.utils.role_fit_engine import predict_role_fit
from app.utils.semantic_client import get_semantic_similarity

# ---------------------------------------------------------------------------
# Router — mounted in main.py with prefix="/api/match"
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/api/match", tags=["Matchmaking"])


# ---------------------------------------------------------------------------
# Helper — Maps MatchResult SQLAlchemy DB into MatchResultData Pydantic Schema
# ---------------------------------------------------------------------------
def map_match_result_to_schema(result: MatchResult) -> MatchResultData:
    """Helper to convert MatchResult ORM object to camelCase schema response data."""
    return MatchResultData(
        id=result.id,
        resumeId=result.resume_id,
        jobId=result.job_id,
        score=result.score,
        matchedSkills=result.matched_skills or [],
        missingSkills=result.missing_skills or [],
        suggestions=result.suggestions or [],
        roleFit=result.role_fit or {},
        semanticScore=result.semantic_score,
        finalScore=result.final_score if result.final_score is not None else result.score,
        createdAt=result.created_at,
    )


# ---------------------------------------------------------------------------
# POST /api/match (Trigger Matchmaking Score & ATS Proof-Suggestions)
# ---------------------------------------------------------------------------
@router.post(
    "",
    response_model=MatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Match a specific résumé against a saved internship description",
)
def match_resume_to_job(
    payload: MatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MatchResponse:
    """
    Compares a user's resume against a job description.

    Calculates:
        1. Basic Skill Match Score (formula based).
        2. Proof-Based ATS Suggestions checklist.
        3. Internship Role Fit Predictions (Step 7).
        4. Cosine Semantic Similarity AI score using SentenceTransformers (Step 9).
    """
    # 1 — Secure ownership of the Resume
    resume = (
        db.query(Resume)
        .filter(Resume.id == payload.resumeId, Resume.user_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found or access denied.",
        )

    # 2 — Secure ownership of the Job Description
    job = (
        db.query(Job)
        .filter(Job.id == payload.jobId, Job.user_id == current_user.id)
        .first()
    )
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found or access denied.",
        )

    # 3 — Ensure parsed_data exists, otherwise parse on the fly
    parsed_resume = resume.parsed_data
    if not parsed_resume:
        if not resume.extracted_text or not resume.extracted_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume has no extracted text to compare. Please re-upload.",
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
                detail=f"Failed to parse resume text dynamically: {e}",
            )

    # 4 — Perform Skill Match score calculations
    required_skills = job.required_skills or []
    resume_skills = parsed_resume.get("skills", []) or []

    # Get matching skills list
    matched_skills = compare_skills(resume_skills, required_skills)

    # Get missing skills list
    norm_matched = {normalize_skill(s) for s in matched_skills}
    missing_skills = [
        s for s in required_skills if normalize_skill(s) not in norm_matched
    ]

    # Calculate skill match score
    score = calculate_score(matched_skills, required_skills)

    # 5 — Generate proof-based ATS suggestions
    suggestions = generate_proof_suggestions(parsed_resume, required_skills)

    # 6 — Predict Role Fit alignment (Step 7)
    role_fit = predict_role_fit(parsed_resume)

    # 7 — Calculate Semantic Similarity AI score if enabled (Step 9)
    semantic_score = get_semantic_similarity(
        resume.extracted_text or "", job.description or ""
    )

    # Calculate final weighted score: 60% skill match + 40% semantic similarity
    if semantic_score is not None:
        final_score = int(round(0.6 * score + 0.4 * semantic_score))
    else:
        final_score = score

    # 8 — Save MatchResult row in the database
    new_result = MatchResult(
        user_id=current_user.id,
        resume_id=resume.id,
        job_id=job.id,
        score=score,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        suggestions=suggestions,
        role_fit=role_fit,
        semantic_score=semantic_score,
        final_score=final_score,
    )

    # Cache the ats_score back on the Resume row for Dashboard analytics
    resume.ats_score = final_score
    db.add(resume)

    db.add(new_result)
    db.commit()
    db.refresh(new_result)

    # 9 — Return response
    return MatchResponse(
        message="Match score generated successfully",
        matchResult=map_match_result_to_schema(new_result),
    )
