/**
 * job.ts — Job API Helper Functions for SkillProof AI
 *
 * Provides typed functions for all job-related API calls.
 * Uses the shared API instance which auto-attaches the JWT token.
 */

import API from './api';

/* ─── TypeScript Interfaces ─── */

export interface JobCreatePayload {
  title: string;
  company: string;
  description: string;
}

export interface JobResponseData {
  id: number;
  title: string;
  company: string;
  description: string;
  requiredSkills: string[];
  createdAt: string;
}

export interface JobResponse {
  message?: string;
  job: JobResponseData;
}

export interface JobListResponse {
  jobs: JobResponseData[];
}

/* ─── API Service Functions ─── */

/** Paste and save a new job/internship description description. */
export async function createJob(payload: JobCreatePayload): Promise<JobResponse> {
  const res = await API.post('/api/jobs', payload);
  return res.data;
}

/** Retrieve all job descriptions saved by the user. */
export async function getJobs(): Promise<JobListResponse> {
  const res = await API.get('/api/jobs');
  return res.data;
}

/** Fetch full details of a specific saved job description. */
export async function getJobById(id: number): Promise<JobResponse> {
  const res = await API.get(`/api/jobs/${id}`);
  return res.data;
}

/** Delete a saved job description by ID. */
export async function deleteJob(id: number): Promise<{ message: string }> {
  const res = await API.delete(`/api/jobs/${id}`);
  return res.data;
}
