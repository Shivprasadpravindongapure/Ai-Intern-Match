"""
gemini_client.py — Google Gemini AI Client for SkillProof AI

Provides all AI-powered features: resume analysis, JD analysis,
cover letter generation, interview prep, resume-vs-JD comparison,
career chat, and career roadmap generation.

Uses gemini-1.5-flash model for fast, cost-effective responses.
"""

import json
import logging
import re
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

# ── Lazy-import Gemini SDK ─────────────────────────────────────────────────
_genai = None
_model = None


def _get_model():
    """Lazily initialise the Gemini model on first use."""
    global _genai, _model
    if _model is not None:
        return _model
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured in .env")
    import google.generativeai as genai
    _genai = genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    _model = genai.GenerativeModel("gemini-1.5-flash")
    return _model


def _safe_json(text: str) -> dict:
    """
    Extract and parse JSON from a Gemini response.
    Strips markdown fences if present.
    """
    # Remove ```json ... ``` fences
    cleaned = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("`").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to extract first JSON object/array
        match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                pass
    return {}


def _ask(prompt: str) -> str:
    """Send a prompt to Gemini and return raw text response."""
    model = _get_model()
    response = model.generate_content(prompt)
    return response.text.strip()


# ─────────────────────────────────────────────────────────────────────────────
# 1. Resume Analysis
# ─────────────────────────────────────────────────────────────────────────────

def analyze_resume(resume_text: str) -> dict:
    """
    Analyse a resume and return structured feedback.

    Returns:
        {
            score: int (0-100),
            strengths: list[str],
            weaknesses: list[str],
            suggestions: list[str],
            ats_keywords: list[str],
            missing_sections: list[str],
            summary: str
        }
    """
    if not resume_text or len(resume_text.strip()) < 50:
        return _default_resume_analysis()

    prompt = f"""
You are an expert resume reviewer and ATS (Applicant Tracking System) specialist.
Analyse the following resume text and return a JSON object with this exact structure:

{{
  "score": <integer 0-100 representing overall resume quality>,
  "strengths": [<list of 3-5 specific strengths found in this resume>],
  "weaknesses": [<list of 3-5 specific weaknesses or gaps found>],
  "suggestions": [<list of 5-7 actionable improvement suggestions>],
  "ats_keywords": [<list of 10-15 important ATS keywords present in the resume>],
  "missing_sections": [<list of important sections missing e.g. "Certifications", "Projects">],
  "summary": "<2-3 sentence overall assessment>"
}}

Be specific to the actual content of this resume. Do not give generic advice.
Return ONLY the JSON object, no explanation.

RESUME TEXT:
{resume_text[:4000]}
"""
    try:
        raw = _ask(prompt)
        result = _safe_json(raw)
        if not result or "score" not in result:
            return _default_resume_analysis()
        # Ensure score is integer
        result["score"] = int(result.get("score", 50))
        return result
    except Exception as exc:
        logger.error("Gemini analyze_resume failed: %s", exc)
        return _default_resume_analysis()


