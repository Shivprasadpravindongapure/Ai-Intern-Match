/**
 * profile.ts — Connected Profiles API Helper Functions for SkillProof AI
 *
 * Provides typed Axios fetch triggers managing portfolio/platform connections
 * and retrieving heuristic resume update suggestions.
 */

import API from './api';

export interface UserProfileResponseData {
  linkedinUrl: string | null;
  githubUrl: string | null;
  githubUsername: string | null;
  leetcodeUrl: string | null;
  leetcodeUsername: string | null;
  portfolioUrl: string | null;
  codechefUrl: string | null;
  codechefUsername: string | null;
  hackerrankUrl: string | null;
  hackerrankUsername: string | null;
  lastAnalyzedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileResponse {
  message: string;
  profile: UserProfileResponseData;
}

export interface ConnectedProfilePayload {
  linkedinUrl?: string;
  githubUrl?: string;
  leetcodeUrl?: string;
  portfolioUrl?: string;
  codechefUrl?: string;
  hackerrankUrl?: string;
}

export interface RecentRepoItem {
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  updatedAt: string | null;
  htmlUrl: string;
  topics: string[];
}

export interface GitHubDataSchema {
  username: string;
  name: string;
  bio: string;
  publicRepos: number;
  followers: number;
  following: number;
  recentRepos: RecentRepoItem[];
}

export interface SuggestionItem {
  type: string;
  priority: 'high' | 'medium' | 'low';
  message: string;
  fix: string;
  section: string;
}

export interface ProfileAnalysisData {
  id: number;
  createdAt: string;
  githubData: GitHubDataSchema | null;
  leetcodeData: Record<string, any> | null;
  extractedSkills: string[];
  extractedProjects: string[];
  suggestions: SuggestionItem[];
}

export interface ProfileAnalysisResponse {
  message?: string;
  analysis: ProfileAnalysisData;
}

export interface ProfileAnalysisHistoryResponse {
  history: ProfileAnalysisData[];
}

/** Connect or update social profile URLs. */
export async function saveProfile(
  payload: ConnectedProfilePayload
): Promise<UserProfileResponse> {
  const res = await API.post('/api/profile', payload);
  return res.data;
}

/** Retrieve currently connected social profile links. */
export async function getProfile(): Promise<{ profile: UserProfileResponseData | null }> {
  const res = await API.get('/api/profile');
  return res.data;
}

/** Run public API fetches and generate resume update suggestions. */
export async function analyzeProfile(): Promise<ProfileAnalysisResponse> {
  const res = await API.post('/api/profile/analyze');
  return res.data;
}

/** Retrieve the most recent suggestions snapshot. */
export async function getLatestAnalysis(): Promise<ProfileAnalysisResponse> {
  const res = await API.get('/api/profile/analysis/latest');
  return res.data;
}

/** Retrieve previous snapshots history list. */
export async function getAnalysisHistory(): Promise<ProfileAnalysisHistoryResponse> {
  const res = await API.get('/api/profile/analysis/history');
  return res.data;
}

/** Disconnect all links and clear suggestions archives. */
export async function disconnectProfile(): Promise<{ message: string }> {
  const res = await API.delete('/api/profile');
  return res.data;
}
