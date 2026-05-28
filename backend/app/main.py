"""
main.py — FastAPI Application Entry-Point for SkillProof AI

Initialises the app, registers middleware, includes routers, and
creates database tables on startup.

Run with:
    uvicorn app.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routes.auth_routes import router as auth_router

# ---------------------------------------------------------------------------
# Application instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SkillProof AI API",
    description=(
        "Backend API for SkillProof AI — an intelligent platform for "
        "skill verification and proof management.  Provides user "
        "authentication (signup / login / JWT) and will be extended "
        "with skill-proof endpoints."
    ),
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — allow the React dev server at localhost:3000
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Startup — create all tables that don't already exist
# ---------------------------------------------------------------------------
@app.on_event("startup")
def on_startup() -> None:
    """Create database tables (if they don't exist) when the server starts."""
    Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------------------------
# Include routers
# ---------------------------------------------------------------------------
app.include_router(auth_router)


# ---------------------------------------------------------------------------
# Root health-check / welcome endpoint
# ---------------------------------------------------------------------------
@app.get("/", tags=["Root"])
def root() -> dict:
    """Root endpoint — confirms the API is running and points to the docs."""
    return {
        "message": "Welcome to SkillProof AI API",
        "docs": "/docs",
    }
