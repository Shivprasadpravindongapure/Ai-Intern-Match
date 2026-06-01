/**
 * resume.ts — Resume API Helper Functions for SkillProof AI
 *
 * Provides typed functions for all resume-related API calls.
 * Uses the shared API instance which auto-attaches the JWT token.
 */

import API from './api';

/* ─── Types ─── */

/** Resume data returned after a successful upload. */
export interface ResumeData {
  id: number;
  filename: string;
  extracted_text: string;
  created_at: string;
}

/** Lightweight resume entry for list views. */
export interface ResumeListItem {
  id: number;
  filename: string;
  created_at: string;
}

/** Full resume detail including file path and extracted text. */
export interface ResumeDetail {
  id: number;
  filename: string;
  file_path: string;
  extracted_text: string;
  parsed_data: ParsedResumeData | null;
  created_at: string;
}

/* ─── API Functions ─── */

/** Upload a PDF resume via multipart FormData. */
export async function uploadResume(
  file: File
): Promise<{ message: string; resume: ResumeData }> {
  const formData = new FormData();
  formData.append('resume', file);

  const res = await API.post('/api/resumes/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

/** Fetch all resumes belonging to the logged-in user. */
export async function getResumes(): Promise<{ resumes: ResumeListItem[] }> {
  const res = await API.get('/api/resumes');
  return res.data;
}

/** Fetch full details of a single resume by ID. */
export async function getResumeById(
  id: number
): Promise<{ resume: ResumeDetail }> {
  const res = await API.get(`/api/resumes/${id}`);
  return res.data;
}

/** Delete a resume by ID (removes from DB and disk). */
export async function deleteResume(
  id: number
): Promise<{ message: string }> {
  const res = await API.delete(`/api/resumes/${id}`);
  return res.data;
}

/* ─── Parsed Resume Types (Step 2) ─── */

export interface ExperienceItem {
  role: string;
  company: string;
  duration: string;
}

export interface ParsedLinks {
  github: string;
  linkedin: string;
  portfolio: string;
}

export interface ParsedResumeData {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  projects: string[];
  experience: ExperienceItem[];
  education: string;
  certifications: string[];
  links: ParsedLinks;
}

export interface ParsedResumeResponse {
  parsedResume: ParsedResumeData;
}

/* ─── Parsed Resume API Functions ─── */

/** Convert raw resume text into structured data. Cached in DB unless forceReparse = true. */
export async function parseResume(
  id: number,
  forceReparse: boolean = false
): Promise<ParsedResumeResponse> {
  const res = await API.get(`/api/resumes/${id}/parsed`, {
    params: { reparse: forceReparse },
  });
  return res.data;
}

export interface RoleFitResponseData {
  bestFit: string;
  scores: Record<string, number>;
  missingByRole: Record<string, string[]>;
}

/** Predict the best internship role fits based on resume technical keywords. */
export async function getRoleFit(
  resumeId: number
): Promise<RoleFitResponseData> {
  const res = await API.get(`/api/resumes/${resumeId}/role-fit`);
  return res.data;
}

