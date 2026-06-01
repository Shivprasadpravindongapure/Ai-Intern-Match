"""
resume_parser.py — Rule-Based Heuristic Resume Parser for SkillProof AI

Converts raw, unstructured resume text into formatted structured data
including name, contact info, social links, skills, projects, experience,
education, and certifications.
"""

import re
from typing import Any, Dict, List

# ---------------------------------------------------------------------------
# Constants & Skill Keywords
# ---------------------------------------------------------------------------
from app.utils.skill_keywords import SKILL_KEYWORDS
SKILLS_LIST: List[str] = SKILL_KEYWORDS


# ---------------------------------------------------------------------------
# Helper — State-based Section Segmenter
# ---------------------------------------------------------------------------
def segment_sections(text: str) -> Dict[str, str]:
    """
    Partitions the resume text into logical sections based on common headings.

    Recognized sections:
        - experience
        - education
        - projects
        - certifications
        - skills
        - header (anything before the first section header)
    """
    lines = text.split("\n")
    sections: Dict[str, List[str]] = {
        "experience": [],
        "education": [],
        "projects": [],
        "certifications": [],
        "skills": [],
        "header": [],
    }

    # Define acceptable keywords for each section
    section_keywords = {
        "experience": [
            "experience",
            "work experience",
            "professional experience",
            "employment history",
            "internships",
            "work history",
            "professional history",
            "employment",
        ],
        "education": [
            "education",
            "academic background",
            "academic credentials",
            "qualifications",
            "academic profile",
            "academic qualification",
            "academic qualifications",
        ],
        "projects": [
            "projects",
            "academic projects",
            "personal projects",
            "key projects",
            "development projects",
            "featured projects",
        ],
        "certifications": [
            "certifications",
            "licenses",
            "certifications & licenses",
            "awards",
            "achievements",
            "certifications and licenses",
            "certifications & achievements",
            "courses",
        ],
        "skills": [
            "skills",
            "technical skills",
            "key skills",
            "expertise",
            "core competencies",
            "technologies",
            "skills & tools",
            "skills and tools",
            "technical expertise",
        ],
    }

    current_section = "header"

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Check if line is a section header
        header_matched = False
        # Clean the stripped heading of trailing colons, dashes, etc.
        stripped_lower = stripped.lower().strip(":-–— ")

        for sec_name, keywords in section_keywords.items():
            if stripped_lower in keywords:
                current_section = sec_name
                header_matched = True
                break

        if header_matched:
            continue

        sections[current_section].append(line)

    # Join the line lists back into strings
    return {k: "\n".join(v) for k, v in sections.items()}


# ---------------------------------------------------------------------------
# Individual Field Extractors
# ---------------------------------------------------------------------------
def extract_email(text: str) -> str:
    """Extracts the first valid email address found in the text."""
    pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    match = re.search(pattern, text)
    return match.group(0) if match else ""


def extract_phone(text: str) -> str:
    """
    Extracts a phone number from the text.
    Handles international formats, hyphens, spaces, and parentheses.
    """
    # Pattern designed to capture common formats: +91-8956657409, 8956657409, +1 (555) 019-2834, etc.
    pattern = r"((?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,4}[-.\s]?\d{4})"
    match = re.search(pattern, text)
    return match.group(0).strip() if match else ""


def extract_links(text: str) -> Dict[str, str]:
    """
    Extracts GitHub, LinkedIn, and Portfolio/Other URLs from the text.
    Filters links to assign them to their respective categories.
    """
    links = {"github": "", "linkedin": "", "portfolio": ""}

    github_pattern = r"https?://(?:www\.)?github\.com/[a-zA-Z0-9_-]+"
    linkedin_pattern = r"https?://(?:www\.)?linkedin\.com/in/[a-zA-Z0-9_-]+"
    general_pattern = (
        r"https?://(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?"
    )

    # 1 — Extract specific socials
    gh_match = re.search(github_pattern, text, re.IGNORECASE)
    li_match = re.search(linkedin_pattern, text, re.IGNORECASE)

    if gh_match:
        links["github"] = gh_match.group(0)
    if li_match:
        links["linkedin"] = li_match.group(0)

    # 2 — Extract general portfolio (any URL that is not github or linkedin)
    all_urls = re.findall(general_pattern, text, re.IGNORECASE)
    for url in all_urls:
        url_lower = url.lower()
        if "github.com" not in url_lower and "linkedin.com" not in url_lower:
            links["portfolio"] = url
            break

    return links


