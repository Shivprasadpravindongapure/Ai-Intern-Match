"""
job_aggregator.py — Real-time Multi-Platform Job Aggregation Engine for SkillProof AI

Fetches live job listings from:
  - JSearch RapidAPI → LinkedIn, Indeed, Glassdoor, ZipRecruiter
  - In-memory cache (30 minutes) to respect rate limits

Falls back to a curated template set if the API key is not configured.
"""

import logging
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# In-memory cache: { cache_key -> (timestamp, results) }
# ─────────────────────────────────────────────────────────────────────────────
_CACHE: Dict[str, tuple] = {}
CACHE_TTL_SECONDS = 1800  # 30 minutes


def _cache_get(key: str) -> Optional[List[Dict]]:
    if key in _CACHE:
        ts, data = _CACHE[key]
        if time.time() - ts < CACHE_TTL_SECONDS:
            return data
        del _CACHE[key]
    return None


def _cache_set(key: str, data: List[Dict]) -> None:
    _CACHE[key] = (time.time(), data)


# ─────────────────────────────────────────────────────────────────────────────
# Skill Match Calculator
# ─────────────────────────────────────────────────────────────────────────────

def calculate_skill_match(job_skills: List[str], user_skills: List[str]) -> int:
    """
    Calculate % of job-required skills the user has.
    Returns 0-100 integer score.
    """
    if not job_skills or not user_skills:
        return 0
    job_lower = {s.lower().strip() for s in job_skills if s}
    user_lower = {s.lower().strip() for s in user_skills if s}
    matched = job_lower & user_lower
    if not job_lower:
        return 0
    return int(round(len(matched) / len(job_lower) * 100))


# ─────────────────────────────────────────────────────────────────────────────
# JSearch API (RapidAPI)
# ─────────────────────────────────────────────────────────────────────────────

def _map_employment_type(raw: str) -> str:
    mapping = {
        "FULLTIME": "fulltime",
        "PARTTIME": "parttime",
        "INTERN": "internship",
        "CONTRACTOR": "contract",
    }
    return mapping.get((raw or "").upper(), "fulltime")


def _map_work_mode(is_remote: bool, title: str = "", desc: str = "") -> str:
    if is_remote:
        return "remote"
    combined = f"{title} {desc}".lower()
    if "hybrid" in combined:
        return "hybrid"
    if "remote" in combined:
        return "remote"
    return "onsite"


