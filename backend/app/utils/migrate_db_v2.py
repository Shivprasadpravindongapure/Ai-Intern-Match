"""
migrate_db_v2.py — Database Tables Initialisation Script for SkillProof AI

Ensures that the newly added SQLAlchemy models (Job, MatchResult) are mapped
and created as tables in SQLite without wiping any existing user data.
"""

from app.database import Base, engine
# Import all models to register them on the Base metadata
from app.models.user import User  # noqa: F401
from app.models.resume import Resume  # noqa: F401
from app.models.job import Job  # noqa: F401
from app.models.match_result import MatchResult  # noqa: F401
from app.models.application import Application  # noqa: F401
from app.models.user_profile import UserProfile  # noqa: F401
from app.models.profile_analysis import ProfileAnalysis  # noqa: F401


def init_tables() -> None:
    """Create all database tables that do not exist yet."""
    print("[+] Connecting to database and registering schemas...")
    try:
        Base.metadata.create_all(bind=engine)
        print("[+] Jobs and MatchResult tables are successfully initialized!")
    except Exception as e:
        print(f"[-] Table initialization failed: {e}")


if __name__ == "__main__":
    init_tables()