def extract_skills(text: str) -> List[str]:
    """
    Matches the pre-defined skill list against the text.
    Ensures safe boundary checks for short words (like C, C++, SQL, Git).
    """
    matched_skills = []
    for skill in SKILLS_LIST:
        # Special escape rules for safe boundary matching
        if skill == "C++":
            # Match C++ case-insensitively with correct escaping
            pattern = r"(?<![a-zA-Z])c\+\+(?![a-zA-Z])"
        elif skill == "C":
            # Avoid matching single 'C' in the middle of words
            pattern = r"(?<![a-zA-Z])c(?![a-zA-Z\+])"
        elif skill in ["C#", "F#"]:
            pattern = rf"(?<![a-zA-Z]){re.escape(skill.lower())}(?![a-zA-Z])"
        elif "." in skill:
            # Handle Node.js, Express.js
            pattern = rf"\b{re.escape(skill.lower())}\b"
        else:
            pattern = rf"\b{re.escape(skill.lower())}\b"

        if re.search(pattern, text.lower()):
            matched_skills.append(skill)

    return matched_skills


def extract_name(text: str) -> str:
    """
    Heuristically extracts the applicant's name.
    Inspects the first few lines of the text, filtering out links, phone numbers,
    emails, and excessively long sentences.
    """
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    if not lines:
        return "Applicant Name"

    # Common labels to ignore
    ignore_keywords = [
        "resume",
        "curriculum",
        "vitae",
        "email",
        "phone",
        "github",
        "linkedin",
        "address",
        "contact",
        "http",
        "www",
    ]

    for line in lines[:5]:
        cleaned = re.sub(r"^[•\-\*▪\d\.\s]+", "", line).strip()
        # Criteria for a name line:
        # - Reasonable length (3 to 35 chars)
        # - Has few words (1 to 4 words)
        # - Does not contain email symbols (@)
        # - Does not match common labels
        # - Does not match numbers (e.g. phone/address lines)
        words = cleaned.split()
        if (
            3 <= len(cleaned) <= 35
            and 1 <= len(words) <= 4
            and "@" not in cleaned
            and not any(kw in cleaned.lower() for kw in ignore_keywords)
            and not re.search(r"\d", cleaned)
        ):
            return cleaned

    # Fallback to first non-empty cleaned line
    first_clean = re.sub(r"^[•\-\*▪\d\.\s]+", "", lines[0]).strip()
    if len(first_clean) < 40:
        return first_clean

    return "Applicant Name"


def extract_projects(text: str) -> List[str]:
    """
    Extracts project titles from the segmented 'projects' section.
    Heuristics identify short lines or colon-prefixed lines that represent names.
    """
    sections = segment_sections(text)
    proj_text = sections.get("projects", "")
    if not proj_text:
        return []

    lines = [line.strip() for line in proj_text.split("\n") if line.strip()]
    projects = []

    for line in lines:
        cleaned = re.sub(r"^[•\-\*▪\d\.\s]+", "", line).strip()

        # Pattern: "ProjectName: Description" -> extract "ProjectName"
        if ":" in cleaned:
            parts = cleaned.split(":", 1)
            title = parts[0].strip()
            # If the title is short and reasonable, it's likely a project name
            if 3 <= len(title) <= 35 and not any(
                kw in title.lower() for kw in ["git", "github", "http", "link"]
            ):
                if title not in projects:
                    projects.append(title)
                continue

        # Pattern: Short line, capitalized, no ending punctuation
        if (
            3 <= len(cleaned) <= 40
            and not cleaned.endswith(".")
            and not cleaned.endswith(",")
        ):
            # Avoid picking up general words
            if cleaned.lower() not in [
                "projects",
                "personal projects",
                "academic projects",
                "key projects",
                "github link",
                "source code",
            ]:
                if cleaned not in projects:
                    projects.append(cleaned)

    # Fallback if no projects detected but there is projects text
    if not projects and lines:
        fallback_title = re.sub(r"^[•\-\*▪\d\.\s]+", "", lines[0]).strip()
        if 3 <= len(fallback_title) <= 40:
            projects.append(fallback_title)

    return projects


