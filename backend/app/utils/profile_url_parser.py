"""
profile_url_parser.py — URL Validation & Username Extraction for Connected Profiles

Validates profile link structures (LinkedIn, GitHub, etc.) and extracts platform
usernames using robust regular expression matching.
"""

import re
from fastapi import HTTPException, status


def extract_username(url: str, platform: str) -> str | None:
    """
    Extracts the username from a public profile URL.
    Returns None if the URL does not match format requirements.
    """
    if not url or not url.strip():
        return None

    # Normalise URL structure by stripping trailing slashes and spacing
    clean_url = url.strip().rstrip("/")

    try:
        if platform == "github":
            # Matches: https://github.com/shivprasad
            match = re.search(r"github\.com/([^/]+)", clean_url, re.IGNORECASE)
            return match.group(1) if match else None

        elif platform == "leetcode":
            # Matches: https://leetcode.com/u/shivprasad or https://leetcode.com/shivprasad
            match = re.search(r"leetcode\.com/(?:u/)?([^/]+)", clean_url, re.IGNORECASE)
            return match.group(1) if match else None

        elif platform == "codechef":
            # Matches: https://www.codechef.com/users/shivprasad
            match = re.search(r"codechef\.com/users/([^/]+)", clean_url, re.IGNORECASE)
            return match.group(1) if match else None

        elif platform == "hackerrank":
            # Matches: https://www.hackerrank.com/profile/shivprasad or hackerrank.com/shivprasad
            match = re.search(r"hackerrank\.com/(?:profile/)?([^/]+)", clean_url, re.IGNORECASE)
            return match.group(1) if match else None

    except Exception:
        return None

    return None


def validate_profile_urls(urls: dict) -> None:
    """
    Validates domain requirements for connected profiles.
    Raises HTTPException 400 if any format checks fail.
    """
    linkedin = urls.get("linkedinUrl")
    github = urls.get("githubUrl")
    leetcode = urls.get("leetcodeUrl")
    codechef = urls.get("codechefUrl")
    hackerrank = urls.get("hackerrankUrl")
    portfolio = urls.get("portfolioUrl")

    # Helper regex for general URL validation
    url_regex = re.compile(
        r"^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$"
    )

    if linkedin and ("linkedin.com" not in linkedin.lower() or not url_regex.match(linkedin)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid LinkedIn profile link. Must be a valid linkedin.com URL.",
        )

    if github and ("github.com" not in github.lower() or not url_regex.match(github)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid GitHub profile link. Must be a valid github.com URL.",
        )

    if leetcode and ("leetcode.com" not in leetcode.lower() or not url_regex.match(leetcode)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid LeetCode profile link. Must be a valid leetcode.com URL.",
        )

    if codechef and ("codechef.com" not in codechef.lower() or not url_regex.match(codechef)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid CodeChef profile link. Must be a valid codechef.com URL.",
        )

    if hackerrank and ("hackerrank.com" not in hackerrank.lower() or not url_regex.match(hackerrank)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid HackerRank profile link. Must be a valid hackerrank.com URL.",
        )

    if portfolio and not url_regex.match(portfolio):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Portfolio profile link. Must be a valid URL.",
        )
