"""
github_client.py — Public GitHub REST API Client for SkillProof AI

Fetches user profile summary stats and repository activities using GitHub's REST API.
Operates zero-dependency and safely handles API rate-limiting or offline exceptions.
"""

import json
import urllib.error
import urllib.request

from app.config import settings


def _make_github_request(url: str) -> dict | list | None:
    """Helper to query the GitHub REST API using urllib with appropriate headers."""
    headers = {
        "User-Agent": "SkillProof-AI-Agent",
        "Accept": "application/vnd.github.v3+json",
    }
    # Inject GITHUB_TOKEN if configured in .env for higher rate limits
    if getattr(settings, "GITHUB_TOKEN", None):
        headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5.0) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"[-] GitHub REST client HTTP Error ({e.code}) for {url}: {e.read().decode('utf-8', errors='ignore')}")
        return None
    except Exception as e:
        print(f"[-] GitHub REST client Exception for {url}: {e}")
        return None


def fetch_github_profile(username: str) -> dict:
    """Queries public profile summary stats for a GitHub username."""
    url = f"https://api.github.com/users/{username}"
    res = _make_github_request(url)

    if not res or isinstance(res, list):
        return {
            "username": username,
            "name": username,
            "bio": "",
            "publicRepos": 0,
            "followers": 0,
            "following": 0,
            "error": "Failed to fetch GitHub profile metrics due to API constraints",
        }

    return {
        "username": res.get("login", username),
        "name": res.get("name") or res.get("login", username),
        "bio": res.get("bio") or "",
        "publicRepos": res.get("public_repos", 0),
        "followers": res.get("followers", 0),
        "following": res.get("following", 0),
    }


def fetch_github_repos(username: str) -> list:
    """Queries recently updated public repositories for a GitHub username."""
    url = f"https://api.github.com/users/{username}/repos?sort=updated&per_page=20"
    res = _make_github_request(url)

    if not res or not isinstance(res, list):
        return []

    repos = []
    for r in res:
        repos.append({
            "name": r.get("name"),
            "description": r.get("description") or "",
            "language": r.get("language") or "",
            "stars": r.get("stargazers_count", 0),
            "forks": r.get("forks_count", 0),
            "updatedAt": r.get("updated_at"),
            "htmlUrl": r.get("html_url"),
            "topics": r.get("topics") or [],
        })
    return repos