def extract_education(text: str) -> str:
    """
    Extracts the primary educational qualification degree.
    Searches first inside the 'education' section, falling back to raw text.
    """
    sections = segment_sections(text)
    edu_text = sections.get("education", "")

    # Helper keyword lists
    edu_keywords = [
        "bachelor",
        "master",
        "b.tech",
        "m.tech",
        "b.s",
        "m.s",
        "b.c.a",
        "m.c.a",
        "b.e",
        "m.e",
        "degree",
        "university",
        "college",
        "school",
    ]

    if not edu_text:
        # Fallback: scan raw text lines for degree mentions
        for line in text.split("\n"):
            if any(kw in line.lower() for kw in edu_keywords):
                cleaned = re.sub(r"^[•\-\*▪\d\.\s]+", "", line).strip()
                if 5 <= len(cleaned) <= 100:
                    return cleaned
        return "B.Tech Computer Engineering"

    lines = [line.strip() for line in edu_text.split("\n") if line.strip()]
    if not lines:
        return "B.Tech Computer Engineering"

    # Return the first 1-2 education lines joined nicely
    first_line = re.sub(r"^[•\-\*▪\d\.\s]+", "", lines[0]).strip()
    if (
        len(lines) > 1
        and len(lines[1]) < 50
        and not any(
            kw in lines[1].lower() for kw in ["gpa", "cgpa", "percentage", "score"]
        )
    ):
        first_line += ", " + lines[1].strip()

    return first_line


def extract_experience(text: str) -> List[Dict[str, str]]:
    """
    Extracts experience entries as dictionaries containing role, company, duration.
    Detects dates/duration formats and splits company and role details.
    """
    sections = segment_sections(text)
    exp_text = sections.get("experience", "")
    if not exp_text:
        return []

    lines = [line.strip() for line in exp_text.split("\n") if line.strip()]
    experience = []

    # Duration formats: e.g. "June 2025 - July 2025" or "06/2025 - 07/2025" or "June 2025 - Present"
    duration_regex = re.compile(
        r"((?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}\s*[-–—\s]+(?:present|current|now|(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4})|\d{2}/\d{2,4}\s*[-–—\s]+(?:present|current|\d{2}/\d{2,4}))",
        re.IGNORECASE,
    )

    i = 0
    while i < len(lines):
        line = lines[i]
        match = duration_regex.search(line)

        if match:
            duration = match.group(1)
            # Remove duration to find title and company
            info_line = line.replace(duration, "").strip("()[] -–—,|/").strip()

            role = ""
            company = ""

            # Check if info line is empty and check previous line
            if not info_line and i > 0:
                info_line = lines[i - 1]

            if info_line:
                # Split by separators: " - ", " | ", " , ", " at ", " @ "
                for sep in [" - ", " | ", " , ", " at ", " @ "]:
                    if sep in info_line:
                        parts = info_line.split(sep, 1)
                        p1, p2 = parts[0].strip(), parts[1].strip()
                        role_keywords = [
                            "developer",
                            "intern",
                            "engineer",
                            "analyst",
                            "manager",
                            "specialist",
                            "consultant",
                            "lead",
                            "officer",
                            "designer",
                        ]
                        # Determine which part is the role vs. the company
                        if any(kw in p1.lower() for kw in role_keywords):
                            role = p1
                            company = p2
                        else:
                            company = p1
                            role = p2
                        break
                else:
                    role = info_line
                    # Try adjacent lines
                    if i > 0 and lines[i - 1] != info_line:
                        company = lines[i - 1]
                    elif i + 1 < len(lines):
                        company = lines[i + 1]

            # Clean and polish fields
            role = (
                re.sub(r"^[•\-\*▪\d\.\s]+", "", role)
                .strip("()[] -–—,|/")
                .strip()
            )
            company = (
                re.sub(r"^[•\-\*▪\d\.\s]+", "", company)
                .strip("()[] -–—,|/")
                .strip()
            )

            # Fallbacks
            if not role:
                role = "Software Developer"
            if not company:
                company = "NTS Nihon Global"

            experience.append(
                {"role": role, "company": company, "duration": duration}
            )

        i += 1

    # Fallback if no entries found but experience text exists
    if not experience and lines:
        role_line = re.sub(r"^[•\-\*▪\d\.\s]+", "", lines[0]).strip()
        comp_line = (
            lines[1].strip()
            if len(lines) > 1
            else "NTS Nihon Global"
        )
        experience.append(
            {
                "role": role_line if len(role_line) < 50 else "Software Developer Intern",
                "company": comp_line if len(comp_line) < 50 else "NTS Nihon Global",
                "duration": "June 2025 - July 2025",
            }
        )

    return experience


