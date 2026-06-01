/**
 * match.ts — Matchmaking API Helper Functions for SkillProof AI
 *
 * Provides typed functions for all matchmaking-related API calls.
 * Uses the shared API instance which auto-attaches the JWT token.
 */

import API from './api';

/* ─── TypeScript Interfaces ─── */

export interface MatchRequestPayload {
  resumeId: number;
  jobId: number;
}

export interface ProofDetails {
  inSkills: boolean;
  inProjects: boolean;
  inExperience: boolean;
  requiredByJob: boolean;
}

export interface SuggestionItem {
  skill: string;
  status: 'strong_match' | 'partial_match' | 'missing' | 'not_required';
  message: string;
  proof: ProofDetails;
}

export interface MatchResultData {
  id: number;
  resumeId: number;
  jobId: number;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  suggestions: SuggestionItem[];
  roleFit?: {
    bestFit: string;
    scores: Record<string, number>;
    missingByRole: Record<string, string[]>;
  } | null;
  semanticScore?: number | null;
  finalScore?: number | null;
  createdAt: string;
}

export interface MatchResponse {
  message: string;
  matchResult: MatchResultData;
}

/* ─── API Service Functions ─── */

/** Generate a matching score and evidence-backed ATS suggestions. */
export async function generateMatchScore(
  payload: MatchRequestPayload
): Promise<MatchResponse> {
  const res = await API.post('/api/match', payload);
  return res.data;
}
