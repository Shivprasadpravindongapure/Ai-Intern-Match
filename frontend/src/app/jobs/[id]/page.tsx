'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getJobById, JobResponseData } from '@/lib/job';
import { getResumes, ResumeListItem } from '@/lib/resume';
import { generateMatchScore, MatchResultData } from '@/lib/match';
import { createApplication } from '@/lib/application';

/* ─── Floating Orb ─── */
function FloatingOrb({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`absolute rounded-full opacity-20 blur-3xl pointer-events-none ${className ?? ''}`}
      style={style}
      aria-hidden
    />
  );
}

/* ─── Format date ─── */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function JobDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = Number(params.id);

  // Core data states
  const [job, setJob] = useState<JobResponseData | null>(null);
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');

  // UI status states
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState('');
  const [matchResult, setMatchResult] = useState<MatchResultData | null>(null);
  
  // Tracking states
  const [isTracking, setIsTracking] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingSuccess, setTrackingSuccess] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load Job and User Resumes
  useEffect(() => {
    if (!user || isNaN(jobId)) return;

    async function loadWorkspaceData() {
      try {
        setLoading(true);
        setError('');
        // Fetch Job detail
        const jobData = await getJobById(jobId);
        setJob(jobData.job);

        // Fetch User's uploaded resumes
        const resumeData = await getResumes();
        setResumes(resumeData.resumes);
        if (resumeData.resumes.length > 0) {
          setSelectedResumeId(String(resumeData.resumes[0].id));
        }
      } catch {
        setError('Job description not found or you do not have permission.');
      } finally {
        setLoading(false);
      }
    }

    loadWorkspaceData();
  }, [user, jobId]);

  // Match handler
  async function handleMatch() {
    if (!selectedResumeId) {
      setError('Please select a resume to match.');
      return;
    }

    setMatching(true);
    setError('');
    setMatchResult(null);

    try {
      const response = await generateMatchScore({
        resumeId: Number(selectedResumeId),
        jobId: jobId,
      });
      setMatchResult(response.matchResult);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Failed to generate match score. Please try again.'
      );
    } finally {
      setMatching(false);
    }
  }

  async function handleSaveToTracker() {
    setTrackingLoading(true);
    setTrackingSuccess(null);
    try {
      await createApplication({
        jobId: jobId,
        status: 'Saved',
      });
      setIsTracking(true);
      setTrackingSuccess('Job successfully saved to your application tracker!');
      setTimeout(() => setTrackingSuccess(null), 4000);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || 'Failed to save application. Perhaps it is already tracked?'
      );
    } finally {
      setTrackingLoading(false);
    }
  }

  // Get matching status color styles
  function getScoreColor(score: number): { text: string; bg: string; border: string; glow: string } {
    if (score >= 70) {
      return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        glow: 'glow-emerald shadow-[0_0_15px_rgba(16,185,129,0.25)]',
      };
    }
    if (score >= 40) {
      return {
        text: 'text-purple-400',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        glow: 'glow-purple shadow-[0_0_15px_rgba(168,85,247,0.2)]',
      };
    }
    return {
      text: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      glow: 'glow-rose shadow-[0_0_15px_rgba(244,63,94,0.2)]',
    };
  }

  // Format Suggestions status badges
  function getStatusStyle(status: string) {
    switch (status) {
      case 'strong_match':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
      case 'partial_match':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
      case 'missing':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/20';
      case 'not_required':
        return 'bg-slate-500/15 text-slate-400 border border-slate-500/25';
      default:
        return 'bg-white/5 text-slate-300';
    }
  }

  // Loading skeleton
  if (authLoading || loading) {
    return (
      <div className="relative min-h-[calc(100vh-64px)] px-4 py-12 bg-grid-pattern">
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="mb-6">
            <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-strong rounded-2xl p-8 h-80 animate-pulse" />
            </div>
            <div className="space-y-6">
              <div className="glass-strong rounded-2xl p-6 h-60 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (error && !job) {
    return (
      <div className="relative min-h-[calc(100vh-64px)] flex items-center justify-center px-4 bg-grid-pattern">
        <div className="relative z-10 glass-strong rounded-2xl p-8 text-center max-w-md glow-blue">
          <span className="mb-4 inline-block text-5xl">😕</span>
          <h2 className="mb-2 text-xl font-bold text-white">Not Found</h2>
          <p className="mb-6 text-sm text-slate-400">{error}</p>
          <Link
            href="/jobs"
            className="btn-gradient inline-block rounded-lg px-6 py-2.5 text-sm font-semibold text-white"
          >
            Back to My Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-64px)] px-4 py-12 bg-grid-pattern overflow-hidden">
      {/* Background decoration orbs */}
      <FloatingOrb
        className="animate-float"
        style={{
          width: 350,
          height: 350,
          top: '5%',
          right: '-5%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.2), transparent 70%)',
        }}
      />
      <FloatingOrb
        className="animate-float-slow"
        style={{
          width: 300,
          height: 300,
          bottom: '5%',
          left: '-5%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.15), transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Back navigation link */}
        <Link
          href="/jobs"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to My Jobs
        </Link>

        {job && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* LEFT COLUMN: Internship Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Job Header */}
              <div className="glass-strong rounded-2xl p-6 glow-blue">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/10 text-3xl">
                    💼
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white leading-tight">{job.title}</h1>
                    <p className="text-sm font-semibold text-purple-300 mt-0.5">{job.company}</p>
                  </div>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  Saved on {formatDate(job.createdAt)}
                </div>
              </div>

              {/* Job Description Text block */}
              <div className="glass-strong rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                  Job Description
                </h3>
                <div className="max-h-[350px] overflow-y-auto rounded-xl bg-black/35 border border-white/5 p-5">
                  <p className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed font-sans">
                    {job.description}
                  </p>
                </div>
              </div>

              {/* Required Skills badge tag list */}
              <div className="glass-strong rounded-2xl p-6 glow-purple">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                  Parsed Internship Skills ({job.requiredSkills.length})
                </h3>
                {job.requiredSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {job.requiredSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 text-xs font-semibold text-purple-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No specific skills detected.</p>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Matching Panel */}
            <div className="space-y-6">
              {/* Trigger Match Dashboard Card */}
              <div className="glass-strong rounded-2xl p-6 glow-purple flex flex-col">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                  Match Workspace
                </h3>

                {/* Error Box */}
                {error && (
                  <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                    {error}
                  </div>
                )}

                {/* Select Resume controls */}
                <div className="mb-4">
                  <label htmlFor="resume-select" className="block text-xs font-semibold text-slate-300 mb-2">
                    Choose Resume to Compare
                  </label>
                  {resumes.length > 0 ? (
                    <select
                      id="resume-select"
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value)}
                      className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 cursor-pointer transition-all"
                    >
                      {resumes.map((res) => (
                        <option key={res.id} value={res.id} className="bg-slate-900 text-white">
                          📄 {res.filename}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/10 p-4 text-center bg-black/20">
                      <p className="text-xs text-slate-400 mb-3">No resumes uploaded yet.</p>
                      <Link
                        href="/upload-resume"
                        className="btn-gradient inline-block rounded-lg px-4 py-2 text-xs font-bold text-white"
                      >
                        Upload a Resume
                      </Link>
                    </div>
                  )}
                </div>

                {/* Generate CTA */}
                <button
                  onClick={handleMatch}
                  disabled={matching || resumes.length === 0}
                  className="w-full btn-gradient rounded-xl py-3 text-sm font-bold text-white shadow-lg focus:outline-none hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 transition-all duration-200"
                >
                  {matching ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Calculating Score…
                    </>
                  ) : (
                    '⚡ Generate Match Score'
                  )}
                </button>
              </div>

              {/* Match Result Quick Panel */}
              {matchResult && (
                <div className="space-y-6">
                  {/* Score Cockpit Card */}
                  <div className={`glass-strong rounded-2xl p-6 flex flex-col items-center justify-center text-center animate-fade-in ${getScoreColor(matchResult.finalScore ?? matchResult.score).glow}`}>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                      Match Score Dashboard
                    </h4>
                    
                    {/* Gauge dial */}
                    <div className="relative flex items-center justify-center h-28 w-28 mb-4">
                      {/* Ring background */}
                      <svg className="absolute w-full h-full transform -rotate-90">
                        <circle cx="56" cy="56" r="48" strokeWidth="8" stroke="rgba(255,255,255,0.05)" fill="transparent" />
                        <circle
                          cx="56"
                          cy="56"
                          r="48"
                          strokeWidth="8"
                          stroke="currentColor"
                          fill="transparent"
                          className={getScoreColor(matchResult.finalScore ?? matchResult.score).text}
                          strokeDasharray={301.6}
                          strokeDashoffset={301.6 - (301.6 * (matchResult.finalScore ?? matchResult.score)) / 100}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                        />
                      </svg>
                      <span className={`text-2xl font-black ${getScoreColor(matchResult.finalScore ?? matchResult.score).text}`}>
                        {matchResult.finalScore ?? matchResult.score}%
                      </span>
                    </div>

                    <p className="text-sm font-bold text-white mb-2">
                      {matchResult.finalScore !== null && matchResult.semanticScore !== null 
                        ? 'Weighted Combined Match' 
                        : 'Keyword Match Score'}
                    </p>

                    {/* Breakdown columns if Semantic similarity is present */}
                    {matchResult.semanticScore !== null && (
                      <div className="w-full mt-4 grid grid-cols-2 gap-2.5 border-t border-white/5 pt-4">
                        <div className="flex flex-col bg-white/2 border border-white/5 rounded-xl p-2.5">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Keyword Match</span>
                          <span className="text-sm font-extrabold text-purple-300 mt-1">{matchResult.score}%</span>
                        </div>
                        <div className="flex flex-col bg-white/2 border border-white/5 rounded-xl p-2.5">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Semantic Match</span>
                          <span className="text-sm font-extrabold text-cyan-300 mt-1">{matchResult.semanticScore}%</span>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                      Your resume has matched {matchResult.matchedSkills.length} out of {job.requiredSkills.length} direct skill keywords.
                    </p>
                  </div>

                  {/* Role Fit Prediction Block */}
                  {matchResult.roleFit && (
                    <div className="glass-strong rounded-2xl p-6 glow-cyan">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3.5">
                        Predicted Internship Fit
                      </h4>
                      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 mb-4">
                        <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">Top Alignment</span>
                        <p className="text-base font-extrabold text-white mt-0.5">
                          🎯 {matchResult.roleFit.bestFit || 'General Intern'}
                        </p>
                      </div>
                      
                      {/* Sub-scores */}
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {matchResult.roleFit.scores && Object.entries(matchResult.roleFit.scores).map(([role, rScore]) => (
                          <div key={role} className="flex justify-between items-center text-xs">
                            <span className="text-slate-300 font-medium truncate max-w-[150px]">{role.replace(' Intern', '')}</span>
                            <div className="flex items-center gap-2 grow ml-3 justify-end">
                              <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden shrink-0">
                                <div className="h-full bg-cyan-400" style={{ width: `${rScore}%` }} />
                              </div>
                              <span className="font-bold text-cyan-300 shrink-0">{rScore}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Application Tracker Panel */}
                  <div className="glass-strong rounded-2xl p-6 border border-white/5">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3.5">
                      Application Tracker
                    </h4>

                    {trackingSuccess && (
                      <div className="mb-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-400 animate-pulse">
                        {trackingSuccess}
                      </div>
                    )}

                    {isTracking ? (
                      <div className="flex flex-col items-center bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-center">
                        <span className="text-2xl mb-1">✔️</span>
                        <span className="text-xs font-bold text-indigo-300">Tracked in Pipeline</span>
                        <Link
                          href="/applications"
                          className="mt-3.5 text-xs font-bold text-white bg-indigo-600/30 border border-indigo-600/40 rounded-lg px-4 py-2 hover:bg-indigo-600/50 transition-colors w-full"
                        >
                          Open Tracker Pipeline
                        </Link>
                      </div>
                    ) : (
                      <button
                        onClick={handleSaveToTracker}
                        disabled={trackingLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {trackingLoading ? 'Saving...' : '📌 Save to Application Tracker'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BOTTOM METRICS: Match score breakdown & suggestions */}
        {matchResult && job && (
          <div className="mt-8 space-y-6 animate-fade-in">
            {/* Matched vs Missing skills block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Matched badges */}
              <div className="glass-strong rounded-2xl p-6 glow-emerald border border-emerald-500/10">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="text-emerald-400">✔️</span> Matched Skills ({matchResult.matchedSkills.length})
                </h3>
                {matchResult.matchedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {matchResult.matchedSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No skills matched.</p>
                )}
              </div>

              {/* Missing badges */}
              <div className="glass-strong rounded-2xl p-6 glow-rose border border-rose-500/10">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="text-rose-400">❌</span> Missing Skills ({matchResult.missingSkills.length})
                </h3>
                {matchResult.missingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {matchResult.missingSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-400"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-400 font-semibold italic">Amazing! Zero missing skills!</p>
                )}
              </div>
            </div>

            {/* Evidence-based Suggestions */}
            <div className="glass-strong rounded-2xl p-6 glow-purple">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                ⚡ Proof-Based ATS Suggestions
              </h3>
              
              <p className="text-xs text-slate-400 mb-6">
                Our matchmaking engine verified every corner of your resume. Review these evidence summaries to optimize your resume&apos;s ATS relevance!
              </p>

              {matchResult.suggestions && matchResult.suggestions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matchResult.suggestions.map((item, index) => (
                    <div
                      key={index}
                      className="bg-black/30 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Title & Status */}
                        <div className="flex items-center justify-between gap-3 mb-2.5">
                          <span className="text-sm font-bold text-white">{item.skill}</span>
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${getStatusStyle(item.status)}`}>
                            {item.status.replace('_', ' ')}
                          </span>
                        </div>
                        {/* Advice Msg */}
                        <p className="text-xs text-slate-300 leading-relaxed mb-4">
                          {item.message}
                        </p>
                      </div>

                      {/* Evidence checklist */}
                      <div className="border-t border-white/5 pt-3 bg-white/5 -mx-5 -mb-5 px-5 pb-4 rounded-b-xl grid grid-cols-3 gap-2">
                        <div className="flex items-center gap-1">
                          <span className={item.proof.inSkills ? 'text-emerald-400 text-xs' : 'text-slate-500 text-xs'}>
                            {item.proof.inSkills ? '✅' : '❌'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Skills</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={item.proof.inProjects ? 'text-emerald-400 text-xs' : 'text-slate-500 text-xs'}>
                            {item.proof.inProjects ? '✅' : '❌'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Projects</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={item.proof.inExperience ? 'text-emerald-400 text-xs' : 'text-slate-500 text-xs'}>
                            {item.proof.inExperience ? '✅' : '❌'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Work</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No suggestion reports compiled.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