def _fetch_jsearch(query: str, location: str = "India", num_pages: int = 1, employment_types: Optional[str] = None) -> List[Dict]:
    """Fetch jobs from JSearch RapidAPI."""
    if not settings.JSEARCH_API_KEY:
        return []

    cache_key = f"jsearch:{query}:{location}:{num_pages}:{employment_types}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    url = "https://jsearch.p.rapidapi.com/search"
    params: Dict[str, Any] = {
        "query": f"{query} in {location}",
        "page": "1",
        "num_pages": str(num_pages),
        "country": "in",
        "date_posted": "month",
    }
    if employment_types:
        params["employment_types"] = employment_types

    headers = {
        "x-rapidapi-key": settings.JSEARCH_API_KEY,
        "x-rapidapi-host": settings.JSEARCH_HOST,
        "Content-Type": "application/json",
    }

    try:
        with httpx.Client(timeout=20) as client:
            resp = client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        logger.error("JSearch HTTP error %s: %s", exc.response.status_code, exc.response.text[:200])
        return []
    except Exception as exc:
        logger.error("JSearch request failed: %s", exc)
        return []

    jobs = []
    for item in data.get("data", []):
        # Extract skills from qualifications / highlights
        skills = []
        qualifications = item.get("job_required_qualifications", {})
        if isinstance(qualifications, dict):
            skills.extend(qualifications.get("items", []) or [])
        highlights = item.get("job_highlights", {})
        if isinstance(highlights, dict):
            for hl in (highlights.get("Qualifications") or []):
                skills.append(hl)
        # Deduplicate
        skills = list(dict.fromkeys(skills))[:15]

        # Salary
        min_sal = item.get("job_min_salary")
        max_sal = item.get("job_max_salary")
        salary_period = item.get("job_salary_period") or ""
        if min_sal and max_sal:
            salary = f"₹{int(min_sal):,} – ₹{int(max_sal):,} / {salary_period.lower() or 'year'}"
        elif min_sal:
            salary = f"₹{int(min_sal):,}+ / {salary_period.lower() or 'year'}"
        else:
            salary = item.get("job_salary_currency") or "Not disclosed"

        # Source / publisher
        publisher = (item.get("job_publisher") or "").lower()
        if "linkedin" in publisher:
            source = "linkedin"
        elif "indeed" in publisher:
            source = "indeed"
        elif "glassdoor" in publisher:
            source = "glassdoor"
        elif "naukri" in publisher:
            source = "naukri"
        else:
            source = publisher or "other"

        job_type = _map_employment_type(item.get("job_employment_type") or "")
        work_mode = _map_work_mode(
            item.get("job_is_remote") or False,
            item.get("job_title") or "",
            item.get("job_description") or "",
        )

        posted_at = item.get("job_posted_at_datetime_utc") or datetime.utcnow().isoformat()

        jobs.append({
            "id": item.get("job_id") or f"jsearch_{len(jobs)}",
            "title": item.get("job_title") or "N/A",
            "company": item.get("employer_name") or "N/A",
            "location": f"{item.get('job_city') or ''}, {item.get('job_state') or ''}, {item.get('job_country') or 'IN'}".strip(", "),
            "job_type": job_type,
            "work_mode": work_mode,
            "salary": salary,
            "description": (item.get("job_description") or "")[:800],
            "apply_url": item.get("job_apply_link") or "#",
            "source": source,
            "required_skills": skills,
            "posted_at": posted_at,
            "logo_url": item.get("employer_logo") or "",
        })

    _cache_set(cache_key, jobs)
    logger.info("JSearch returned %d jobs for query '%s'", len(jobs), query)
    return jobs


# ─────────────────────────────────────────────────────────────────────────────
# Fallback Templates (when API key not configured)
# ─────────────────────────────────────────────────────────────────────────────

