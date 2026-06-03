"""
config.py — Application Settings for SkillProof AI

Loads all configuration from .env using pydantic-settings.
All sensitive values live in .env — never hard-coded.
"""

import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """
    Central configuration loaded from environment variables / .env file.
    """

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str

    # ── JWT ───────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # ── Semantic AI ──────────────────────────────────────────────────────────
    USE_SEMANTIC_AI: bool = False
    SEMANTIC_SERVICE_URL: str = "http://localhost:8001"
    AUTO_REFRESH_PROFILES: bool = True

    # ── GitHub ────────────────────────────────────────────────────────────────
    GITHUB_TOKEN: Optional[str] = None

    # ── Gemini AI ─────────────────────────────────────────────────────────────
    GEMINI_API_KEY: Optional[str] = None

    # ── JSearch (RapidAPI) ────────────────────────────────────────────────────
    JSEARCH_API_KEY: Optional[str] = None
    JSEARCH_HOST: str = "jsearch.p.rapidapi.com"

    # ── Email / SMTP ──────────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_NAME: str = "SkillProof AI"

    # ── Frontend ──────────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:3000"

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 60
    OTP_EXPIRY_MINUTES: int = 10
    OTP_MAX_RESEND_PER_HOUR: int = 3

    model_config = {
        "env_file": os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
    }


# Singleton — import `settings` anywhere you need configuration values.
settings: Settings = Settings()
