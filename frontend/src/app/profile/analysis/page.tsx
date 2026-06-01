'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  getLatestAnalysis,
  getProfile,
  UserProfileResponseData,
  ProfileAnalysisData,
  SuggestionItem,
  analyzeProfile,
  disconnectProfile,
} from '@/lib/profile';

export default function ProfileAnalysisPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Data states
  const [profile, setProfile] = useState<UserProfileResponseData | null>(null);
  const [analysis, setAnalysis] = useState<ProfileAnalysisData | null>(null);

  // UI status states
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Copy suggestions states
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch connection status
      const profileRes = await getProfile();
      if (profileRes.profile) {
        setProfile(profileRes.profile);
      } else {
        setProfile(null);
      }

      // Fetch latest analysis snapshot
      try {
        const analysisRes = await getLatestAnalysis();
        if (analysisRes.analysis) {
          setAnalysis(analysisRes.analysis);
        }
      } catch (err: any) {
        // If 404, there is simply no analysis snapshot run yet
        if (err.response?.status !== 404) {
          console.error('Error fetching latest analysis:', err);
        }
        setAnalysis(null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to sync profile analysis insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleReanalyze = async () => {
    setAnalyzing(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await analyzeProfile();
      setAnalysis(res.analysis);
      setSuccess('Analysis refresh completed successfully!');
      
      // Update profile lastAnalyzedAt timestamp locally
      const profRes = await getProfile();
      if (profRes.profile) {
        setProfile(profRes.profile);
      }

      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to analyze profile public repositories.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect all social platforms and wipe suggestion archives? This action cannot be undone.')) {
      return;
    }
    setDisconnecting(true);
    setError(null);
    setSuccess(null);
    try {
      await disconnectProfile();
      setProfile(null);
      setAnalysis(null);
      setSuccess('Platforms successfully disconnected and analysis history purged.');
      setTimeout(() => {
        router.push('/profile/connect');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to clear social profile connections.');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleCopySuggestion = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-[#0f172a] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <p className="text-slate-400 font-medium animate-pulse">Syncing profile insights...</p>
        </div>
      </div>
    );
  }

  // Handle case where NO profile is connected
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0f172a] bg-gradient-to-b from-[#0f172a] via-[#1e1b4b]/20 to-[#0f172a] text-white py-16 px-4">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-800/50 border border-white/5 mb-6 text-4xl shadow-xl">
            🔌
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">
            No Profiles Connected
          </h1>
          <p className="mt-4 text-slate-400 text-base max-w-md mx-auto">
            Connect your LinkedIn, GitHub, or LeetCode accounts first to let our AI scan public activities and suggest update improvements!
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/profile/connect"
              className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-bold shadow-lg transition-all hover:scale-[1.02] hover:shadow-purple-500/20"
            >
              🔗 Connect Profiles
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold transition-all hover:bg-white/10 hover:border-white/20"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Handle case where profile is connected but NO analysis has been run yet
  if (!analysis) {
    return (
      <div className="min-h-screen bg-[#0f172a] bg-gradient-to-b from-[#0f172a] via-[#1e1b4b]/20 to-[#0f172a] text-white py-16 px-4">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/10 border border-purple-500/20 mb-6 text-4xl shadow-xl animate-pulse text-purple-400">
            📊
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">
            Ready for Analysis
          </h1>
          <p className="mt-4 text-slate-400 text-base max-w-md mx-auto">
            You have successfully connected your professional profiles! Let our analysis engine fetch public details and scan your resume.
          </p>
          {error && (
            <div className="mx-auto max-w-md mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-300 text-left">
              ⚠️ {error}
            </div>
          )}
          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={handleReanalyze}
              disabled={analyzing}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-bold shadow-lg transition-all hover:scale-[1.02] hover:shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {analyzing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating suggestions...
                </>
              ) : (
                '⚡ Compile Suggestions'
              )}
            </button>
            <Link
              href="/profile/connect"
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold transition-all hover:bg-white/10 hover:border-white/20"
            >
              Edit Connect Links
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const githubData = analysis.githubData;

  // Group suggestions by priority
  const highSuggestions = analysis.suggestions.filter((s) => s.priority === 'high');
  const mediumSuggestions = analysis.suggestions.filter((s) => s.priority === 'medium');
  const lowSuggestions = analysis.suggestions.filter((s) => s.priority === 'low');

  return (
    <div className="min-h-screen bg-[#0f172a] bg-gradient-to-b from-[#0f172a] via-[#1e1b4b]/20 to-[#0f172a] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        
        {/* Alerts */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            ✔️ {success}
          </div>
        )}

        {/* Dashboard Header */}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center mb-8 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">
              Resume Suggestions & Insights
            </h1>
            <p className="mt-1 text-slate-400 text-sm">
              Actionable recommendations aligned to your connected social channels and active code repositories.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleReanalyze}
              disabled={analyzing || disconnecting}
              className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {analyzing ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Refreshing...
                </>
              ) : (
                '🔄 Refresh Engine'
              )}
            </button>
            <Link
              href="/profile/connect"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold transition-all hover:bg-white/10"
            >
              ✏️ Edit Links
            </Link>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting || analyzing}
              className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/15 disabled:opacity-50 cursor-pointer"
            >
              {disconnecting ? 'Clearing...' : '🔌 Disconnect'}
            </button>
          </div>
        </div>

        {/* Layout Split */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* LEFT PANEL: Professional summary cards */}
          <div className="space-y-8">
            
            {/* GitHub Profile Card */}
            {githubData ? (
              <div className="rounded-2xl border border-white/10 bg-[#151f32]/80 p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-purple-500/10 blur-2xl" />
                
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Connected Developer</h3>
                <div className="flex items-center gap-4 mb-5">
                  <img
                    src={`https://github.com/${githubData.username}.png`}
                    alt={githubData.name || githubData.username}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://github.com/github.png';
                    }}
                    className="h-16 w-16 rounded-full border-2 border-purple-500/20 object-cover bg-slate-900"
                  />
                  <div>
                    <h4 className="text-lg font-bold text-white leading-tight">{githubData.name || githubData.username}</h4>
                    <Link
                      href={profile.githubUrl || '#'}
                      target="_blank"
                      className="text-xs text-purple-400 hover:underline flex items-center gap-1 mt-1"
                    >
                      @{githubData.username} ↗
                    </Link>
                  </div>
                </div>

                {githubData.bio && (
                  <p className="text-xs text-slate-300 italic bg-white/2 border border-white/5 rounded-xl p-3 mb-5">
                    &quot;{githubData.bio}&quot;
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4 text-center">
                  <div className="rounded-lg bg-white/2 p-2">
                    <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Repos</span>
                    <span className="text-base font-extrabold text-white mt-0.5 block">{githubData.publicRepos}</span>
                  </div>
                  <div className="rounded-lg bg-white/2 p-2">
                    <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Followers</span>
                    <span className="text-base font-extrabold text-white mt-0.5 block">{githubData.followers}</span>
                  </div>
                  <div className="rounded-lg bg-white/2 p-2">
                    <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Following</span>
                    <span className="text-base font-extrabold text-white mt-0.5 block">{githubData.following}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#151f32]/80 p-6 backdrop-blur-xl text-center">
                <span className="text-3xl block mb-2">🐙</span>
                <h4 className="font-bold text-white text-base">GitHub Offline</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Connect your GitHub URL in profiles setup to display code stats.
                </p>
              </div>
            )}

            {/* Extracted Skills Card */}
            <div className="rounded-2xl border border-white/10 bg-[#151f32]/80 p-6 backdrop-blur-xl shadow-2xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <span>⚡</span> Scanned Skills
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Platform skills dynamically parsed from repository languages, topics, and code profiles.
              </p>

              {analysis.extractedSkills.length === 0 ? (
                <p className="text-xs text-slate-500 bg-white/2 rounded-xl p-4 text-center">No platform skills found.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.extractedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md border border-purple-500/10 bg-purple-500/5 px-2 py-0.5 text-xs text-purple-300 font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Extracted Projects Card */}
            <div className="rounded-2xl border border-white/10 bg-[#151f32]/80 p-6 backdrop-blur-xl shadow-2xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <span>📁</span> Scanned Repositories
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Public projects identified from your developer accounts.
              </p>

              {analysis.extractedProjects.length === 0 ? (
                <p className="text-xs text-slate-500 bg-white/2 rounded-xl p-4 text-center">No projects found.</p>
              ) : (
                <div className="space-y-3">
                  {analysis.extractedProjects.map((proj) => {
                    // Match detail from recentRepos if possible
                    const detail = githubData?.recentRepos.find((r) => r.name.toLowerCase() === proj.toLowerCase());
                    return (
                      <div key={proj} className="rounded-xl border border-white/5 bg-slate-900/50 p-3 hover:bg-slate-900 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-200 truncate pr-2">{proj}</span>
                          {detail?.language && (
                            <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-400">
                              {detail.language}
                            </span>
                          )}
                        </div>
                        {detail?.description && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {detail.description}
                          </p>
                        )}
                        {detail && (
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                            <span>⭐ {detail.stars} stars</span>
                            <span>🍴 {detail.forks} forks</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT PANEL: Suggestions list */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* suggestions container card */}
            <div className="rounded-2xl border border-white/10 bg-[#151f32]/60 p-6 backdrop-blur-xl shadow-2xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                <span>💡</span> ATS Suggested Adjustments
              </h2>

              {analysis.suggestions.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-white/2">
                  <span className="text-4xl" aria-hidden>🎉</span>
                  <h3 className="mt-4 font-bold text-lg text-emerald-300">Perfect Sync!</h3>
                  <p className="mt-1 text-slate-400 text-sm max-w-sm mx-auto">
                    Your resume is perfectly aligned with all social contacts, platform skills, and active repositories!
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* HIGH PRIORITY SECTION */}
                  {highSuggestions.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-red-500/20 pb-1.5 mb-3">
                        <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                        <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest">High Priority Suggestions</h4>
                      </div>
                      {highSuggestions.map((sug, idx) => (
                        <div
                          key={`high-${idx}`}
                          className="rounded-xl border border-red-500/20 bg-red-500/5 hover:border-red-500/30 p-5 transition-all duration-200 relative overflow-hidden"
                        >
                          <div className="absolute right-3 top-3 rounded bg-red-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-red-400 border border-red-500/20">
                            {sug.section}
                          </div>
                          
                          <div className="flex gap-3">
                            <span className="text-xl mt-0.5" aria-hidden>🔴</span>
                            <div className="flex-1">
                              <h5 className="font-bold text-white text-base pr-20 leading-snug">{sug.message}</h5>
                              <div className="mt-3 rounded-lg bg-slate-900/60 border border-white/5 p-3.5">
                                <span className="block text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Recommended Fix:</span>
                                <p className="text-xs text-slate-300 leading-relaxed italic">{sug.fix}</p>
                              </div>
                              <button
                                onClick={() => handleCopySuggestion(sug.fix, idx)}
                                className="mt-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                              >
                                📋 {copiedId === idx ? 'Copied to Clipboard!' : 'Copy Fix Copy'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* MEDIUM PRIORITY SECTION */}
                  {mediumSuggestions.length > 0 && (
                    <div className="space-y-3 pt-4">
                      <div className="flex items-center gap-2 border-b border-amber-500/20 pb-1.5 mb-3">
                        <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest">Medium Priority Suggestions</h4>
                      </div>
                      {mediumSuggestions.map((sug, idx) => {
                        const sugIndex = highSuggestions.length + idx;
                        return (
                          <div
                            key={`med-${idx}`}
                            className="rounded-xl border border-amber-500/20 bg-amber-500/5 hover:border-amber-500/30 p-5 transition-all duration-200 relative overflow-hidden"
                          >
                            <div className="absolute right-3 top-3 rounded bg-amber-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-400 border border-amber-500/20">
                              {sug.section}
                            </div>
                            
                            <div className="flex gap-3">
                              <span className="text-xl mt-0.5" aria-hidden>🟡</span>
                              <div className="flex-1">
                                <h5 className="font-bold text-white text-base pr-20 leading-snug">{sug.message}</h5>
                                <div className="mt-3 rounded-lg bg-slate-900/60 border border-white/5 p-3.5">
                                  <span className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Recommended Fix:</span>
                                  <p className="text-xs text-slate-300 leading-relaxed italic">{sug.fix}</p>
                                </div>
                                <button
                                  onClick={() => handleCopySuggestion(sug.fix, sugIndex)}
                                  className="mt-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                                >
                                  📋 {copiedId === sugIndex ? 'Copied to Clipboard!' : 'Copy Fix Copy'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* LOW PRIORITY SECTION */}
                  {lowSuggestions.length > 0 && (
                    <div className="space-y-3 pt-4">
                      <div className="flex items-center gap-2 border-b border-blue-500/20 pb-1.5 mb-3">
                        <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Low Priority Suggestions</h4>
                      </div>
                      {lowSuggestions.map((sug, idx) => {
                        const sugIndex = highSuggestions.length + mediumSuggestions.length + idx;
                        return (
                          <div
                            key={`low-${idx}`}
                            className="rounded-xl border border-blue-500/20 bg-blue-500/5 hover:border-blue-500/30 p-5 transition-all duration-200 relative overflow-hidden"
                          >
                            <div className="absolute right-3 top-3 rounded bg-blue-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-400 border border-blue-500/20">
                              {sug.section}
                            </div>
                            
                            <div className="flex gap-3">
                              <span className="text-xl mt-0.5" aria-hidden>🔵</span>
                              <div className="flex-1">
                                <h5 className="font-bold text-white text-base pr-20 leading-snug">{sug.message}</h5>
                                <div className="mt-3 rounded-lg bg-slate-900/60 border border-white/5 p-3.5">
                                  <span className="block text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Recommended Fix:</span>
                                  <p className="text-xs text-slate-300 leading-relaxed italic">{sug.fix}</p>
                                </div>
                                <button
                                  onClick={() => handleCopySuggestion(sug.fix, sugIndex)}
                                  className="mt-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                                >
                                  📋 {copiedId === sugIndex ? 'Copied to Clipboard!' : 'Copy Fix Copy'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