_FALLBACK_JOBS = [
    {
        "id": "fallback_1", "title": "Software Engineer Intern", "company": "Infosys",
        "location": "Bengaluru, KA, IN", "job_type": "internship", "work_mode": "hybrid",
        "salary": "₹15,000 – ₹25,000 / month",
        "description": "Join Infosys as a Software Engineering Intern. Work on enterprise-scale Java/Spring Boot applications, participate in Agile sprints, and collaborate with global teams.",
        "apply_url": "https://infosys.com/careers", "source": "linkedin",
        "required_skills": ["Java", "Spring Boot", "SQL", "Git", "REST API"],
        "posted_at": datetime.utcnow().isoformat(), "logo_url": "",
    },
    {
        "id": "fallback_2", "title": "Frontend Developer", "company": "Razorpay",
        "location": "Bengaluru, KA, IN", "job_type": "fulltime", "work_mode": "hybrid",
        "salary": "₹12 – ₹18 LPA",
        "description": "Build world-class payment experiences at Razorpay. Own frontend features end-to-end using React and TypeScript. Work in a fast-moving fintech environment.",
        "apply_url": "https://razorpay.com/jobs", "source": "indeed",
        "required_skills": ["React", "TypeScript", "JavaScript", "CSS", "REST API", "Git"],
        "posted_at": datetime.utcnow().isoformat(), "logo_url": "",
    },
    {
        "id": "fallback_3", "title": "Data Analyst Intern", "company": "Flipkart",
        "location": "Remote", "job_type": "internship", "work_mode": "remote",
        "salary": "₹20,000 – ₹30,000 / month",
        "description": "Analyse large datasets to drive business decisions at Flipkart. Use Python, SQL, and Tableau to build dashboards and reports for the supply chain team.",
        "apply_url": "https://flipkart.com/careers", "source": "glassdoor",
        "required_skills": ["Python", "SQL", "Pandas", "Tableau", "Excel", "Statistics"],
        "posted_at": datetime.utcnow().isoformat(), "logo_url": "",
    },
    {
        "id": "fallback_4", "title": "ML Engineer", "company": "Google India",
        "location": "Hyderabad, TS, IN", "job_type": "fulltime", "work_mode": "onsite",
        "salary": "₹25 – ₹45 LPA",
        "description": "Build and deploy ML models at scale. Work on NLP, computer vision, and recommendation systems. Collaborate with researchers and product teams.",
        "apply_url": "https://careers.google.com", "source": "linkedin",
        "required_skills": ["Python", "TensorFlow", "PyTorch", "ML", "Deep Learning", "NLP"],
        "posted_at": datetime.utcnow().isoformat(), "logo_url": "",
    },
    {
        "id": "fallback_5", "title": "Backend Engineer Intern", "company": "CRED",
        "location": "Bengaluru, KA, IN", "job_type": "internship", "work_mode": "hybrid",
        "salary": "₹40,000 – ₹60,000 / month",
        "description": "Build high-performance backend services at CRED. Work with Python/Go microservices, PostgreSQL, and Redis. Own features from design to production.",
        "apply_url": "https://cred.club/careers", "source": "naukri",
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker", "Git"],
        "posted_at": datetime.utcnow().isoformat(), "logo_url": "",
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def search_jobs(
    title: str = "",
    location: str = "India",
    job_type: str = "all",
    work_mode: str = "all",
    sources: Optional[List[str]] = None,
    page: int = 1,
    user_skills: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Main job search function. Returns paginated results with match scores.

    Args:
        title: Job title / keyword query
        location: Location string
        job_type: 'all', 'internship', 'fulltime', 'parttime'
        work_mode: 'all', 'remote', 'hybrid', 'onsite'
        sources: List of platforms to filter by
        page: Page number (1-based)
        user_skills: User's resume skills for match scoring

    Returns:
        { jobs: list, total: int, page: int, has_more: bool }
    """
    query = title.strip() if title else "software engineer"

    # Map job_type to JSearch employment_types
    emp_type_map = {
        "internship": "INTERN",
        "fulltime": "FULLTIME",
        "parttime": "PARTTIME",
    }
    employment_types = emp_type_map.get(job_type) if job_type != "all" else None

    # Fetch from JSearch
    if settings.JSEARCH_API_KEY:
        raw_jobs = _fetch_jsearch(query, location, num_pages=1, employment_types=employment_types)
    else:
        logger.warning("JSEARCH_API_KEY not set — using fallback job templates")
        raw_jobs = _FALLBACK_JOBS.copy()

    # Apply work_mode filter (post-fetch)
    if work_mode != "all":
        raw_jobs = [j for j in raw_jobs if j.get("work_mode") == work_mode]

    # Apply source filter
    if sources:
        raw_jobs = [j for j in raw_jobs if j.get("source") in sources]

    # Compute match score against user skills
    if user_skills:
        for job in raw_jobs:
            job["match_score"] = calculate_skill_match(
                job.get("required_skills") or [], user_skills
            )
    else:
        for job in raw_jobs:
            job["match_score"] = None

    # Sort: match score desc, then posted desc
    raw_jobs.sort(
        key=lambda x: (x.get("match_score") or 0, x.get("posted_at") or ""),
        reverse=True,
    )

    # Pagination (10 per page)
    page_size = 10
    start = (page - 1) * page_size
    end = start + page_size
    paginated = raw_jobs[start:end]

    return {
        "jobs": paginated,
        "total": len(raw_jobs),
        "page": page,
        "has_more": end < len(raw_jobs),
    }


def get_recommended_jobs(user_skills: List[str], location: str = "India") -> List[Dict]:
    """
    Fetch jobs recommended based on user's resume skills.
    Uses the top 3 skills to build a targeted query.
    """
    if not user_skills:
        query = "software engineer"
    else:
        query = " OR ".join(user_skills[:3])

    if settings.JSEARCH_API_KEY:
        jobs = _fetch_jsearch(query, location, num_pages=1)
    else:
        jobs = _FALLBACK_JOBS.copy()

    # Score against user skills
    for job in jobs:
        job["match_score"] = calculate_skill_match(
            job.get("required_skills") or [], user_skills
        )

    # Return top 6 by match score
    jobs.sort(key=lambda x: x.get("match_score") or 0, reverse=True)
    return jobs[:6]
