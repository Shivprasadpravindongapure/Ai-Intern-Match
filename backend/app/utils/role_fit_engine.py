"""
role_fit_engine.py — Role Fit Heuristics for SkillProof AI

Calculates how well a resume matches six common tech internship profiles,
returning percentage scores and tailored study checklist grids.
"""

from typing import Any, Dict, List

# ---------------------------------------------------------------------------
# Role Keywords Configuration Mapping
# ---------------------------------------------------------------------------
ROLE_KEYWORDS: Dict[str, List[str]] = {
    "Backend Intern": [
        "Node.js",
        "Express.js",
        "REST API",
        "JWT",
        "PostgreSQL",
        "MongoDB",
        "Prisma",
        "Docker",
        "Redis",
        "Git",
        "Postman",
    ],
    "Frontend Intern": [
        "HTML",
        "CSS",
        "JavaScript",
        "React",
        "Tailwind CSS",
        "Responsive Design",
        "API Integration",
        "Git",
    ],
    "Full Stack Intern": [
        "React",
        "Node.js",
        "Express.js",
        "REST API",
        "JWT",
        "PostgreSQL",
        "MongoDB",
        "Tailwind CSS",
        "Git",
        "Docker",
    ],
    "AI/ML Intern": [
        "Python",
        "Machine Learning",
        "Deep Learning",
        "NLP",
        "Computer Vision",
        "Pandas",
        "NumPy",
        "Scikit-learn",
        "TensorFlow",
        "PyTorch",
        "Jupyter Notebook",
    ],
    "Cloud Intern": [
        "AWS",
        "Azure",
        "GCP",
        "Docker",
        "Kubernetes",
        "Linux",
        "CI/CD",
        "Cloud Computing",
    ],
    "Data Engineering Intern": [
        "Python",
        "SQL",
        "PostgreSQL",
        "ETL",
        "Spark",
        "Pandas",
        "AWS S3",
        "Airflow",
        "Data Pipeline",
    ],
}


def predict_role_fit(parsed_resume: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates a candidate's resume parsed data against tech internship profiles.

    Computes:
        - score per category: (matchedKeywords / totalKeywords) * 100
        - bestFit: a consolidated string representing the highest scoring roles
        - missingByRole: list of missing skill requirements for each category
    """
    scores = {}
    missing_by_role = {}

    # Extract parsed fields
    skills = parsed_resume.get("skills", []) or []
    projects = parsed_resume.get("projects", []) or []
    experience = parsed_resume.get("experience", []) or []
    section_text = parsed_resume.get("sectionText", {}) or {}

    # Standardize skills list
    resume_skills = [s.strip().lower() for s in skills]

    # Combine other text blocks for holistic scanning
    skills_raw = section_text.get("skills", "").lower()
    projects_raw = section_text.get("projects", "").lower()
    experience_raw = section_text.get("experience", "").lower()

    # Create helper set of clean project titles and job details
    project_titles = [p.strip().lower() for p in projects]
    experience_details = []
    for exp in experience:
        role = exp.get("role", "").strip().lower()
        company = exp.get("company", "").strip().lower()
        experience_details.append(role)
        experience_details.append(company)

    # Perform analysis across each role category
    for role_name, keywords in ROLE_KEYWORDS.items():
        matched_count = 0
        missing = []

        for keyword in keywords:
            keyword_lower = keyword.lower()

            # Check if keyword is found in skills list/text, project list/text, or experience list/text
            in_skills = keyword_lower in resume_skills or keyword_lower in skills_raw
            in_projects = (
                keyword_lower in projects_raw
                or any(keyword_lower in pt for pt in project_titles)
            )
            in_experience = (
                keyword_lower in experience_raw
                or any(keyword_lower in ed for ed in experience_details)
            )

            if in_skills or in_projects or in_experience:
                matched_count += 1
            else:
                missing.append(keyword)

        # Calculate role percentage
        total = len(keywords)
        role_score = int(round((matched_count / total) * 100))
        scores[role_name] = role_score
        missing_by_role[role_name] = missing

    # Sort roles by descending score
    sorted_roles = sorted(scores.items(), key=lambda x: x[1], reverse=True)

    # Determine best fit title (combining top 1 or top 2 if within 12 points and both score >= 35)
    best_fit = "General Intern"
    if sorted_roles:
        top_role, top_score = sorted_roles[0]
        if top_score >= 35:
            if len(sorted_roles) > 1:
                second_role, second_score = sorted_roles[1]
                if top_score - second_score <= 12 and second_score >= 35:
                    # Clean role names for prettier combination
                    r1 = top_role.replace(" Intern", "")
                    r2 = second_role.replace(" Intern", "")
                    best_fit = f"{r1} + {r2} Intern"
                else:
                    best_fit = top_role
            else:
                best_fit = top_role

    return {
        "bestFit": best_fit,
        "scores": scores,
        "missingByRole": missing_by_role,
    }
