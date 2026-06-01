"""
profile_analysis_engine.py — Heuristic Suggestions Engine for SkillProof AI

Analyzes connected links and public GitHub repositories, comparing them against
a candidate's resume (both parsed skills/projects and raw text) to compile
actionable ATS suggestions sorted by priority.
"""

from datetime import datetime, timedelta


def analyze_profile_vs_resume(
    profile: dict,
    resume_text: str,
    parsed_resume: dict,
    github_repos: list,
) -> dict:
    """
    Compares profile URLs and repository metadata against the parsed resume contents.

    Returns:
        A dictionary containing:
            - extractedSkills: List of tech skills parsed from repos.
            - extractedProjects: List of repository names.
            - suggestions: List of structured ATS update suggestion dictionaries.
    """
    suggestions = []
    extracted_skills = set()
    extracted_projects = []

    # Normalise inputs for case-insensitive checks
    resume_text_lower = (resume_text or "").lower()
    resume_skills_lower = {
        s.lower() for s in (parsed_resume.get("skills", []) or [])
    }
    resume_projects_lower = {
        p.lower() for p in (parsed_resume.get("projects", []) or [])
    }

    # -----------------------------------------------------------------------
    # Rule 1: LinkedIn link check
    # -----------------------------------------------------------------------
    if profile.get("linkedin_url"):
        if "linkedin.com" not in resume_text_lower:
            suggestions.append({
                "type": "missing_link",
                "priority": "high",
                "message": "Your LinkedIn profile is connected but not found in your resume.",
                "fix": "Add your LinkedIn URL (e.g. linkedin.com/in/username) in the contact section near your email and phone.",
                "section": "Contact Information",
            })

    # -----------------------------------------------------------------------
    # Rule 2: GitHub link check
    # -----------------------------------------------------------------------
    if profile.get("github_url"):
        if "github.com" not in resume_text_lower:
            suggestions.append({
                "type": "missing_link",
                "priority": "high",
                "message": "Your GitHub profile is connected but not found in your resume.",
                "fix": "Add your GitHub URL (e.g. github.com/username) in the contact details at the top of your resume.",
                "section": "Contact Information",
            })

    # -----------------------------------------------------------------------
    # Rule 3: LeetCode link check
    # -----------------------------------------------------------------------
    if profile.get("leetcode_url"):
        if "leetcode.com" not in resume_text_lower:
            suggestions.append({
                "type": "missing_link",
                "priority": "medium",
                "message": "Your LeetCode profile is connected but not found in your resume.",
                "fix": "Add your LeetCode profile link (e.g. leetcode.com/u/username) to highlight your competitive programming accomplishments.",
                "section": "Contact Information",
            })

    # -----------------------------------------------------------------------
    # Rule 4: Portfolio link check
    # -----------------------------------------------------------------------
    if profile.get("portfolio_url"):
        # Strip domain protocols for a flexible lookup
        portfolio_domain = (
            profile.get("portfolio_url")
            .replace("http://", "")
            .replace("https://", "")
            .replace("www.", "")
            .lower()
        )
        if portfolio_domain not in resume_text_lower:
            suggestions.append({
                "type": "missing_link",
                "priority": "medium",
                "message": "Your Portfolio link is connected but not found in your resume.",
                "fix": "Add your personal Portfolio link to give recruiters immediate access to your live deployed projects.",
                "section": "Contact Information",
            })

    # -----------------------------------------------------------------------
    # Process GitHub Repos
    # -----------------------------------------------------------------------
    recent_threshold = datetime.utcnow() - timedelta(days=30)

    for repo in github_repos:
        repo_name = repo.get("name")
        repo_lang = repo.get("language")
        repo_desc = repo.get("description") or ""
        repo_stars = repo.get("stars", 0)
        repo_updated_str = repo.get("updatedAt")
        repo_topics = repo.get("topics") or []

        if not repo_name:
            continue

        extracted_projects.append(repo_name)

        # Collect languages and topics as candidate skills
        if repo_lang:
            extracted_skills.add(repo_lang)
        for topic in repo_topics:
            extracted_skills.add(topic)

        repo_name_lower = repo_name.lower()

        # Check if project exists in resume (by name match in text or project list)
        project_exists = (
            repo_name_lower in resume_text_lower
            or repo_name_lower in resume_projects_lower
        )

        if not project_exists:
            # Rule 5: New GitHub project not found in resume
            priority = "high" if repo_stars >= 2 else "medium"
            tech_stack = repo_lang if repo_lang else "relevant technologies"
            suggestions.append({
                "type": "missing_project",
                "priority": priority,
                "message": f"Your GitHub project '{repo_name}' is not present in your resume.",
                "fix": f"Add this project to your resume under Projects. Describe its core features, your impact, and list {tech_stack} in its tech stack.",
                "section": "Projects",
            })
        else:
            # Project is already in resume
            # Rule 6: Project is active/recently updated
            if repo_updated_str:
                try:
                    # Normalise ISO timestamp formatting
                    clean_time_str = repo_updated_str.rstrip("Z")
                    updated_dt = datetime.fromisoformat(clean_time_str)
                    if updated_dt >= recent_threshold:
                        suggestions.append({
                            "type": "recent_update",
                            "priority": "low",
                            "message": f"Your project '{repo_name}' was recently updated on GitHub.",
                            "fix": f"Review your resume bullet points for '{repo_name}' and consider adding your latest commits, feature enhancements, or scale metrics.",
                            "section": "Projects",
                        })
                except Exception:
                    pass

        # Rule 7: Weak or empty repository descriptions
        if not repo_desc or len(repo_desc.strip()) < 10:
            suggestions.append({
                "type": "weak_description",
                "priority": "low",
                "message": f"Your GitHub repository '{repo_name}' has an empty or extremely weak description.",
                "fix": f"Go to GitHub and write a concise, professional description explaining what '{repo_name}' does so recruiters scanning your profile immediately understand it.",
                "section": "Projects",
            })

    # -----------------------------------------------------------------------
    # Rule 8: Skills comparison
    # -----------------------------------------------------------------------
    for skill in extracted_skills:
        # Skip small helper tags or single characters
        if len(skill) < 2:
            continue

        if skill.lower() not in resume_skills_lower:
            suggestions.append({
                "type": "missing_skill",
                "priority": "medium",
                "message": f"'{skill}' appears in your GitHub repositories but is missing from your resume Skills section.",
                "fix": f"Add '{skill}' to your Skills section to ensure ATS parses this competency if you are confident in it.",
                "section": "Skills",
            })

    # Sort suggestions by priority: high -> medium -> low
    priority_order = {"high": 0, "medium": 1, "low": 2}
    suggestions.sort(key=lambda x: priority_order.get(x["priority"], 3))

    return {
        "extractedSkills": sorted(list(extracted_skills)),
        "extractedProjects": extracted_projects,
        "suggestions": suggestions,
    }
