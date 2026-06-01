'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getDashboard, DashboardResponseData } from '@/lib/dashboard';
import { getProfile, getLatestAnalysis, UserProfileResponseData, ProfileAnalysisData } from '@/lib/profile';


export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Connected profile states
  const [profile, setProfile] = useState<UserProfileResponseData | null>(null);
  const [analysis, setAnalysis] = useState<ProfileAnalysisData | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchDashboardAndProfile() {
      try {
        setLoading(true);
        const data = await getDashboard();
        setDashboardData(data);

        // Fetch connected social profiles and latest suggestions
        try {
          const profRes = await getProfile();
          if (profRes.profile) {
            setProfile(profRes.profile);
            
            try {
              const anRes = await getLatestAnalysis();
              if (anRes.analysis) {
                setAnalysis(anRes.analysis);
              }
            } catch (err) {
              // No analysis history exists yet
            }
          }
        } catch (err) {
          console.error('Error fetching profiles in dashboard:', err);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.detail || 'Failed to fetch dashboard statistics.');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchDashboardAndProfile();
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-[#0f172a] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <p className="text-slate-400 font-medium animate-pulse">Assembling your cockpit...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-white bg-[#0f172a]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 backdrop-blur-xl">
          <span className="text-4xl" aria-hidden>⚠️</span>
          <h2 className="mt-4 text-xl font-semibold text-red-300">Dashboard Error</h2>
          <p className="mt-2 text-slate-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 px-6 py-2.5 font-medium text-white transition-all hover:brightness-110"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const data = dashboardData || {
    totalResumes: 0,
    totalJobs: 0,
    totalMatches: 0,
    averageMatchScore: 0,
    bestRoleFit: 'No Resume Found',
    topMissingSkills: [],
    recentMatchResults: [],
    applications: { total: 0, byStatus: {} },
  };

  const statusColors: Record<string, string> = {
    'Saved': 'bg-slate-500/20 border-slate-500/30 text-slate-300',
    'Applied': 'bg-blue-500/20 border-blue-500/30 text-blue-300',
    'Assessment': 'bg-amber-500/20 border-amber-500/30 text-amber-300',
    'Interview': 'bg-purple-500/20 border-purple-500/30 text-purple-300',
    'Rejected': 'bg-rose-500/20 border-rose-500/30 text-rose-300',
    'Selected': 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
    'Follow-up': 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300',
  };

  const statusIcons: Record<string, string> = {
    'Saved': '📌',
    'Applied': '🚀',
    'Assessment': '📝',
    'Interview': '💬',
    'Rejected': '❌',
    'Selected': '🎉',
    'Follow-up': '📞',
  };

  const statuses = ['Saved', 'Applied', 'Assessment', 'Interview', 'Rejected', 'Selected', 'Follow-up'];

  return (
    <div className="min-h-screen bg-[#0f172a] bg-gradient-to-b from-[#0f172a] via-[#1e1b4b]/20 to-[#0f172a] text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">
              Analytics Cockpit
            </h1>
            <p className="mt-1 text-slate-400">
              Real-time insights on your resume strengths, job match scores, and application pipeline.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/upload-resume"
              className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20 cursor-pointer"
            >
              📤 Upload Resume
            </Link>
            <Link
              href="/jobs/new"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold transition-all hover:bg-white/10 hover:border-white/20 cursor-pointer"
            >
              💼 Add Job Description
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          {/* Card 1: Total Resumes */}
          <div className="rounded-xl border border-white/10 bg-[#1e293b]/40 p-5 backdrop-blur-xl transition-all duration-300 hover:border-white/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Resumes</span>
              <span className="text-xl" aria-hidden>📄</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{data.totalResumes}</p>
            <Link href="/resumes" className="mt-2 block text-xs text-purple-400 hover:text-purple-300 hover:underline">
              View Resumes &rarr;
            </Link>
          </div>

          {/* Card 2: Total Jobs */}
          <div className="rounded-xl border border-white/10 bg-[#1e293b]/40 p-5 backdrop-blur-xl transition-all duration-300 hover:border-white/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Saved Jobs</span>
              <span className="text-xl" aria-hidden>💼</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{data.totalJobs}</p>
            <Link href="/jobs" className="mt-2 block text-xs text-blue-400 hover:text-blue-300 hover:underline">
              View Jobs &rarr;
            </Link>
          </div>

          {/* Card 3: Matches Made */}
          <div className="rounded-xl border border-white/10 bg-[#1e293b]/40 p-5 backdrop-blur-xl transition-all duration-300 hover:border-white/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Matches Run</span>
              <span className="text-xl" aria-hidden>⚔️</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{data.totalMatches}</p>
            <p className="mt-2 text-xs text-slate-500">Cross-reference logs</p>
          </div>

          {/* Card 4: Avg Score */}
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#1e293b]/40 p-5 backdrop-blur-xl transition-all duration-300 hover:border-white/20">
            <div className="absolute right-0 top-0 h-16 w-16 -translate-y-2 translate-x-2 rounded-full bg-purple-500/10 blur-xl" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Avg Match</span>
              <span className="text-xl" aria-hidden>🔥</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <p className="text-3xl font-bold text-purple-300">{data.averageMatchScore}</p>
              <span className="text-sm font-semibold text-purple-400">%</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">Across all roles</p>
          </div>

          {/* Card 5: Best Role Fit */}
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#1e293b]/40 p-5 backdrop-blur-xl transition-all duration-300 hover:border-white/20">
            <div className="absolute right-0 top-0 h-16 w-16 -translate-y-2 translate-x-2 rounded-full bg-cyan-500/10 blur-xl" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Best Role Fit</span>
              <span className="text-xl" aria-hidden>🎯</span>
            </div>
            <p className="mt-2 text-lg font-bold text-cyan-300 truncate" title={data.bestRoleFit}>
              {data.bestRoleFit}
            </p>
            <p className="mt-2 text-xs text-slate-500">Heuristic keyword fit</p>
          </div>
        </div>

        {/* Core Layout Split */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* Main Column (2/3 width): Applications Tracker and Recent Matches */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Widget 1: Applications Pipeline Status tracker */}
            <div className="rounded-2xl border border-white/10 bg-[#151f32]/60 p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>📌</span> Applications Pipeline
                  </h2>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Your current status logs mapped across the application pipeline.
                  </p>
                </div>
                <Link
                  href="/applications"
                  className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Manage Tracker &rarr;
                </Link>
              </div>

              {/* Status Columns Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {statuses.map((status) => {
                  const count = data.applications.byStatus[status] || 0;
                  return (
                    <div
                      key={status}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 hover:scale-[1.03] ${
                        count > 0
                          ? statusColors[status]
                          : 'bg-white/5 border-white/5 text-slate-500'
                      }`}
                    >
                      <span className="text-xl mb-1">{statusIcons[status]}</span>
                      <span className="text-xs font-semibold text-center truncate w-full">{status}</span>
                      <span className="mt-1.5 text-lg font-extrabold">{count}</span>
                    </div>
                  );
                })}
              </div>

              {data.applications.total === 0 && (
                <div className="mt-6 text-center border border-dashed border-white/10 rounded-xl p-6 bg-white/2">
                  <p className="text-slate-400 text-sm">You haven&apos;t tracked any applications yet!</p>
                  <p className="text-xs text-slate-500 mt-1">Generate a match score and hit &quot;Save to Tracker&quot; on any job detail view.</p>
                </div>
              )}
            </div>

            {/* Widget 2: Recent Matches Timeline */}
            <div className="rounded-2xl border border-white/10 bg-[#151f32]/60 p-6 backdrop-blur-xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                <span>⚔️</span> Recent Match Results
              </h2>

              {data.recentMatchResults.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-white/10 rounded-xl bg-white/2">
                  <p className="text-slate-400 text-sm">No match analyses found.</p>
                  <p className="text-xs text-slate-500 mt-1">Select a job from your dashboard and evaluate your resume match score!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.recentMatchResults.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/10 transition-all duration-200"
                    >
                      <div className="flex flex-col pr-4">
                        <span className="font-bold text-white text-base truncate">{match.jobTitle}</span>
                        <span className="text-slate-400 text-xs mt-0.5">{match.company}</span>
                        <span className="text-[10px] text-slate-500 mt-2">
                          Evaluated on {new Date(match.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      {/* Score Badge */}
                      <div className="flex flex-col items-end shrink-0">
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-2xl font-black text-purple-400">{match.score}</span>
                          <span className="text-xs font-semibold text-purple-500">%</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-1">ATS MATCH</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Sidebar Column (1/3 width): Top Missing Skills, Pipeline Overview */}
          <div className="space-y-8">
            
            {/* Widget: Social Sync & AI Suggestions */}
            <div className="rounded-2xl border border-white/10 bg-[#151f32]/60 p-6 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-purple-500/5 blur-xl" />
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                <span>⚡</span> Social Sync & Insights
              </h2>
              <p className="text-xs text-slate-400 mb-5">
                Scan your public active platforms and fetch resume update recommendations.
              </p>

              {profile ? (
                <div className="space-y-4">
                  {/* Connection badges */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {profile.linkedinUrl ? (
                      <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 font-semibold">
                        💼 LinkedIn Connected
                      </span>
                    ) : (
                      <span className="rounded bg-white/5 border border-white/5 px-2 py-0.5 text-[10px] text-slate-500 font-semibold">
                        💼 LinkedIn Linked
                      </span>
                    )}

                    {profile.githubUrl ? (
                      <span className="rounded bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300 font-semibold">
                        🐙 GitHub Connected
                      </span>
                    ) : (
                      <span className="rounded bg-white/5 border border-white/5 px-2 py-0.5 text-[10px] text-slate-500 font-semibold">
                        🐙 GitHub Linked
                      </span>
                    )}

                    {profile.leetcodeUrl ? (
                      <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300 font-semibold">
                        📝 LeetCode Connected
                      </span>
                    ) : (
                      <span className="rounded bg-white/5 border border-white/5 px-2 py-0.5 text-[10px] text-slate-500 font-semibold">
                        📝 LeetCode Linked
                      </span>
                    )}
                  </div>

                  {/* Suggestions Stats */}
                  <div className="rounded-xl border border-white/5 bg-slate-900/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">ATS Suggestions:</span>
                      {analysis ? (
                        <span className="text-sm font-extrabold text-purple-400">
                          {analysis.suggestions.length} Improvements
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 italic">No analysis run</span>
                      )}
                    </div>

                    {profile.lastAnalyzedAt && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                        <span className="text-[10px] text-slate-500">Last scanned:</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(profile.lastAnalyzedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    {analysis ? (
                      <Link
                        href="/profile/analysis"
                        className="w-full text-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.01]"
                      >
                        📊 View Suggestions &rarr;
                      </Link>
                    ) : (
                      <Link
                        href="/profile/connect"
                        className="w-full text-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.01]"
                      >
                        ⚡ Compile Suggestions &rarr;
                      </Link>
                    )}

                    <Link
                      href="/profile/connect"
                      className="w-full text-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                    >
                      🔗 Manage Social Accounts
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/2 p-5 text-center">
                  <p className="text-slate-400 text-xs">No social channels synced yet!</p>
                  <p className="text-[10px] text-slate-500 mt-1 mb-4">Link GitHub to automatically fetch active projects and languages.</p>
                  <Link
                    href="/profile/connect"
                    className="inline-block rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-purple-500 transition-colors"
                  >
                    🔌 Sync Accounts
                  </Link>
                </div>
              )}
            </div>

            {/* Widget 3: Top Missing Skills tags */}
            <div className="rounded-2xl border border-white/10 bg-[#151f32]/60 p-6 backdrop-blur-xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                <span>🎯</span> Skill Gaps Tracker
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Most frequent required skills missing from your uploaded resumes across matchmaking analyses.
              </p>

              {data.topMissingSkills.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-white/10 rounded-xl bg-white/2">
                  <p className="text-slate-400 text-sm">No skill gaps identified yet.</p>
                  <p className="text-xs text-slate-500 mt-1">Run resume-to-job matching analyses to compile missing skill statistics!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.topMissingSkills.map((item, idx) => {
                    const progressPercentage = Math.min(100, Math.round((item.count / data.totalMatches) * 100));
                    return (
                      <div key={item.skill} className="flex flex-col">
                        <div className="flex justify-between items-center text-sm font-semibold mb-1">
                          <span className="text-slate-300 font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-xs">
                            {item.skill}
                          </span>
                          <span className="text-xs text-slate-400">
                            Missing in <strong className="text-purple-400">{item.count}</strong> matches
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Widget 4: Tips card */}
            <div className="relative overflow-hidden rounded-2xl border border-indigo-500/10 bg-gradient-to-br from-[#1e1b4b]/40 to-[#0f172a] p-6 backdrop-blur-xl">
              <div className="absolute right-0 bottom-0 h-24 w-24 translate-y-6 translate-x-6 rounded-full bg-indigo-500/10 blur-2xl" />
              <h3 className="text-lg font-bold text-indigo-300 flex items-center gap-1.5 mb-2">
                <span>💡</span> ATS Action Tips
              </h3>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex gap-2">
                  <span className="text-purple-400 font-bold shrink-0">1.</span>
                  <span>Analyze your **predicted role fits** in the Resume page to align details with target positions.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-400 font-bold shrink-0">2.</span>
                  <span>Leverage the **proof checklist** to see exactly where project and work descriptions need skill updates.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-400 font-bold shrink-0">3.</span>
                  <span>Activate **Semantic Similarity AI** on matchmaking to perform deep contextual text evaluation!</span>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
