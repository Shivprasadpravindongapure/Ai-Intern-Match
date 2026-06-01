/**
 * application.ts — Application Tracker API Helper Functions for SkillProof AI
 *
 * Provides typed functions for full CRUD operations managing saved and submitted
 * job/internship applications. Uses the shared API instance with JWT headers.
 */

import API from './api';

export interface ApplicationJobData {
  id: number;
  title: string;
  company: string;
}

export interface ApplicationResponseData {
  id: number;
  job: ApplicationJobData;
  status: string;
  appliedDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationCreatePayload {
  jobId: number;
  status?: string; // defaults to 'Saved' in backend
  notes?: string;
}

export interface ApplicationUpdatePayload {
  status: string;
  appliedDate?: string | null;
  notes?: string;
}

export interface ApplicationResponse {
  message?: string;
  application: ApplicationResponseData;
}

export interface ApplicationListResponse {
  applications: ApplicationResponseData[];
}

/** Create a new job tracker entry. */
export async function createApplication(
  payload: ApplicationCreatePayload
): Promise<ApplicationResponse> {
  const res = await API.post('/api/applications', payload);
  return res.data;
}

/** Retrieve all tracked applications belonging to the logged-in user. */
export async function getApplications(): Promise<ApplicationListResponse> {
  const res = await API.get('/api/applications');
  return res.data;
}

/** Retrieve details of a specific tracked application. */
export async function getApplicationById(
  id: number
): Promise<ApplicationResponse> {
  const res = await API.get(`/api/applications/${id}`);
  return res.data;
}

/** Update the status, applied date, or notes on a tracked application. */
export async function updateApplication(
  id: number,
  payload: ApplicationUpdatePayload
): Promise<ApplicationResponse> {
  const res = await API.put(`/api/applications/${id}`, payload);
  return res.data;
}

/** Delete a tracked application record. */
export async function deleteApplication(
  id: number
): Promise<{ message: string }> {
  const res = await API.delete(`/api/applications/${id}`);
  return res.data;
}
