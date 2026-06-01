"""
profile_routes.py — Connected Profiles API Endpoints for SkillProof AI

Provides protected REST endpoints to save, retrieve, analyze, and delete connected
professional links (LinkedIn, GitHub, etc.) and view resume update snapshots.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.profile_analysis import ProfileAnalysis
from app.models.resume import Resume
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.profile_schema import (
    GitHubDataSchema,
    ProfileAnalysisData,
    ProfileAnalysisHistoryResponse,
    ProfileAnalysisResponse,
    RecentRepoItem,
    SuggestionItemSchema,
    UserProfileResponse,
    UserProfileResponseData,
    UserProfileSave,
)
from app.utils.github_client import fetch_github_profile, fetch_github_repos
from app.utils.jwt_handler import get_current_user
from app.utils.profile_analysis_engine import analyze_profile_vs_resume
from app.utils.profile_url_parser import extract_username, validate_profile_urls

# ---------------------------------------------------------------------------
# Router — mounted in main.py with prefix="/api/profile"
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/api/profile", tags=["Profiles"])


# ---------------------------------------------------------------------------
# Helper mappings
# ---------------------------------------------------------------------------
def map_profile_to_schema(prof: UserProfile) -> UserProfileResponseData:
    """Helper to convert UserProfile ORM to camelCase schema response data."""
    return UserProfileResponseData(
        linkedinUrl=prof.linkedin_url,
        githubUrl=prof.github_url,
        githubUsername=prof.github_username,
        leetcodeUrl=prof.leetcode_url,
        leetcodeUsername=prof.leetcode_username,
        portfolioUrl=prof.portfolio_url,
        codechefUrl=prof.codechef_url,
        codechefUsername=prof.codechef_username,
        hackerrankUrl=prof.hackerrank_url,
        hackerrankUsername=prof.hackerrank_username,
        lastAnalyzedAt=prof.last_analyzed_at,
        createdAt=prof.created_at,
        updatedAt=prof.updated_at,
    )


def map_analysis_to_schema(an: ProfileAnalysis) -> ProfileAnalysisData:
    """Helper to convert ProfileAnalysis ORM to camelCase schema response data."""
    gh_raw = an.github_data or {}
    gh_schema = None
    if gh_raw:
        repos_raw = gh_raw.get("recentRepos", [])
        repos_schema = [
            RecentRepoItem(
                name=r.get("name") or "",
                description=r.get("description") or "",
                language=r.get("language") or "",
                stars=r.get("stars", 0),
                forks=r.get("forks", 0),
                updatedAt=r.get("updatedAt"),
                htmlUrl=r.get("htmlUrl") or "",
                topics=r.get("topics") or [],
            )
            for r in repos_raw
        ]
        gh_schema = GitHubDataSchema(
            username=gh_raw.get("username") or "",
            name=gh_raw.get("name") or "",
            bio=gh_raw.get("bio") or "",
            publicRepos=gh_raw.get("publicRepos", 0),
            followers=gh_raw.get("followers", 0),
            following=gh_raw.get("following", 0),
            recentRepos=repos_schema,
        )

    sug_raw = an.suggestions or []
    suggestions_schema = [
        SuggestionItemSchema(
            type=s.get("type") or "",
            priority=s.get("priority") or "medium",
            message=s.get("message") or "",
            fix=s.get("fix") or "",
            section=s.get("section") or "",
        )
        for s in sug_raw
    ]

    return ProfileAnalysisData(
        id=an.id,
        createdAt=an.created_at,
        githubData=gh_schema,
        leetcodeData=an.leetcode_data or {},
        extractedSkills=an.extracted_skills or [],
        extractedProjects=an.extracted_projects or [],
        suggestions=suggestions_schema,
    )


# ---------------------------------------------------------------------------
# POST /api/profile (Save Connected Profile Links)
# ---------------------------------------------------------------------------
@router.post(
    "",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Connect or update professional profile links",
)
def save_connected_profiles(
    payload: UserProfileSave,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProfileResponse:
    """
    Saves or updates LinkedIn, GitHub, LeetCode, Portfolio, CodeChef, and HackerRank links.
    Validates domain formats and extracts usernames automatically.
    """
    # 1 — Validate URLs formats
    validate_profile_urls(payload.model_dump())

    # 2 — Extract usernames from urls
    github_user = extract_username(payload.githubUrl, "github")
    leetcode_user = extract_username(payload.leetcodeUrl, "leetcode")
    codechef_user = extract_username(payload.codechefUrl, "codechef")
    hackerrank_user = extract_username(payload.hackerrankUrl, "hackerrank")

    # 3 — Upsert (find existing or create new profile)
    prof = (
        db.query(UserProfile)
        .filter(UserProfile.user_id == current_user.id)
        .first()
    )
    if not prof:
        prof = UserProfile(user_id=current_user.id)

    prof.linkedin_url = payload.linkedinUrl
    prof.github_url = payload.githubUrl
    prof.github_username = github_user
    prof.leetcode_url = payload.leetcodeUrl
    prof.leetcode_username = leetcode_user
    prof.portfolio_url = payload.portfolioUrl
    prof.codechef_url = payload.codechefUrl
    prof.codechef_username = codechef_user
    prof.hackerrank_url = payload.hackerrankUrl
    prof.hackerrank_username = hackerrank_user
    prof.updated_at = datetime.utcnow()

    db.add(prof)
    db.commit()
    db.refresh(prof)

    return UserProfileResponse(
        message="Profile links connected successfully",
        profile=map_profile_to_schema(prof),
    )


# ---------------------------------------------------------------------------
# GET /api/profile (Get Connected Profile Links)
# ---------------------------------------------------------------------------
@router.get(
    "",
    summary="Get saved professional profiles for logged-in user",
)
def get_connected_profiles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Returns connected profile URL list. If none are connected, returns null profile."""
    prof = (
        db.query(UserProfile)
        .filter(UserProfile.user_id == current_user.id)
        .first()
    )
    if not prof:
        return {"profile": None}

    return {"profile": map_profile_to_schema(prof)}


