'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import API from '@/lib/api';

/* ── Types ── */
interface Job {
  id: string; title: string; company: string; source: string;
  apply_url: string; description: string; required_skills: string[];
  job_type: string; work_mode: string; location: string; salary?: string;
}
interface Resume { id: number; filename: string; }
interface AppPackage {
  cover_letter: string; tailored_summary: string;
  key_answers: { question: string; answer: string }[];
  cold_email: string; tips: string[];
  apply_url: string; platform: string;
  job_title: string; company: string;
}

const STEPS = [
  { n: 1, label: 'Select Resume', icon: '📄' },
  { n: 2, label: 'Choose Jobs', icon: '🔍' },
  { n: 3, label: 'Generate Packages', icon: '⚡' },
  { n: 4, label: 'Apply & Track', icon: '🚀' },
];

function copyText(text: string) { navigator.clipboard.writeText(text); }

export default function AutomatePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState('');
  const [searchTitle, setSearchTitle] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [packages, setPackages] = useState<AppPackage[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [activePackage, setActivePackage] = useState(0);
  const [activePackageTab, setActivePackageTab] = useState('cover');
  const [copiedField, setCopiedField] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) API.get('/api/resumes').then((r) => setResumes(r.data.resumes || [])).catch(() => {});
  }, [user]);

  const handleCopy = (text: string, field: string) => {
    copyText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  /* ── Step 2: Search Jobs ── */
  const searchJobs = async () => {
    if (!searchTitle.trim()) return;
    setJobsLoading(true);
    try {
      const res = await API.get(`/api/jobs/discover/search?title=${encodeURIComponent(searchTitle)}&page=1`);
      setJobs(res.data.jobs || []);
    } catch { setJobs([]); }
    finally { setJobsLoading(false); }
  };

  const toggleJob = (id: string) =>
    setSelectedJobs((prev) => prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]);

  /* ── Step 3: Generate Packages ── */
  const generatePackages = async () => {
    if (!selectedResume || selectedJobs.length === 0) return;
    setGenLoading(true);
    const selectedJobObjects = jobs.filter((j) => selectedJobs.includes(j.id));
    try {
      const res = await API.post('/api/automate/batch-prepare', {
        resume_id: Number(selectedResume),
        jobs: selectedJobObjects,
      });
      setPackages(res.data.packages || []);
      setStep(4);
    } catch { } finally { setGenLoading(false); }
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-grid-pattern">
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text-animated">Dream Job Autopilot</h1>
          <p className="text-slate-400 mt-1">Auto-generate tailored applications for multiple jobs at once with Gemini AI</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.n}>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                ${step === s.n ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : step > s.n ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                  : 'glass text-slate-500'}`}>
                <span>{step > s.n ? '✓' : s.icon}</span> {s.label}
              </div>
              {i < STEPS.length - 1 && <div className="h-0.5 w-6 bg-white/10 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {/* ── STEP 1: Select Resume ── */}
        {step === 1 && (
          <div className="glass rounded-2xl p-8 max-w-lg mx-auto text-center">
            <span className="text-5xl block mb-4">📄</span>
            <h2 className="text-xl font-bold text-white mb-2">Select Your Resume</h2>
            <p className="text-slate-400 text-sm mb-6">AI will use this resume to personalise all your applications</p>
            {resumes.length === 0 ? (
              <p className="text-slate-400 text-sm mb-4">No resumes found. <a href="/upload-resume" className="text-purple-400 hover:underline">Upload one first</a>.</p>
            ) : (
              <select value={selectedResume} onChange={(e) => setSelectedResume(e.target.value)}
                className="input-dark w-full rounded-xl px-4 py-3 text-white text-sm mb-6 cursor-pointer">
                <option value="">-- Select a resume --</option>
                {resumes.map((r) => <option key={r.id} value={r.id}>{r.filename}</option>)}
              </select>
            )}
            <button onClick={() => setStep(2)} disabled={!selectedResume}
              className="btn-gradient w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed">
              Continue to Job Search →
            </button>
          </div>
        )}

        {/* ── STEP 2: Choose Jobs ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex gap-3">
              <input value={searchTitle} onChange={(e) => setSearchTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchJobs()}
                placeholder="Search jobs (e.g. React Developer, Data Analyst Intern)..."
                className="input-dark flex-1 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600" />
              <button onClick={searchJobs} disabled={jobsLoading}
                className="btn-gradient rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {jobsLoading ? '⏳' : '🔍 Search'}
              </button>
            </div>

            {selectedJobs.length > 0 && (
              <div className="flex items-center justify-between px-2">
                <p className="text-sm text-slate-400"><strong className="text-purple-400">{selectedJobs.length}</strong> job{selectedJobs.length > 1 ? 's' : ''} selected</p>
                <button onClick={() => { setStep(3); generatePackages(); }}
                  className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
                  Generate Packages ⚡
                </button>
              </div>
            )}

            {jobs.length > 0 && (
              <div className="space-y-3">
                {jobs.slice(0, 15).map((job) => {
                  const sel = selectedJobs.includes(job.id);
                  return (
                    <div key={job.id} onClick={() => toggleJob(job.id)}
                      className={`glass rounded-xl p-4 cursor-pointer transition-all duration-200 flex items-center gap-4
                        ${sel ? 'border-purple-500/50 shadow-purple-500/10 shadow-md' : 'border-white/10 hover:border-white/20'}`}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-all
                        ${sel ? 'bg-purple-600 border-purple-600' : 'bg-white/5 border-white/20'}`}>
                        {sel && <span className="text-xs text-white">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{job.title}</p>
                        <p className="text-xs text-slate-400">{job.company} · {job.location}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 capitalize">
                          {job.source}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Generating ── */}
        {step === 3 && (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin mx-auto" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">🧠</div>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Generating Packages...</h2>
            <p className="text-slate-400 text-sm">
              Gemini AI is crafting tailored cover letters, summaries, and Q&As for <strong className="text-white">{selectedJobs.length}</strong> job{selectedJobs.length > 1 ? 's' : ''}.
            </p>
            <p className="text-slate-500 text-xs mt-2">This may take 30-60 seconds</p>
          </div>
        )}

        {/* ── STEP 4: Results ── */}
        {step === 4 && packages.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400"><strong className="text-green-400">{packages.length}</strong> application package{packages.length > 1 ? 's' : ''} ready!</p>
              <button onClick={() => { setStep(1); setPackages([]); setSelectedJobs([]); setJobs([]); setSelectedResume(''); }}
                className="text-xs text-slate-500 hover:text-slate-400 border border-white/10 rounded-lg px-3 py-1.5 transition-colors">
                Start Over ↺
              </button>
            </div>

            {/* Job Selector Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {packages.map((pkg, i) => (
                <button key={i} onClick={() => setActivePackage(i)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer
                    ${activePackage === i
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'glass text-slate-400 hover:text-white'}`}>
                  {pkg.company} — {pkg.job_title.slice(0, 20)}{pkg.job_title.length > 20 ? '...' : ''}
                </button>
              ))}
            </div>

            {/* Package Content */}
            {(() => {
              const pkg = packages[activePackage];
              if (!pkg) return null;
              const pkgTabs = [
                { id: 'cover', label: '📝 Cover Letter' },
                { id: 'summary', label: '👤 Summary' },
                { id: 'qa', label: '💬 Q&A Answers' },
                { id: 'email', label: '📧 Cold Email' },
                { id: 'tips', label: '💡 Tips' },
              ];
              return (
                <div className="glass rounded-2xl overflow-hidden">
                  {/* Package header */}
                  <div className="p-5 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{pkg.job_title}</h3>
                      <p className="text-slate-400 text-sm">{pkg.company}</p>
                    </div>
                    <a href={pkg.apply_url} target="_blank" rel="noopener noreferrer"
                      className="btn-gradient rounded-xl px-4 py-2 text-xs font-semibold text-white">
                      Apply Now →
                    </a>
                  </div>

                  {/* Package tab selector */}
                  <div className="flex gap-1 p-3 border-b border-white/10 overflow-x-auto">
                    {pkgTabs.map((t) => (
                      <button key={t.id} onClick={() => setActivePackageTab(t.id)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer
                          ${activePackageTab === t.id
                            ? 'bg-purple-600/30 border border-purple-500/40 text-purple-300'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Package content */}
                  <div className="p-5">
                    {activePackageTab === 'cover' && (
                      <div>
                        <div className="flex justify-end mb-3">
                          <button onClick={() => handleCopy(pkg.cover_letter, 'cover')}
                            className="text-xs text-purple-400 hover:text-purple-300 border border-purple-500/20 rounded-lg px-3 py-1.5 transition-colors">
                            {copiedField === 'cover' ? '✓ Copied!' : '📋 Copy'}
                          </button>
                        </div>
                        <pre className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{pkg.cover_letter}</pre>
                      </div>
                    )}
                    {activePackageTab === 'summary' && (
                      <div>
                        <div className="flex justify-end mb-3">
                          <button onClick={() => handleCopy(pkg.tailored_summary, 'summary')}
                            className="text-xs text-purple-400 hover:text-purple-300 border border-purple-500/20 rounded-lg px-3 py-1.5 transition-colors">
                            {copiedField === 'summary' ? '✓ Copied!' : '📋 Copy'}
                          </button>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{pkg.tailored_summary}</p>
                      </div>
                    )}
                    {activePackageTab === 'qa' && (
                      <div className="space-y-4">
                        {pkg.key_answers.length === 0 && <p className="text-slate-400 text-sm">No screening questions found for this role.</p>}
                        {pkg.key_answers.map((qa, i) => (
                          <div key={i} className="rounded-xl bg-white/3 border border-white/8 p-4">
                            <p className="text-xs font-medium text-purple-400 mb-1">Q{i + 1}: {qa.question}</p>
                            <p className="text-sm text-slate-300 leading-relaxed">{qa.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {activePackageTab === 'email' && (
                      <div>
                        <div className="flex justify-end mb-3">
                          <button onClick={() => handleCopy(pkg.cold_email, 'email')}
                            className="text-xs text-purple-400 hover:text-purple-300 border border-purple-500/20 rounded-lg px-3 py-1.5 transition-colors">
                            {copiedField === 'email' ? '✓ Copied!' : '📋 Copy'}
                          </button>
                        </div>
                        <pre className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{pkg.cold_email}</pre>
                      </div>
                    )}
                    {activePackageTab === 'tips' && (
                      <ul className="space-y-2">
                        {pkg.tips.map((tip, i) => (
                          <li key={i} className="text-sm text-slate-300 flex gap-2">
                            <span className="text-amber-400 flex-shrink-0">→</span>{tip}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
