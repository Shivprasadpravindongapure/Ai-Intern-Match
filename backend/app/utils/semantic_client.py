"""
semantic_client.py — Semantic Similarity Service Client for SkillProof AI

Communicates with the local Python semantic similarity microservice
to query textual cosine-similarity values between resume and job text.
"""

import json
import urllib.error
import urllib.request

from app.config import settings


def get_semantic_similarity(resume_text: str, job_description: str) -> float | None:
    """
    Queries the local Python sentence-transformers microservice on port 8001.

    If USE_SEMANTIC_AI is disabled in .env or the microservice is down,
    this function fails gracefully by returning None, ensuring the main match
    APIs never crash.
    """
    if not getattr(settings, "USE_SEMANTIC_AI", False):
        return None

    url = f"{settings.SEMANTIC_SERVICE_URL.rstrip('/')}/semantic-score"
    payload = {
        "resumeText": resume_text,
        "jobDescription": job_description,
    }

    try:
        # Construct Request using built-in urllib (avoids extra dependencies)
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        # Query microservice with a tight 3.0 second timeout
        with urllib.request.urlopen(req, timeout=3.0) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return float(res_data.get("semanticScore", 0))

    except Exception as e:
        print(f"[-] Semantic similarity client error: {e}")
        return None