# ---------------------------------------------------------------------------
# POST /api/profile/analyze (Fetch Public Activity & Compile Suggestions)
# ---------------------------------------------------------------------------
@router.post(
    "/analyze",
    response_model=ProfileAnalysisResponse,
    summary="Analyze connected links and compile resume update recommendations",
)
def analyze_connected_profiles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileAnalysisResponse:
    """
    Triggers public fetching (e.g. GitHub repositories) and compares
    findings against the latest parsed resume to compile update suggestions.
    """
    # 1 — Ensure User has connected profile links
    prof = (
        db.query(UserProfile)
        .filter(UserProfile.user_id == current_user.id)
        .first()
    )
    if not prof:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No connected profile links found. Connect your profiles before analyzing.",
        )

    # 2 — Fetch latest parsed resume of user
    resume = (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
        .first()
    )
    if not resume or not resume.parsed_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload and parse a resume first before running profile suggestions analysis.",
        )

    # 3 — Query GitHub REST API
    github_data = {}
    repos_list = []
    if prof.github_username:
        gh_profile = fetch_github_profile(prof.github_username)
        repos_list = fetch_github_repos(prof.github_username)
        github_data = {
            "username": gh_profile.get("username"),
            "name": gh_profile.get("name"),
            "bio": gh_profile.get("bio"),
            "publicRepos": gh_profile.get("publicRepos"),
            "followers": gh_profile.get("followers"),
            "following": gh_profile.get("following"),
            "recentRepos": [
                {
                    "name": rp.get("name"),
                    "description": rp.get("description"),
                    "language": rp.get("language"),
                    "stars": rp.get("stars"),
                    "forks": rp.get("forks"),
                    "updatedAt": rp.get("updatedAt"),
                    "htmlUrl": rp.get("htmlUrl"),
                    "topics": rp.get("topics"),
                }
                for rp in repos_list
            ],
        }

    # LeetCode manual mockup data container
    leetcode_data = {}
    if prof.leetcode_username:
        leetcode_data = {
            "username": prof.leetcode_username,
            "profileUrl": prof.leetcode_url,
        }

    # 4 — Run Heuristics Engine
    analysis_res = analyze_profile_vs_resume(
        profile={
            "linkedin_url": prof.linkedin_url,
            "github_url": prof.github_url,
            "leetcode_url": prof.leetcode_url,
            "portfolio_url": prof.portfolio_url,
        },
        resume_text=resume.extracted_text or "",
        parsed_resume=resume.parsed_data,
        github_repos=repos_list,
    )

    # 5 — Save SNAPSHOT to database
    an = ProfileAnalysis(
        user_id=current_user.id,
        user_profile_id=prof.id,
        github_data=github_data,
        leetcode_data=leetcode_data,
        extracted_skills=analysis_res["extractedSkills"],
        extracted_projects=analysis_res["extractedProjects"],
        suggestions=analysis_res["suggestions"],
    )
    db.add(an)

    # Update last analyzed at stamp
    prof.last_analyzed_at = datetime.utcnow()
    db.add(prof)

    db.commit()
    db.refresh(an)

    return ProfileAnalysisResponse(
        message="Profile analysis completed successfully",
        analysis=map_analysis_to_schema(an),
    )


# ---------------------------------------------------------------------------
# GET /api/profile/analysis/latest (Get Latest Analysis Snapshot)
# ---------------------------------------------------------------------------
@router.get(
    "/analysis/latest",
    response_model=ProfileAnalysisResponse,
    summary="Get the most recent resume suggestions analysis snapshot",
)
def get_latest_profile_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileAnalysisResponse:
    """Returns the latest analysis snapshot compiled for the logged-in candidate."""
    an = (
        db.query(ProfileAnalysis)
        .filter(ProfileAnalysis.user_id == current_user.id)
        .order_by(ProfileAnalysis.created_at.desc())
        .first()
    )
    if not an:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No profile analysis snapshots found. Run profile connect analysis first!",
        )

    return ProfileAnalysisResponse(analysis=map_analysis_to_schema(an))


# ---------------------------------------------------------------------------
# GET /api/profile/analysis/history (Get Analysis Snapshots History)
# ---------------------------------------------------------------------------
@router.get(
    "/analysis/history",
    response_model=ProfileAnalysisHistoryResponse,
    summary="Get past resume suggestions snapshots list",
)
def get_profile_analysis_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileAnalysisHistoryResponse:
    """Returns the user's past profile analysis runs sorted by date descending."""
    history = (
        db.query(ProfileAnalysis)
        .filter(ProfileAnalysis.user_id == current_user.id)
        .order_by(ProfileAnalysis.created_at.desc())
        .all()
    )
    return ProfileAnalysisHistoryResponse(
        history=[map_analysis_to_schema(h) for h in history]
    )


# ---------------------------------------------------------------------------
# DELETE /api/profile (Disconnect profiles & clear snapshot logs)
# ---------------------------------------------------------------------------
@router.delete(
    "",
    summary="Disconnect all connected links and clear analysis logs",
)
def delete_connected_profiles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Clears UserProfile and cascade deletes past analysis runs."""
    prof = (
        db.query(UserProfile)
        .filter(UserProfile.user_id == current_user.id)
        .first()
    )
    if not prof:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No connected profile links found to disconnect.",
        )

    db.delete(prof)
    db.commit()

    return {"message": "Profiles successfully disconnected and history cleared."}
