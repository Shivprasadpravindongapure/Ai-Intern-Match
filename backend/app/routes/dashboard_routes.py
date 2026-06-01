"""
dashboard_routes.py — Analytics Dashboard endpoints for SkillProof AI

Provides protected routes to fetch consolidated dashboard metrics
including totals, averages, common missing skills, timelines, and tracker statuses.
"""

from collections import Counter
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.application import Application
from app.models.job import Job
from app.models.match_result import MatchResult
from app.models.resume import Resume
from app.models.user import User
from app.schemas.dashboard_schema import (
    ApplicationStats,
    DashboardResponse,
    MissingSkillItem,
    RecentMatchItem,
)
from app.utils.jwt_handler import get_current_user
from app.utils.role_fit_engine import predict_role_fit

# ---------------------------------------------------------------------------
# Router — mounted in main.py with prefix="/api/dashboard"
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


# ---------------------------------------------------------------------------
# GET /api/dashboard (Get Analytics Summary Dashboard)
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=DashboardResponse,
    summary="Get aggregated statistics for the candidate dashboard",
)
def get_dashboard_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardResponse:
    """
    Returns high-level statistics for the authenticated user:
        1. Resumes, Jobs, and Matches counts.
        2. Average match score across all runs.
        3. Best predicted role fit based on their latest resume.
        4. Top 5 missing skills compiled across match logs.
        5. Recent 5 match results joined with Job titles/companies.
        6. Job Application Tracker status breakdown.
    """
    try:
        # 1 — Counts
        total_resumes = (
            db.query(Resume).filter(Resume.user_id == current_user.id).count()
        )
        total_jobs = db.query(Job).filter(Job.user_id == current_user.id).count()

        # Fetch match results for scores and missing skill counts
        match_results = (
            db.query(MatchResult)
            .filter(MatchResult.user_id == current_user.id)
            .all()
        )
        total_matches = len(match_results)

        # 2 — Calculate Average Match Score
        scores = [mr.score for mr in match_results]
        avg_score = int(round(sum(scores) / len(scores))) if scores else 0

        # 3 — Predict Best Role Fit based on latest uploaded resume
        latest_resume = (
            db.query(Resume)
            .filter(Resume.user_id == current_user.id)
            .order_by(Resume.created_at.desc())
            .first()
        )
        best_role_fit = "General Intern"
        if latest_resume and latest_resume.parsed_data:
            prediction = predict_role_fit(latest_resume.parsed_data)
            best_role_fit = prediction.get("bestFit", "General Intern")

        # 4 — Top 5 Missing Skills (Counter across all match logs)
        missing_skills_list = []
        for mr in match_results:
            missing_skills_list.extend(mr.missing_skills or [])

        skill_counts = Counter(missing_skills_list)
        top_missing = [
            MissingSkillItem(skill=s, count=c)
            for s, c in skill_counts.most_common(5)
        ]

        # 5 — Recent 5 Matches Joined
        recent_matches = (
            db.query(MatchResult)
            .filter(MatchResult.user_id == current_user.id)
            .order_by(MatchResult.created_at.desc())
            .limit(5)
            .all()
        )

        recent_items = []
        for mr in recent_matches:
            # Query job manually to maintain zero-magic clean mapping
            job = db.query(Job).filter(Job.id == mr.job_id).first()
            recent_items.append(
                RecentMatchItem(
                    id=mr.id,
                    jobTitle=job.title if job else "General Position",
                    company=job.company if job else "ABC Tech",
                    score=mr.score,
                    createdAt=mr.created_at,
                )
            )

        # 6 — Job Tracker Status Counts
        applications = (
            db.query(Application)
            .filter(Application.user_id == current_user.id)
            .all()
        )
        total_apps = len(applications)

        by_status = {
            "Saved": 0,
            "Applied": 0,
            "Assessment": 0,
            "Interview": 0,
            "Rejected": 0,
            "Selected": 0,
            "Follow-up": 0,
        }
        for app in applications:
            if app.status in by_status:
                by_status[app.status] += 1

        app_stats = ApplicationStats(total=total_apps, byStatus=by_status)

        # 7 — Package Response
        return DashboardResponse(
            totalResumes=total_resumes,
            totalJobs=total_jobs,
            totalMatches=total_matches,
            averageMatchScore=avg_score,
            bestRoleFit=best_role_fit,
            topMissingSkills=top_missing,
            recentMatchResults=recent_items,
            applications=app_stats,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate dashboard analytics: {e}",
        )
