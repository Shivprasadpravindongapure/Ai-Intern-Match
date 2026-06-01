# 🧠 SkillProof AI — AI Resume-to-Internship Matchmaking Platform

SkillProof AI is a full-stack, state-of-the-art career cockpit designed to help students and candidates optimize their resumes, discover real-time daily internship opportunities, predict role fits, and apply instantly with AI-aligned tailoring. 

The platform utilizes a hybrid matching system blending local heuristic keyword parses with deep contextual semantic text embeddings to compile highly detailed, proof-based ATS suggestions.

---

## 🚀 Key Features

SkillProof AI consists of **10 end-to-end engineered modules**:

1.  **JWT Authentication & Security**: Complete signup, login, logout, and protected route handlers isolating candidate data under custom user sessions.
2.  **PDF Resume Upload & Text Extraction**: Dynamic PDF uploading utilizing `PyPDF2` on the backend to parse raw text in real-time.
3.  **Heuristics Resume Parser**: Rule-based parsing extracting Name, Contact details, Core Skills, Work Experience, Projects, Education, and Certifications.
4.  **Job Description Manager**: Cockpit interface to paste, save, and manage targeted internship/job requirements.
5.  **Hybrid Match Score Engine**: Calculates a balanced matching index utilizing:
    *   **60% Skill Keyword Match**: Directly compares extracted skill tags.
    *   **40% Semantic Match**: Cosine similarity computed using deep learning.
6.  **Proof-Based ATS Suggestions**: Visual checklist verifying where in the resume (Work Experience or Projects) specific skills are highlighted, providing custom copywriting advice to fix gaps.
7.  **Analytics Cockpit Dashboard**: Displays total resumes, saved jobs, matches run, average match scores, predicted role matches, active application status counters, and top missing skills.
8.  **Heuristic Role Fit Forecaster**: Keyword alignment calculator predicting matching percentages across 6 core internship fields (*Backend, Frontend, Full Stack, AI/ML, Cloud, Data Engineering*).
9.  **Job Application Tracker CRUD**: Kanban board tracking active applications across pipeline columns (*Saved, Applied, Assessment, Interview, Rejected, Selected, Follow-up*).
10. **Connected Profiles & WYSIWYG AI Resume Creator [NEW]**:
    *   **Platform Connect**: Syncs LinkedIn, GitHub, and LeetCode, fetching active repositories (stars, forks, languages, topics).
    *   **WYSIWYG AI Tailoring Canvas**: An interactive virtual A4 paper-styled resume editor with borderless input textareas. Automatically tailors bullet points using strong active verbs and lights up matching keywords in real-time.
    *   **A4 Print PDF & LaTeX Export**: Direct downloads of valid LaTeX `.tex` source and high-fidelity, single-page print PDFs.
    *   **Multi-Platform discovery Crawler**: Daily job scraper crawling fresh postings from **LinkedIn**, **Indeed**, and **Naukri** with a unified **Direct Apply** drawer mapping applications directly to the tracker board.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, Axios, React Router, Print-media Stylesheets |
| **Backend** | Python FastAPI, SQLAlchemy (ORM), SQLite (Database), PyPDF2, Pydantic (Schemas) |
| **AI/ML Service** | SentenceTransformers (`all-MiniLM-L6-v2`), PyTorch, FastAPI, Cosine Similarity |
| **Database** | SQLite (real-time migrations and patched constraints) |

---

## 📡 Installation & Server Running Guide

Follow these steps to spin up the entire SkillProof AI platform stack:

### ⚙️ 1. Database & Backend Setup
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Activate the local virtual environment (`venv`):
    *   **Windows (PowerShell)**:
        ```powershell
        .\venv\Scripts\Activate.ps1
        ```
    *   **macOS / Linux**:
        ```bash
        source venv/bin/activate
        ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Run database migrations:
    ```bash
    python -m app.utils.migrate_db_v2
    ```
5.  Start the FastAPI server:
    ```bash
    python -m uvicorn app.main:app --reload --port 8000
    ```

---

### 🧠 2. Semantic Similarity AI Service
1.  Navigate to the semantic service folder:
    ```bash
    cd backend/semantic_service
    ```
2.  Activate the virtual environment.
3.  Install PyTorch and SentenceTransformers:
    ```bash
    pip install -r requirements.txt
    ```
4.  Start the microservice (will download/load the weights for `all-MiniLM-L6-v2` on CPU):
    ```bash
    python main.py --port 8001
    ```

---

### 💻 3. Next.js Frontend Client
1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install packages:
    ```bash
    npm install
    ```
3.  Start the Next.js development server:
    ```bash
    npm run dev
    ```
4.  Open your browser and visit: **[http://localhost:3000](http://localhost:3000)**

---

## 🚀 Deployment & Compilation
To verify type-safety and ensure clean prerendering across all 14 dynamic pages, run a production compilation:
```bash
cd frontend
npm run build
```
*(Compiles cleanly with 0 type errors, prerendering all static and server-rendered dynamic page traces).*
