"""
main.py — FastAPI Application Entry-Point for SkillProof AI

Initialises the app, registers all middleware, includes all routers,
creates database tables on startup, and wires up WebSocket connections.

Run with:
    uvicorn app.main:app --reload
"""

import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine

# ── Route imports ──────────────────────────────────────────────────────────
from app.routes.auth_routes import router as auth_router
from app.routes.resume_routes import router as resume_router
from app.routes.job_routes import router as job_router
from app.routes.match_routes import router as match_router
from app.routes.dashboard_routes import router as dashboard_router
from app.routes.application_routes import router as application_router
from app.routes.role_fit_routes import router as role_fit_router
from app.routes.profile_routes import router as profile_router
from app.routes.ai_routes import router as ai_router
from app.routes.ws_routes import router as ws_router
from app.routes.automation_routes import router as automation_router

# ── Model imports (ensure tables are created) ─────────────────────────────
from app.models.resume import Resume  # noqa: F401
from app.models.job import Job  # noqa: F401
from app.models.match_result import MatchResult  # noqa: F401
from app.models.application import Application  # noqa: F401
from app.models.user_profile import UserProfile  # noqa: F401
from app.models.profile_analysis import ProfileAnalysis  # noqa: F401
from app.models.discovered_job import DiscoveredJob  # noqa: F401
from app.models.notification import Notification  # noqa: F401

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Application instance
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SkillProof AI API",
    description=(
        "Production-grade backend for SkillProof AI — an intelligent career platform "
        "providing real-time job discovery, AI-powered resume analysis, OTP authentication, "
        "WebSocket notifications, and Dream Job Autopilot using Gemini AI."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─────────────────────────────────────────────────────────────────────────────
# CORS Middleware
# ─────────────────────────────────────────────────────────────────────────────

allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if settings.FRONTEND_URL and settings.FRONTEND_URL not in allowed_origins:
    allowed_origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Startup — create tables + start background jobs
# ─────────────────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def on_startup() -> None:
    """Create all DB tables and start optional background refresh jobs."""
    Base.metadata.create_all(bind=engine)
    logger.info("SkillProof AI v2.0 started. DB tables verified.")

    if getattr(settings, "AUTO_REFRESH_PROFILES", True):
        try:
            from app.jobs.profile_refresh_job import start_profile_refresh_loop
            asyncio.create_task(start_profile_refresh_loop())
        except Exception as exc:
            logger.warning("Profile refresh job not started: %s", exc)


# ─────────────────────────────────────────────────────────────────────────────
# Include all routers
# ─────────────────────────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(resume_router)
app.include_router(job_router)
app.include_router(match_router)
app.include_router(dashboard_router)
app.include_router(application_router)
app.include_router(role_fit_router)
app.include_router(profile_router)
app.include_router(ai_router)
app.include_router(ws_router)     # WebSocket + Notifications
app.include_router(automation_router)


# ─────────────────────────────────────────────────────────────────────────────
# Root health-check endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def root() -> dict:
    """Root endpoint — confirms the API is running."""
    return {
        "status": "ok",
        "service": "SkillProof AI API",
        "version": "2.0.0",
        "docs": "/docs",
        "features": [
            "OTP Email Authentication",
            "Gemini AI Resume Analysis",
            "Real-time JSearch Job Discovery",
            "WebSocket Notifications",
            "Dream Job Autopilot",
        ],
    }