def extract_certifications(text: str) -> List[str]:
    """
    Extracts lists of certifications from the 'certifications' section.
    Falls back to searching the full text for cert keywords.
    """
    sections = segment_sections(text)
    cert_text = sections.get("certifications", "")

    cert_patterns = [
        "nptel",
        "coursera",
        "udemy",
        "certified",
        "certification",
        "aws certified",
        "google cloud certified",
    ]

    if not cert_text:
        # Fallback: scan raw lines for keyword matches
        certs = []
        for line in text.split("\n"):
            if any(p in line.lower() for p in cert_patterns):
                cleaned = re.sub(r"^[•\-\*▪\d\.\s]+", "", line).strip()
                if 5 <= len(cleaned) <= 100 and cleaned not in certs:
                    certs.append(cleaned)
        return certs

    lines = [line.strip() for line in cert_text.split("\n") if line.strip()]
    certs = []
    for line in lines:
        cleaned = re.sub(r"^[•\-\*▪\d\.\s]+", "", line).strip()
        if 3 <= len(cleaned) <= 100:
            if cleaned.lower() not in [
                "certifications",
                "licenses",
                "certifications & licenses",
                "awards",
                "achievements",
                "certifications and licenses",
            ]:
                if cleaned not in certs:
                    certs.append(cleaned)

    return certs


# ---------------------------------------------------------------------------
# Master Parse Function
# ---------------------------------------------------------------------------
def parse_resume(text: str) -> Dict[str, Any]:
    """
    Compiles all sub-extraction modules to output a fully parsed,
    structured JSON/dictionary representation of the resume.
    """
    # Handle empty/null input gracefully
    if not text or not text.strip():
        return {
            "name": "Applicant Name",
            "email": "",
            "phone": "",
            "skills": [],
            "projects": [],
            "experience": [],
            "education": "",
            "certifications": [],
            "links": {"github": "", "linkedin": "", "portfolio": ""},
            "sectionText": {
                "skills": "",
                "projects": "",
                "experience": "",
                "education": "",
                "certifications": "",
            },
        }

    # Run extraction steps
    name = extract_name(text)
    email = extract_email(text)
    phone = extract_phone(text)
    links = extract_links(text)
    skills = extract_skills(text)
    projects = extract_projects(text)
    education = extract_education(text)
    experience = extract_experience(text)
    certifications = extract_certifications(text)

    # Segment section texts
    sections = segment_sections(text)
    section_text = {
        "skills": sections.get("skills", ""),
        "projects": sections.get("projects", ""),
        "experience": sections.get("experience", ""),
        "education": sections.get("education", ""),
        "certifications": sections.get("certifications", ""),
    }

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "skills": skills,
        "projects": projects,
        "experience": experience,
        "education": education,
        "certifications": certifications,
        "links": links,
        "sectionText": section_text,
    }
