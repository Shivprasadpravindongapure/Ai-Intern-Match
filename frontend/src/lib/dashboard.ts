/**
 * dashboard.ts — Dashboard Analytics API Helper Functions for SkillProof AI
 *
 * Provides typed functions for fetching aggregated candidate dashboard statistics.
 * Uses the shared API instance which auto-attaches the JWT token.
 */

import API from './api';

export interface MissingSkillItem {
  skill: string;
  count: number;
}

export interface RecentMatchItem {
  id: number;
  jobTitle: string;
  company: string;
  score: number;
  createdAt: string;
}

export interface ApplicationStats {
  total: number;
  byStatus: Record<string, number>;
}

export interface DashboardResponseData {
  totalResumes: number;
  totalJobs: number;
  totalMatches: number;
  averageMatchScore: number;
  bestRoleFit: string;
  topMissingSkills: MissingSkillItem[];
  recentMatchResults: RecentMatchItem[];
  applications: ApplicationStats;
}

/** Fetch consolidated analytics summary metrics for the logged-in user. */
export async function getDashboard(): Promise<DashboardResponseData> {
  const res = await API.get('/api/dashboard');
  return res.data;
}
