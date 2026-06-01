"""
job_parser.py — Job Description Skill Extractor for SkillProof AI

Implements rule-based extraction to identify required internship skills
from raw job descriptions using safe regular expression boundaries.
"""

import re
from typing import List

from app.utils.skill_keywords import SKILL_KEYWORDS


def normalize_text(text: str) -> str:
    """
    Normalise raw text to clean formatting, strip whitespaces, and lowercase.
    """
    return text.strip().lower()


def extract_required_skills(description: str) -> List[str]:
    """
    Scans a job description text against the master SKILL_KEYWORDS list.
    Employs safe regex boundary rules to ensure highly accurate skill extraction.
    """
    if not description or not description.strip():
        return []

    matched_skills = []
    desc_lower = normalize_text(description)

    for skill in SKILL_KEYWORDS:
        # Escape rules to isolate small letters/symbols safely
        if skill == "C++":
            # Match 'C++' case-insensitively, escaping operators
            pattern = r"(?<![a-zA-Z])c\+\+(?![a-zA-Z])"
        elif skill == "C":
            # Prevent 'C' from matching inside "Computer", "Fast", etc.
            pattern = r"(?<![a-zA-Z])c(?![a-zA-Z\+])"
        elif skill in ["C#", "F#"]:
            pattern = rf"(?<![a-zA-Z]){re.escape(skill.lower())}(?![a-zA-Z])"
        elif "." in skill:
            # Matches Node.js, Express.js, Next.js
            pattern = rf"\b{re.escape(skill.lower())}\b"
        else:
            pattern = rf"\b{re.escape(skill.lower())}\b"

        if re.search(pattern, desc_lower):
            matched_skills.append(skill)

    return matched_skills
