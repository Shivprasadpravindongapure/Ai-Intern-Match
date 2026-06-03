"""
main.py — Semantic Similarity microservice for SkillProof AI

Exposes a local FastAPI endpoint on port 8001 that calculates the cosine similarity
between two text fields using SentenceTransformers vector embeddings.
"""

import os
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# ---------------------------------------------------------------------------
# FastAPI app instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SkillProof AI Semantic Similarity Microservice",
    description="Calculates semantic vector similarity between resumes and job details.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# Global model loader
# Caches the SentenceTransformer model in memory for sub-millisecond scoring
# ---------------------------------------------------------------------------
MODEL_NAME = "all-MiniLM-L6-v2"
print(f"[+] Loading SentenceTransformer model '{MODEL_NAME}'...")
model = SentenceTransformer(MODEL_NAME)
print("[+] Model loaded successfully and cached!")

# ---------------------------------------------------------------------------
# Input Pydantic Schema
# ---------------------------------------------------------------------------
class SemanticRequest(BaseModel):
    resumeText: str
    jobDescription: str


# ---------------------------------------------------------------------------
# POST /semantic-score
# ---------------------------------------------------------------------------
@app.post("/semantic-score", summary="Calculate textual cosine similarity")
async def calculate_semantic_score(payload: SemanticRequest) -> dict:
    """
    Computes vector cosine similarity between the resume text and job details.
    
    Returns:
        A dictionary containing the parsed similarity score mapped to 0-100 range.
    """
    if not payload.resumeText.strip() or not payload.jobDescription.strip():
        return {"semanticScore": 0}

    try:
        # 1 — Compute embeddings
        embeddings = model.encode(
            [payload.resumeText, payload.jobDescription],
            show_progress_bar=False
        )

        # 2 — Calculate cosine similarity
        similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]

        # 3 — Convert similarity range from [-1, 1] to [0, 100]
        # Clip or normalise bounds safely
        normalized_score = max(0, min(100, int(round(similarity * 100))))

        return {"semanticScore": normalized_score}

    except Exception as e:
        print(f"[-] Similarity calculation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate similarity: {str(e)}"
        )


if __name__ == "__main__":
    # Standard default execution on port 8001
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
