"""
database.py — SQLAlchemy Database Setup for SkillProof AI

Creates the engine, session factory, and declarative Base.
Also provides a `get_db` dependency for FastAPI route injection.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from typing import Generator

from app.config import settings

# ---------------------------------------------------------------------------
# Engine — the core interface to the database.
# For SQLite we must disable the same-thread check so FastAPI's async
# workers can share the connection safely.
# ---------------------------------------------------------------------------
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}  # Required for SQLite only
)

# ---------------------------------------------------------------------------
# Session factory — each call produces an independent database session.
# ---------------------------------------------------------------------------
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# ---------------------------------------------------------------------------
# Base class — all ORM models inherit from this.
# ---------------------------------------------------------------------------
Base = declarative_base()


# ---------------------------------------------------------------------------
# Dependency — yields a DB session and ensures it is closed after use.
# ---------------------------------------------------------------------------
def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a SQLAlchemy session.

    Usage in a route:
        @router.get("/items")
        def read_items(db: Session = Depends(get_db)):
            ...

    The session is automatically closed when the request finishes,
    even if an exception occurs.
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
