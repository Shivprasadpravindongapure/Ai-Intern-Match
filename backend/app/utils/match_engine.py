"""
match_engine.py — Match & Suggestion Engine for SkillProof AI

Compares resume parsed data against job requirements to calculate matching
scores and produce evidence-backed ATS suggestions.
"""

from typing import Any, Dict, List


def normalize_skill(skill: str) -> str:
    """
    Normalise a skill string (lowercase and stripped) to ensure clean exact matching.
    """
    return skill.strip().lower()


def compare_skills(resume_skills: List[str], job_skills: List[str]) -> List[str]:
    """
    Compare resume skills against required job skills.
    Returns the list of matching skills.
    """
    norm_resume = {normalize_skill(s) for s in resume_skills}
    matched = []
    for skill in job_skills:
        if normalize_skill(skill) in norm_resume:
            matched.append(skill)
    return matched


def calculate_score(matched_skills: List[str], required_skills: List[str]) -> int:
    """
    Calculate basic matching score.
    Formula: (matchedSkillsCount / requiredSkillsCount) * 100
    """
    if not required_skills:
        return 0
    score = (len(matched_skills) / len(required_skills)) * 100
    return int(round(score))


def generate_proof_suggestions(
    parsed_resume: Dict[str, Any], job_required_skills: List[str]
) -> List[Dict[str, Any]]:
    """
    Analyze where required skills appear inside different sections of the resume
    (Skills list, Projects, Work Experience) and generate evidence-backed
    suggestions.
    """
    suggestions = []

    # Get parsed skills
    resume_skills = parsed_resume.get("skills", []) or []
    norm_resume_skills = [normalize_skill(s) for s in resume_skills]

    # Get section texts (handles raw layout text)
    section_text = parsed_resume.get("sectionText", {}) or {}
    skills_section = normalize_skill(section_text.get("skills", ""))
    projects_section = normalize_skill(section_text.get("projects", ""))
    experience_section = normalize_skill(section_text.get("experience", ""))

    # Get lists
    projects_list = parsed_resume.get("projects", []) or []
    experience_list = parsed_resume.get("experience", []) or []

    # Process all required skills
    for skill in job_required_skills:
        norm_skill = normalize_skill(skill)

        # 1 — Check presence in Skills section
        in_skills = norm_skill in norm_resume_skills or norm_skill in skills_section

        # 2 — Check presence in Projects section
        in_projects = False
        if norm_skill in projects_section:
            in_projects = True
        else:
            for proj in projects_list:
                if norm_skill in normalize_skill(proj):
                    in_projects = True
                    break

        # 3 — Check presence in Experience section
        in_experience = False
        if norm_skill in experience_section:
            in_experience = True
        else:
            for exp in experience_list:
                role = normalize_skill(exp.get("role", ""))
                company = normalize_skill(exp.get("company", ""))
                if norm_skill in role or norm_skill in company:
                    in_experience = True
                    break

        # Assign status and descriptive message
        if in_skills:
            status = "strong_match"
            message = f"{skill} is present in your Skills section and matches this internship."
        elif in_projects or in_experience:
            status = "partial_match"
            message = (
                f"{skill} appears in your Projects/Experience section but is "
                f"missing from your Skills section. Add {skill} to your Skills section."
            )
        else:
            status = "missing"
            message = (
                f"{skill} is required in this job but not found in your resume. "
                f"Add {skill} only if you have actually used it."
            )

        suggestions.append(
            {
                "skill": skill,
                "status": status,
                "message": message,
                "proof": {
                    "inSkills": in_skills,
                    "inProjects": in_projects,
                    "inExperience": in_experience,
                    "requiredByJob": True,
                },
            }
        )

    # Process resume skills that are not required by this job (not_required)
    for skill in resume_skills:
        norm_skill = normalize_skill(skill)
        if any(normalize_skill(js) == norm_skill for js in job_required_skills):
            continue

        # Check sections for proof
        in_projects = False
        if norm_skill in projects_section:
            in_projects = True
        else:
            for proj in projects_list:
                if norm_skill in normalize_skill(proj):
                    in_projects = True
                    break

        in_experience = False
        if norm_skill in experience_section:
            in_experience = True
        else:
            for exp in experience_list:
                role = normalize_skill(exp.get("role", ""))
                company = normalize_skill(exp.get("company", ""))
                if norm_skill in role or norm_skill in company:
                    in_experience = True
                    break

        suggestions.append(
            {
                "skill": skill,
                "status": "not_required",
                "message": f"{skill} is in your resume but is not required by this job.",
                "proof": {
                    "inSkills": True,
                    "inProjects": in_projects,
                    "inExperience": in_experience,
                    "requiredByJob": False,
                },
            }
        )

    return suggestions