def _default_resume_analysis() -> dict:
    return {
        "score": 0,
        "strengths": [],
        "weaknesses": ["Could not analyse resume. Ensure PDF text is extractable."],
        "suggestions": ["Re-upload your resume as a text-based PDF (not scanned image)."],
        "ats_keywords": [],
        "missing_sections": [],
        "summary": "Analysis failed. Please try re-uploading your resume.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. Job Description Analysis
# ─────────────────────────────────────────────────────────────────────────────

def analyze_jd(jd_text: str) -> dict:
    """
    Analyse a job description and extract structured intelligence.

    Returns:
        {
            required_skills: list[str],
            nice_to_have: list[str],
            red_flags: list[str],
            experience_level: str,
            role_type: str,
            responsibilities: list[str],
            company_culture_hints: list[str]
        }
    """
    if not jd_text or len(jd_text.strip()) < 30:
        return _default_jd_analysis()

    prompt = f"""
You are an expert job market analyst. Analyse this job description and return a JSON object:

{{
  "required_skills": [<list of must-have technical and soft skills>],
  "nice_to_have": [<list of preferred but not mandatory skills>],
  "red_flags": [<list of any concerning phrases e.g. "wear many hats", "fast-paced startup", unpaid>],
  "experience_level": "<Entry/Junior/Mid/Senior/Lead>",
  "role_type": "<Engineering/Design/Marketing/Sales/Data/etc>",
  "responsibilities": [<list of 4-6 key responsibilities from the JD>],
  "company_culture_hints": [<list of 2-4 culture signals from the text>]
}}

Be specific. Only extract what is actually written in the JD.
Return ONLY the JSON object.

JOB DESCRIPTION:
{jd_text[:4000]}
"""
    try:
        raw = _ask(prompt)
        result = _safe_json(raw)
        if not result or "required_skills" not in result:
            return _default_jd_analysis()
        return result
    except Exception as exc:
        logger.error("Gemini analyze_jd failed: %s", exc)
        return _default_jd_analysis()


def _default_jd_analysis() -> dict:
    return {
        "required_skills": [],
        "nice_to_have": [],
        "red_flags": [],
        "experience_level": "Unknown",
        "role_type": "Unknown",
        "responsibilities": [],
        "company_culture_hints": [],
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. Resume vs JD Comparison
# ─────────────────────────────────────────────────────────────────────────────

def ai_resume_vs_jd(resume_text: str, jd_text: str) -> dict:
    """
    Compare resume against a job description using Gemini AI.

    Returns:
        {
            match_score: int (0-100),
            matched_skills: list[str],
            missing_skills: list[str],
            improvement_tips: list[str],
            tailored_summary: str,
            verdict: str
        }
    """
    if not resume_text or not jd_text:
        return _default_resume_vs_jd()

    prompt = f"""
You are an expert ATS consultant and hiring manager. Compare this resume against the job description.
Return a JSON object with this exact structure:

{{
  "match_score": <integer 0-100 representing how well the resume matches the JD>,
  "matched_skills": [<skills present in both the resume and the JD>],
  "missing_skills": [<important skills from JD not found in resume>],
  "improvement_tips": [<list of 5-7 specific tips to improve the resume for this exact JD>],
  "tailored_summary": "<A 3-4 sentence professional summary the candidate should use for THIS job>",
  "verdict": "<Recommended/Borderline/Not Recommended> with one sentence explanation"
}}

Be honest and specific. Focus only on this JD and this resume.
Return ONLY the JSON object.

RESUME:
{resume_text[:2500]}

JOB DESCRIPTION:
{jd_text[:2000]}
"""
    try:
        raw = _ask(prompt)
        result = _safe_json(raw)
        if not result or "match_score" not in result:
            return _default_resume_vs_jd()
        result["match_score"] = int(result.get("match_score", 0))
        return result
    except Exception as exc:
        logger.error("Gemini ai_resume_vs_jd failed: %s", exc)
        return _default_resume_vs_jd()


def _default_resume_vs_jd() -> dict:
    return {
        "match_score": 0,
        "matched_skills": [],
        "missing_skills": [],
        "improvement_tips": ["Please provide both resume text and job description."],
        "tailored_summary": "",
        "verdict": "Unable to analyse",
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. Cover Letter Generator
# ─────────────────────────────────────────────────────────────────────────────

def generate_cover_letter(
    resume_text: str,
    jd_text: str,
    company: str,
    role: str,
    user_name: str,
) -> str:
    """
    Generate a tailored professional cover letter.
    Returns the cover letter as a formatted string.
    """
    prompt = f"""
You are an expert career coach and professional writer. Write a compelling, tailored cover letter
for the following candidate applying to a specific role.

CANDIDATE NAME: {user_name}
ROLE: {role}
COMPANY: {company}

CANDIDATE RESUME SUMMARY:
{resume_text[:1500]}

JOB DESCRIPTION:
{jd_text[:1500]}

Write a professional, personalized cover letter (3-4 paragraphs, ~300 words) that:
1. Opens with a strong hook referencing the specific company and role
2. Highlights 2-3 most relevant experiences from the resume that match the JD
3. Shows genuine enthusiasm for the company and role
4. Closes with a clear call to action

Format as clean text (no markdown). Start directly with "Dear Hiring Manager," or the appropriate salutation.
"""
    try:
        return _ask(prompt)
    except Exception as exc:
        logger.error("Gemini generate_cover_letter failed: %s", exc)
        return (
            f"Dear Hiring Manager,\n\n"
            f"I am {user_name} and I am excited to apply for the {role} position at {company}.\n\n"
            f"[Cover letter generation failed. Please try again.]\n\n"
            f"Sincerely,\n{user_name}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 5. Interview Preparation
# ─────────────────────────────────────────────────────────────────────────────

def generate_interview_prep(jd_text: str, role: str) -> list:
    """
    Generate 10 interview questions with model answers for a given JD.

    Returns:
        list of { question, model_answer, category, difficulty }
    """
    prompt = f"""
You are an expert technical interviewer with 15 years of experience.
Generate 10 interview questions for a {role} role based on this job description.

Mix of: Technical (40%), Behavioral (30%), Situational (20%), Company-fit (10%).

Return a JSON array with exactly 10 objects:
[
  {{
    "question": "<the interview question>",
    "model_answer": "<a strong, specific model answer (3-5 sentences)>",
    "category": "<Technical/Behavioral/Situational/Company-fit>",
    "difficulty": "<Easy/Medium/Hard>"
  }},
  ...
]

Make questions specific to the JD requirements. Answers should be STAR-method where appropriate.
Return ONLY the JSON array.

JOB DESCRIPTION:
{jd_text[:3000]}

ROLE: {role}
"""
    try:
        raw = _ask(prompt)
        result = _safe_json(raw)
        if isinstance(result, list) and len(result) > 0:
            return result
        return _default_interview_prep(role)
    except Exception as exc:
        logger.error("Gemini generate_interview_prep failed: %s", exc)
        return _default_interview_prep(role)


def _default_interview_prep(role: str) -> list:
    return [
        {
            "question": f"Tell me about yourself and why you're interested in the {role} role.",
            "model_answer": "Start with your background, highlight relevant experience, and express enthusiasm for this specific opportunity.",
            "category": "Behavioral",
            "difficulty": "Easy",
        },
        {
            "question": "Describe a challenging project you worked on and how you overcame obstacles.",
            "model_answer": "Use the STAR method: Situation, Task, Action, Result. Be specific about the technical challenges and your solutions.",
            "category": "Behavioral",
            "difficulty": "Medium",
        },
    ]


# ─────────────────────────────────────────────────────────────────────────────
# 6. Career Chat
# ─────────────────────────────────────────────────────────────────────────────

def chat_response(message: str, context: str = "") -> str:
    """
    Return an AI response for a career-related chat message.
    """
    system_ctx = (
        "You are SkillBot, an expert AI career assistant for SkillProof AI platform. "
        "You help job seekers and internship hunters with resume advice, job search strategies, "
        "interview preparation, skill development, salary negotiation, and career planning. "
        "Be concise, practical, and encouraging. Responses should be 2-4 paragraphs max. "
        "Focus on actionable advice specific to the Indian job market when relevant."
    )
    if context:
        system_ctx += f"\n\nUser context: {context[:500]}"

    prompt = f"{system_ctx}\n\nUser question: {message}"
    try:
        return _ask(prompt)
    except Exception as exc:
        logger.error("Gemini chat_response failed: %s", exc)
        return "I'm having trouble connecting right now. Please try again in a moment."


# ─────────────────────────────────────────────────────────────────────────────
# 7. Career Roadmap Generator
# ─────────────────────────────────────────────────────────────────────────────

def generate_career_roadmap(role: str, current_skills: list) -> dict:
    """
    Generate a personalised career roadmap for a target role.

    Returns:
        {
            role: str,
            timeline_months: int,
            phases: list[{phase, duration, skills_to_learn, resources, milestones}],
            immediate_actions: list[str],
            salary_range: str
        }
    """
    skills_str = ", ".join(current_skills) if current_skills else "None specified"
    prompt = f"""
You are a senior career coach. Create a detailed career roadmap for someone targeting the role of "{role}".

Their current skills: {skills_str}

Return a JSON object:
{{
  "role": "{role}",
  "timeline_months": <realistic total months to be job-ready>,
  "phases": [
    {{
      "phase": "<Phase name e.g. Foundation>",
      "duration": "<e.g. Month 1-2>",
      "skills_to_learn": [<list of skills>],
      "resources": [<free/paid resources: courses, books, platforms>],
      "milestones": [<what to have built/achieved by end of phase>]
    }}
  ],
  "immediate_actions": [<5 things they should do THIS WEEK>],
  "salary_range": "<entry level salary range in India LPA>"
}}

Make it specific, actionable, and realistic for the Indian tech market.
Return ONLY the JSON object.
"""
    try:
        raw = _ask(prompt)
        result = _safe_json(raw)
        if not result or "phases" not in result:
            return {"role": role, "phases": [], "immediate_actions": [], "salary_range": "N/A", "timeline_months": 6}
        return result
    except Exception as exc:
        logger.error("Gemini generate_career_roadmap failed: %s", exc)
        return {"role": role, "phases": [], "immediate_actions": [], "salary_range": "N/A", "timeline_months": 6}
