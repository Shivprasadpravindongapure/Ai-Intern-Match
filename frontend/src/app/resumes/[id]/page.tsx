'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  getResumeById,
  deleteResume,
  parseResume,
  getRoleFit,
  ResumeDetail,
  ParsedResumeData,
  RoleFitResponseData,
} from '@/lib/resume';

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
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ─── Page ─── */
export default function ResumeDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const resumeId = Number(params.id);

  const [resume, setResume] = useState<ResumeDetail | null>(null);
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'parsed' | 'raw'>('raw');

  // Role fit states
  const [roleFit, setRoleFit] = useState<RoleFitResponseData | null>(null);
  const [predicting, setPredicting] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch resume detail
  useEffect(() => {
    if (!user || isNaN(resumeId)) return;

    async function fetchResume() {
      try {
        setLoading(true);
        const data = await getResumeById(resumeId);
        setResume(data.resume);
        if (data.resume.parsed_data) {
          setParsedData(data.resume.parsed_data);
          setActiveTab('parsed');
        }
      } catch {
        setError('Resume not found or you do not have access.');
      } finally {
        setLoading(false);
      }
    }

    fetchResume();
  }, [user, resumeId]);

  // Delete handler
  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this resume? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await deleteResume(resumeId);
      router.push('/resumes');
    } catch {
      setError('Failed to delete resume.');
      setDeleting(false);
    }
  }

  // Parse handler
  async function handleParse(forceReparse: boolean = false) {
    if (parsing) return;
    setParsing(true);
    setError('');
    try {
      const response = await parseResume(resumeId, forceReparse);
      setParsedData(response.parsedResume);
      setActiveTab('parsed');
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Failed to parse resume. Please try again.'
      );
    } finally {
      setParsing(false);
    }
  }

  async function handlePredictRoleFit() {
    setPredicting(true);
    setError('');
    try {
      const data = await getRoleFit(resumeId);
      setRoleFit(data);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || 'Failed to predict role alignment.'
      );
    } finally {
      setPredicting(false);
    }
  }

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="relative min-h-[calc(100vh-64px)] px-4 py-12 bg-grid-pattern">
        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="mb-6">
            <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
          </div>
          <div className="glass-strong rounded-2xl p-8 animate-pulse">
            <div className="h-8 w-2/3 rounded bg-white/10 mb-4" />
            <div className="h-4 w-1/3 rounded bg-white/5 mb-8" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-4 w-full rounded bg-white/5" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Error state
  if (error && !resume) {
    return (
      <div className="relative min-h-[calc(100vh-64px)] flex items-center justify-center px-4 bg-grid-pattern">
        <div className="relative z-10 glass-strong rounded-2xl p-8 text-center max-w-md glow-blue">
          <span className="mb-4 inline-block text-5xl">😕</span>
          <h2 className="mb-2 text-xl font-semibold text-white">Not Found</h2>
          <p className="mb-6 text-sm text-slate-400">{error}</p>
          <Link
            href="/resumes"
            className="btn-gradient inline-block rounded-lg px-6 py-2.5 text-sm font-semibold text-white"
          >
            Back to My Resumes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-64px)] px-4 py-12 bg-grid-pattern">
      {/* Floating orbs */}
      <FloatingOrb
        className="animate-float"
        style={{
          width: 350,
          height: 350,
          top: '8%',
          right: '-6%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.25), transparent 70%)',
        }}
      />
      <FloatingOrb
        className="animate-float-slow"
        style={{
          width: 300,
          height: 300,
          bottom: '10%',
          left: '-5%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.2), transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Back button */}
        <Link
          href="/resumes"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to My Resumes
        </Link>

        {resume && (
          <>
            {/* Resume Header Card */}
            <div className="glass-strong rounded-2xl p-6 mb-6 glow-purple">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/10 text-3xl">
                    📄
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white leading-tight">{resume.filename}</h1>
                    <p className="text-sm text-slate-400 mt-1">
                      Uploaded on {formatDate(resume.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Parse / Re-parse Button */}
                  {parsedData ? (
                    <button
                      onClick={() => handleParse(true)}
                      disabled={parsing}
                      className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-300 transition-all duration-200 hover:bg-purple-500/20 hover:border-purple-500/30 disabled:opacity-50 cursor-pointer"
                    >
                      {parsing ? 'Parsing…' : 'Re-parse Resume'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleParse(false)}
                      disabled={parsing}
                      className="btn-gradient rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                    >
                      {parsing ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Parsing…
                        </>
                      ) : (
                        'Parse Resume'
                      )}
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-all duration-200 hover:bg-red-500/20 hover:border-red-500/30 disabled:opacity-50 cursor-pointer"
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 text-center">
                {error}
              </div>
            )}

            {/* Tab Navigation if parsed data exists */}
            {parsedData && (
              <div className="mb-6 flex border-b border-white/10">
                <button
                  onClick={() => setActiveTab('parsed')}
                  className={`px-6 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'parsed'
                      ? 'border-purple-500 text-white font-semibold'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  ⚡ Parsed Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('raw')}
                  className={`px-6 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'raw'
                      ? 'border-purple-500 text-white font-semibold'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  📝 Raw Text Preview
                </button>
              </div>
            )}

            {/* TAB CONTENT: Raw Extracted Text */}
            {(!parsedData || activeTab === 'raw') && (
              <div className="glass-strong rounded-2xl p-6 glow-blue">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  📝 Extracted Text
                </h2>
                <div className="max-h-[600px] overflow-y-auto rounded-lg bg-black/30 border border-white/10 p-5">
                  <pre className="whitespace-pre-wrap text-sm text-slate-300 font-mono leading-relaxed">
                    {resume.extracted_text || 'No text could be extracted from this PDF.'}
                  </pre>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Parsed Structured Data Dashboard */}
            {parsedData && activeTab === 'parsed' && (
              <div className="space-y-6">
                
                {/* 0 — Role Fit Forecast cockpit */}
                <div className="glass-strong rounded-2xl p-6 glow-cyan border border-cyan-500/10">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>🎯</span> Internship Role Alignment Forecast
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Our heuristic engine evaluates technical keywords across skills, projects, and experience blocks to predict alignment scores for six standard internship categories.
                      </p>
                    </div>
                  </div>

                  {!roleFit ? (
                    <div className="flex flex-col items-center justify-center p-6 bg-slate-900/35 border border-white/5 rounded-xl text-center">
                      <p className="text-sm text-slate-300 mb-4">Discover your optimal internship profiles and identify missing study gaps.</p>
                      <button
                        onClick={handlePredictRoleFit}
                        disabled={predicting}
                        className="btn-gradient rounded-xl px-6 py-3 text-xs font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {predicting ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Forecasting alignment...
                          </>
                        ) : (
                          '⚡ Forecast Internship Alignment'
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Top Predicted Best Fit */}
                      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <span className="text-[10px] text-cyan-400 uppercase font-black tracking-widest">Predicted Target Profile</span>
                          <h4 className="text-xl font-black text-white mt-1">
                            🚀 {roleFit.bestFit}
                          </h4>
                        </div>
                        <span className="text-xs font-bold text-slate-300 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full shrink-0">
                          Heuristic Forecast Active
                        </span>
                      </div>

                      {/* Six Roles Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(roleFit.scores).map(([role, score]) => {
                          const missing = roleFit.missingByRole[role] || [];
                          return (
                            <div key={role} className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors">
                              <div>
                                <div className="flex justify-between items-center text-sm font-semibold mb-2">
                                  <span className="text-white font-bold">{role}</span>
                                  <span className="text-cyan-400 font-extrabold text-sm">{score}%</span>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-4">
                                  <div className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500" style={{ width: `${score}%` }} />
                                </div>
                              </div>

                              {/* Gaps List */}
                              <div className="border-t border-white/5 pt-3 mt-1.5">
                                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2">Technical Gaps</span>
                                {missing.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {missing.map((sk) => (
                                      <span key={sk} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300">
                                        -{sk}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                    <span>✔️</span> 100% Competency Matches!
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 1 — Basic Info Header Panel */}
                <div className="glass-strong rounded-2xl p-6 glow-purple grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      {parsedData.name || 'Applicant Name'}
                    </h2>
                    <p className="text-purple-300 font-medium text-sm mt-1 flex items-center gap-1.5">
                      🎓 {parsedData.education || 'B.Tech Computer Engineering'}
                    </p>
                    <div className="mt-4 space-y-2">
                      {parsedData.email && (
                        <p className="text-sm text-slate-300 flex items-center gap-2">
                          <span className="text-purple-400">✉</span> {parsedData.email}
                        </p>
                      )}
                      {parsedData.phone && (
                        <p className="text-sm text-slate-300 flex items-center gap-2">
                          <span className="text-purple-400">📞</span> {parsedData.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Links / Socials */}
                  <div className="flex flex-col justify-center space-y-3 bg-white/5 rounded-xl border border-white/5 p-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Links & Socials
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {parsedData.links?.linkedin ? (
                        <a
                          href={parsedData.links.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
                        >
                          <span className="text-blue-400">🔗</span> LinkedIn
                        </a>
                      ) : (
                        <span className="text-sm text-slate-500">LinkedIn: Not specified</span>
                      )}

                      {parsedData.links?.github ? (
                        <a
                          href={parsedData.links.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
                        >
                          <span className="text-slate-400">🐙</span> GitHub
                        </a>
                      ) : (
                        <span className="text-sm text-slate-500">GitHub: Not specified</span>
                      )}

                      {parsedData.links?.portfolio ? (
                        <a
                          href={parsedData.links.portfolio}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
                        >
                          <span className="text-teal-400">💼</span> Portfolio / Website
                        </a>
                      ) : (
                        <span className="text-sm text-slate-500">Portfolio: Not specified</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2 — Skills Badges */}
                <div className="glass-strong rounded-2xl p-6 glow-blue">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    🛠️ Technical Skills
                  </h3>
                  {parsedData.skills && parsedData.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {parsedData.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 text-xs font-semibold text-purple-300 transition-all hover:bg-purple-500/20"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No skill keywords detected.</p>
                  )}
                </div>

                {/* 3 — Experience Timeline */}
                <div className="glass-strong rounded-2xl p-6 glow-purple">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    💼 Work & Internship Experience
                  </h3>
                  {parsedData.experience && parsedData.experience.length > 0 ? (
                    <div className="space-y-6 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
                      {parsedData.experience.map((exp, index) => (
                        <div key={index} className="relative pl-8">
                          {/* Timeline dot */}
                          <div className="absolute left-[9px] top-1.5 h-3.5 w-3.5 rounded-full border border-purple-400 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                          <div>
                            <h4 className="text-sm font-semibold text-white">{exp.role}</h4>
                            <p className="text-xs text-purple-300 mt-0.5">{exp.company}</p>
                            <span className="inline-block mt-2 rounded bg-white/5 border border-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                              📅 {exp.duration}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No experience blocks parsed.</p>
                  )}
                </div>

                {/* 4 — Projects & Certifications Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Projects */}
                  <div className="glass-strong rounded-2xl p-6 glow-blue flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      🚀 Key Projects
                    </h3>
                    {parsedData.projects && parsedData.projects.length > 0 ? (
                      <ul className="space-y-3 flex-grow">
                        {parsedData.projects.map((proj, index) => (
                          <li
                            key={index}
                            className="bg-white/5 border border-white/5 p-3 rounded-lg flex items-start gap-2 hover:bg-white/10 transition-colors"
                          >
                            <span className="text-purple-400 mt-0.5">▪</span>
                            <span className="text-sm font-medium text-slate-200">{proj}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No project lists parsed.</p>
                    )}
                  </div>

                  {/* Certifications */}
                  <div className="glass-strong rounded-2xl p-6 glow-purple flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      🏆 Certifications & Awards
                    </h3>
                    {parsedData.certifications && parsedData.certifications.length > 0 ? (
                      <ul className="space-y-3 flex-grow">
                        {parsedData.certifications.map((cert, index) => (
                          <li
                            key={index}
                            className="bg-white/5 border border-white/5 p-3 rounded-lg flex items-start gap-2 hover:bg-white/10 transition-colors"
                          >
                            <span className="text-yellow-400 mt-0.5">★</span>
                            <span className="text-sm text-slate-300">{cert}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No certifications parsed.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
