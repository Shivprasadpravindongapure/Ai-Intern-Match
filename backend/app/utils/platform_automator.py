"""
platform_automator.py — Application Package Generator for SkillProof AI

Generates ready-to-submit application packages for LinkedIn, Indeed,
Naukri, and other platforms using Gemini AI. Each package includes
a tailored cover letter, professional summary, Q&A answers, cold email,
and platform-specific tips.
"""

import logging
from typing import Dict, Any

from app.utils.gemini_client import generate_cover_letter, _ask

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Core Package Builder
# ─────────────────────────────────────────────────────────────────────────────

def _build_application_package(
    resume_data: dict,
    job: dict,
    user_name: str,
    user_email: str = "",
    platform: str = "general",
) -> dict:
    """
    Build a complete application package for a specific job.

    Returns:
        {
            cover_letter, tailored_summary, key_answers,
            cold_email, tips, apply_url, platform
        }
    """
    # Extract resume info
    parsed = resume_data.get("parsed_data") or {}
    resume_text = resume_data.get("extracted_text") or ""
    skills = parsed.get("skills") or []
    experience = parsed.get("experience") or []

    job_title = job.get("title") or "the role"
    company = job.get("company") or "the company"
    jd_text = job.get("description") or ""
    apply_url = job.get("apply_url") or "#"

    # ── Cover Letter ──────────────────────────────────────────────────────
    try:
        cover_letter = generate_cover_letter(
            resume_text=resume_text,
            jd_text=jd_text,
            company=company,
            role=job_title,
            user_name=user_name,
        )
    except Exception as exc:
        logger.error("Cover letter generation failed: %s", exc)
        cover_letter = _fallback_cover_letter(user_name, job_title, company)

    # ── Tailored Professional Summary ────────────────────────────────────
    try:
        skills_str = ", ".join(skills[:8]) if skills else "software development"
        summary_prompt = (
            f"Write a 3-sentence professional summary for {user_name} "
            f"applying for {job_title} at {company}. "
            f"Their key skills: {skills_str}. "
            f"Job context: {jd_text[:400]}. "
            f"Make it punchy, specific, and ATS-friendly. Plain text only."
        )
        tailored_summary = _ask(summary_prompt)
    except Exception as exc:
        logger.error("Summary generation failed: %s", exc)
        tailored_summary = f"Results-driven professional with expertise in {', '.join(skills[:3])} seeking {job_title} at {company}."

    # ── Screening Question Answers ────────────────────────────────────────
    try:
        questions = job.get("questions") or []
        if not questions:
            # Generate likely questions from JD
            q_prompt = (
                f"List 3 common screening questions for a {job_title} role at {company}. "
                f"Return as a plain numbered list, just the questions."
            )
            q_raw = _ask(q_prompt)
            questions = [q.strip().lstrip("0123456789.-) ") for q in q_raw.split("\n") if q.strip()][:3]

        key_answers = []
        for question in questions[:5]:
            try:
                ans_prompt = (
                    f"Answer this job application screening question for {user_name} "
                    f"applying to {job_title} at {company}:\n\nQuestion: {question}\n\n"
                    f"Their skills: {', '.join(skills[:6])}\n"
                    f"Write a concise, professional answer (2-3 sentences). Plain text."
                )
                answer = _ask(ans_prompt)
                key_answers.append({"question": question, "answer": answer})
            except Exception:
                key_answers.append({"question": question, "answer": "Please answer based on your specific experience."})
    except Exception as exc:
        logger.error("Q&A generation failed: %s", exc)
        key_answers = []

    # ── Cold Email ────────────────────────────────────────────────────────
    try:
        email_prompt = (
            f"Write a brief, professional cold outreach email from {user_name} "
            f"({user_email}) to the hiring team at {company} "
            f"expressing interest in the {job_title} position. "
            f"Skills: {', '.join(skills[:5])}. "
            f"Keep it under 150 words. Subject line included. Plain text."
        )
        cold_email = _ask(email_prompt)
    except Exception as exc:
        logger.error("Cold email generation failed: %s", exc)
        cold_email = _fallback_cold_email(user_name, user_email, job_title, company)

    # ── Platform Tips ─────────────────────────────────────────────────────
    tips = _get_platform_tips(platform, job_title)

    return {
        "cover_letter": cover_letter,
        "tailored_summary": tailored_summary,
        "key_answers": key_answers,
        "cold_email": cold_email,
        "tips": tips,
        "apply_url": apply_url,
        "platform": platform,
        "job_title": job_title,
        "company": company,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Platform-Specific Tip Sets
# ─────────────────────────────────────────────────────────────────────────────

def _get_platform_tips(platform: str, role: str) -> list:
    base_tips = [
        f"Customise your resume headline to include '{role}'",
        "Apply within the first 24-48 hours of posting for best visibility",
        "Follow up with a LinkedIn message to the recruiter 1 week after applying",
    ]
    platform_tips = {
        "linkedin": [
            "Set your LinkedIn profile to 'Open to Work' (only visible to recruiters)",
            "Connect with the hiring manager before applying — a warm application wins",
            "Use 'Easy Apply' only if your LinkedIn profile is 100% complete",
        ],
        "indeed": [
            "Upload your resume directly to Indeed for 'Indeed Resume' visibility",
            "Set up Indeed job alerts for similar roles",
            "Complete the Indeed skills assessment for this role to stand out",
        ],
        "naukri": [
            "Keep your Naukri profile freshness score at 100% (update weekly)",
            "Add a profile headline with your top 3 skills and target role",
            "Enable 'Recruiter reachability' in Naukri profile settings",
        ],
    }
    return base_tips + platform_tips.get(platform.lower(), [])


# ─────────────────────────────────────────────────────────────────────────────
# Fallback Content
# ─────────────────────────────────────────────────────────────────────────────

def _fallback_cover_letter(user_name: str, role: str, company: str) -> str:
    return (
        f"Dear Hiring Manager,\n\n"
        f"I am {user_name}, and I am writing to express my strong interest in the {role} "
        f"position at {company}. With my background and skills, I am confident I can make "
        f"a meaningful contribution to your team.\n\n"
        f"I am excited about the opportunity to bring my expertise to {company} and would "
        f"welcome the chance to discuss how my background aligns with your needs.\n\n"
        f"Thank you for your consideration.\n\nSincerely,\n{user_name}"
    )


def _fallback_cold_email(user_name: str, email: str, role: str, company: str) -> str:
    return (
        f"Subject: Interest in {role} Position at {company}\n\n"
        f"Dear Hiring Team,\n\n"
        f"I came across the {role} opening at {company} and wanted to reach out directly. "
        f"I believe my background is a strong match for this role and I am very interested "
        f"in joining your team.\n\n"
        f"I would love the opportunity to connect. Please find my resume attached.\n\n"
        f"Best regards,\n{user_name}\n{email}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def prepare_application(
    resume_data: dict,
    job: dict,
    user_name: str,
    user_email: str = "",
) -> dict:
    """Prepare a complete application package for a single job."""
    platform = job.get("source") or "general"
    return _build_application_package(resume_data, job, user_name, user_email, platform)


def prepare_batch_applications(
    resume_data: dict,
    jobs: list,
    user_name: str,
    user_email: str = "",
) -> list:
    """Prepare application packages for multiple jobs."""
    packages = []
    for job in jobs[:10]:  # Limit to 10 jobs per batch
        try:
            pkg = prepare_application(resume_data, job, user_name, user_email)
            packages.append(pkg)
        except Exception as exc:
            logger.error("Batch application failed for job %s: %s", job.get("title"), exc)
    return packages
