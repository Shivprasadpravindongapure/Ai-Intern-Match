"""
hashing.py — Password Hashing Utilities for SkillProof AI

Uses passlib with the bcrypt scheme so that passwords are never
stored in plain text.
"""

from passlib.context import CryptContext

# ---------------------------------------------------------------------------
# Configure passlib to use bcrypt (auto-handles salt generation).
# "deprecated='auto'" means older hash schemes are automatically
# marked deprecated and re-hashed on verify if needed.
# ---------------------------------------------------------------------------
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash a plain-text password using bcrypt.

    Args:
        password: The raw password from the user.

    Returns:
        A bcrypt hash string safe for database storage.
    """
    return _pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Check a plain-text password against a stored bcrypt hash.

    Args:
        plain_password:  The password the user just typed.
        hashed_password: The hash retrieved from the database.

    Returns:
        True if the password matches, False otherwise.
    """
    return _pwd_context.verify(plain_password, hashed_password)
