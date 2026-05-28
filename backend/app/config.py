"""
config.py — Application Settings for SkillProof AI

Loads configuration from the .env file using pydantic-settings.
All sensitive values (secrets, DB URLs) live in .env and are
injected here so the rest of the app never hard-codes them.
"""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Central configuration loaded from environment variables / .env file.

    Attributes:
        DATABASE_URL: SQLAlchemy-compatible connection string.
        JWT_SECRET_KEY: Secret used to sign JSON Web Tokens.
        JWT_ALGORITHM: Algorithm for JWT encoding (default HS256).
        ACCESS_TOKEN_EXPIRE_MINUTES: Token lifetime in minutes (default 1440 = 24 h).
    """

    DATABASE_URL: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    model_config = {
        # Point to the .env that sits in the backend/ directory
        "env_file": os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
    }


# ---------------------------------------------------------------------------
# Singleton – import `settings` anywhere you need configuration values.
# ---------------------------------------------------------------------------
settings: Settings = Settings()
