'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import API from '@/lib/api';
import { getResumes, ResumeListItem, getResumeById, ResumeDetail } from '@/lib/resume';

interface DiscoveredJob {
  id: number;
  title: string;
  company: string;
  mode: 'remote' | 'hybrid' | 'onsite';
  type: 'internship' | 'fulltime';
  source: 'linkedin' | 'indeed' | 'naukri';
  salary: string;
  requiredSkills: string[];
  description: string;
  questions: string[];
  postedAt: string;
}

export default function JobDiscoveryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Search filter states
  const [titleSearch, setTitleSearch] = useState('');
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [linkedinCheck, setLinkedinCheck] = useState(true);
  const [indeedCheck, setIndeedCheck] = useState(true);
  const [naukriCheck, setNaukriCheck] = useState(true);

  // Data states
  const [discoveredJobs, setDiscoveredJobs] = useState<DiscoveredJob[]>([]);
  const [userResumes, setUserResumes] = useState<ResumeListItem[]>([]);
  const [selectedResumeDetail, setSelectedResumeDetail] = useState<ResumeDetail | null>(null);

  // Apply Drawer/Modal states
  const [activeJobToApply, setActiveJobToApply] = useState<DiscoveredJob | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [applicationNotes, setApplicationNotes] = useState('');
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});

  // UI status states
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load User Resumes & initial search
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user's uploaded resumes list
      const resumesRes = await getResumes();
      setUserResumes(resumesRes.resumes);
      if (resumesRes.resumes.length > 0) {
        setSelectedResumeId(resumesRes.resumes[0].id.toString());
        // Fetch detailed resume data for live skill overlap comparisons
        const detailRes = await getResumeById(resumesRes.resumes[0].id);
        setSelectedResumeDetail(detailRes.resume);
      }

      // Initial daily crawling check
      await triggerSearch(true);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to initialize discovery engine.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  // Handle active resume changing to re-match skill tags in real-time
  const handleResumeSelectChange = async (resumeId: string) => {
    setSelectedResumeId(resumeId);
    if (resumeId) {
      try {
        const detail = await getResumeById(Number(resumeId));
        setSelectedResumeDetail(detail.resume);
      } catch (err) {
        console.error('Error switching comparison resume:', err);
      }
    } else {
      setSelectedResumeDetail(null);
    }
  };

  // Trigger search from backend Daily Aggregator
  const triggerSearch = async (isInit = false) => {
    if (!isInit) setSearching(true);
    setError(null);

    try {
      const sources: string[] = [];
      if (linkedinCheck) sources.push('linkedin');
      if (indeedCheck) sources.push('indeed');
      if (naukriCheck) sources.push('naukri');

      if (sources.length === 0) {
        setDiscoveredJobs([]);
        setSearching(false);
        return;
      }

      const res = await API.get('/api/jobs/discover/search', {
        params: {
          title: titleSearch || undefined,
          mode: selectedMode,
          type: selectedType,
          source: sources.join(','),
        },
      });

      setDiscoveredJobs(res.data.jobs || []);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to fetch discovered listings.');
    } finally {
      if (!isInit) setSearching(false);
    }
  };

  // Run Direct Apply pipeline (saves job + registers application tracker status "Applied")
  const handleDirectApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJobToApply || !selectedResumeId) return;

    setApplying(true);
    setError(null);
    setSuccess(null);

    try {
      // 1 — Save the discovered Job Description to user's dashboard records
      const jobPayload = {
        title: activeJobToApply.title,
        company: activeJobToApply.company,
        description: activeJobToApply.description,
      };
      
      const jobRes = await API.post('/api/jobs', jobPayload);
      const savedJobId = jobRes.data.job.id;

      // 2 — Compile dynamic question answers and notes
      let compiledNotes = applicationNotes;
      if (activeJobToApply.questions.length > 0) {
        compiledNotes += '\n\n-- Job Specific Answers --';
        activeJobToApply.questions.forEach((q) => {
          const ans = questionAnswers[q] || 'Not answered';
          compiledNotes += `\nQ: ${q}\nA: ${ans}`;
        });
      }

      // 3 — Insert track record in CRUD pipeline tracker set to "Applied"
      const appPayload = {
        jobId: savedJobId,
        status: 'Applied',
        notes: compiledNotes || `Applied instantly using resume: ${userResumes.find(r => r.id === Number(selectedResumeId))?.filename || 'Primary'}.`,
      };

      await API.post('/api/applications', appPayload);

      setSuccess(`🎉 Applied successfully to ${activeJobToApply.title} at ${activeJobToApply.company}! Tracking logged.`);
      
      // Cleanup inputs
      setApplicationNotes('');
      setQuestionAnswers({});
      setTimeout(() => {
        setSuccess(null);
        setActiveJobToApply(null);
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Application transmission failed.');
    } finally {
      setApplying(false);
    }
  };

  // Real-time keyword alignment check
  const doesResumeHaveSkill = (skill: string) => {
    if (!selectedResumeDetail || !selectedResumeDetail.parsed_data) return false;
    const skills = selectedResumeDetail.parsed_data.skills || [];
    return skills.some((s) => s.toLowerCase() === skill.toLowerCase());
  };

  // Brand badges styles
  const sourceBadges: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    linkedin: { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-300', label: 'LinkedIn', icon: '🔗' },
    indeed: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-300', label: 'Indeed', icon: '🎯' },
    naukri: { bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-300', label: 'Naukri', icon: '💼' },
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-[#0f172a] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <p className="text-slate-400 font-medium animate-pulse">Aggregating internship channels...</p>
        </div>
      </div>
    );
  }

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

        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center mb-8 pb-6 border-b border-white/5">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">
              Direct Apply discovery
            </h1>
            <p className="mt-1 text-slate-400 text-sm">
              Discover real-time daily internship and job postings from LinkedIn, Indeed, and Naukri. Analyze skill fit and apply directly on SkillProof!
            </p>
          </div>
          <Link
            href="/applications"
            className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-4 py-2.5 text-xs font-bold text-purple-300 transition-colors hover:bg-purple-500/20"
          >
            📊 View Tracker Board
          </Link>
        </div>

        {/* Discovery Layout: Left Filters, Right Search Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* LEFT 4-Columns: Crawling filters */}
          <div className="lg:col-span-4 space-y-6">
            
            <div className="rounded-2xl border border-white/10 bg-[#151f32]/80 p-6 backdrop-blur-xl shadow-2xl">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-1.5">
                <span>🔍</span> Filter Crawlers
              </h3>

              <div className="space-y-5">
                
                {/* Search query */}
                <div>
                  <label htmlFor="search-input" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Position title or Skill
                  </label>
                  <input
                    id="search-input"
                    type="text"
                    value={titleSearch}
                    onChange={(e) => setTitleSearch(e.target.value)}
                    placeholder="e.g., Frontend Intern, FastAPI..."
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                {/* Resume Selector for live checks */}
                {userResumes.length > 0 && (
                  <div>
                    <label htmlFor="resume-comp-select" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Cross-reference Resume
                    </label>
                    <select
                      id="resume-comp-select"
                      value={selectedResumeId}
                      onChange={(e) => handleResumeSelectChange(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                    >
                      {userResumes.map((res) => (
                        <option key={res.id} value={res.id}>
                          {res.filename}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Work Mode Toggle buttons */}
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Work Mode
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['all', 'remote', 'hybrid', 'onsite'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setSelectedMode(mode)}
                        className={`rounded-lg py-2 text-[10px] font-bold capitalize transition-all cursor-pointer ${
                          selectedMode === mode
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Position Type Toggle buttons */}
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Position Type
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['all', 'internship', 'fulltime'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`rounded-lg py-2 text-[10px] font-bold capitalize transition-all cursor-pointer ${
                          selectedType === type
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {type === 'fulltime' ? 'Full-Time' : type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platforms check */}
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Crawling Platforms
                  </span>
                  <div className="space-y-2 mt-2">
                    <label className="flex items-center gap-2.5 text-xs text-slate-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={linkedinCheck}
                        onChange={(e) => setLinkedinCheck(e.target.checked)}
                        className="rounded border-white/10 bg-slate-900 text-purple-600 focus:ring-purple-500"
                      />
                      <span>LinkedIn Jobs</span>
                    </label>
                    <label className="flex items-center gap-2.5 text-xs text-slate-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={indeedCheck}
                        onChange={(e) => setIndeedCheck(e.target.checked)}
                        className="rounded border-white/10 bg-slate-900 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Indeed Postings</span>
                    </label>
                    <label className="flex items-center gap-2.5 text-xs text-slate-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={naukriCheck}
                        onChange={(e) => setNaukriCheck(e.target.checked)}
                        className="rounded border-white/10 bg-slate-900 text-purple-600 focus:ring-purple-500"
                      />
                      <span>Naukri Listings</span>
                    </label>
                  </div>
                </div>

                {/* Trigger Button */}
                <button
                  onClick={() => triggerSearch(false)}
                  disabled={searching}
                  className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.01] hover:shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {searching ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Crawling listings...
                    </>
                  ) : (
                    '🔄 Run Discovery Engines'
                  )}
                </button>

              </div>
            </div>

          </div>

          {/* RIGHT 8-Columns: Discovered postings */}
          <div className="lg:col-span-8 space-y-6">
            
            {discoveredJobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#151f32]/20 py-24 text-center">
                <span className="text-4xl block mb-2" aria-hidden>🌍</span>
                <h3 className="font-bold text-slate-300 text-lg">No New Postings Crawled</h3>
                <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">
                  Adjust your search title filters or toggle platforms discovery checkbox to trigger fresh runs.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {discoveredJobs.map((job) => {
                  const badge = sourceBadges[job.source] || sourceBadges.linkedin;
                  return (
                    <div
                      key={job.id}
                      className="rounded-2xl border border-white/10 bg-[#151f32]/60 p-6 backdrop-blur-xl hover:border-white/20 transition-all duration-200"
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start mb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`rounded-md border ${badge.bg} px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${badge.text} flex items-center gap-1`}>
                              <span>{badge.icon}</span> {badge.label}
                            </span>
                            <span className="rounded bg-white/5 border border-white/5 px-2 py-0.5 text-[9px] font-bold text-slate-400 capitalize">
                              📍 {job.mode}
                            </span>
                            <span className="rounded bg-white/5 border border-white/5 px-2 py-0.5 text-[9px] font-bold text-slate-400 capitalize">
                              ⏱️ {job.type === 'fulltime' ? 'Full-Time' : job.type}
                            </span>
                          </div>

                          <h3 className="text-xl font-bold text-white leading-snug">{job.title}</h3>
                          <p className="text-slate-400 text-xs mt-0.5 font-medium">{job.company}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="block text-emerald-400 font-bold text-sm">{job.salary}</span>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Estimated Scale</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed mb-5 line-clamp-2">
                        {job.description}
                      </p>

                      {/* Overlapping skills badges */}
                      <div className="mb-5 pt-3 border-t border-white/5">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                          Skill Alignment Check
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {job.requiredSkills.map((skill) => {
                            const matched = doesResumeHaveSkill(skill);
                            return (
                              <span
                                key={skill}
                                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                  matched
                                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                                    : 'bg-slate-900 border border-white/5 text-slate-500'
                                }`}
                              >
                                {matched ? '✔️ ' : '❌ '} {skill}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <span className="text-[10px] text-slate-500 font-semibold">
                          Posted {new Date(job.postedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        
                        <button
                          onClick={() => setActiveJobToApply(job)}
                          className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:scale-[1.02] cursor-pointer"
                        >
                          ⚡ Apply Instantly
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

      </div>

      {/* DIRECT APPLY SLIDE-DRAWER / MODAL OVERLAY */}
      {activeJobToApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm print:hidden">
          <div className="w-full max-w-xl h-screen bg-[#111827] border-l border-white/10 p-8 shadow-2xl overflow-y-auto flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <div>
                <span className="text-xs text-purple-400 font-bold tracking-widest uppercase">DIRECT APPLY WITH RESUME</span>
                <h3 className="text-xl font-bold text-white mt-1 leading-snug">{activeJobToApply.title}</h3>
                <p className="text-slate-400 text-xs font-medium">{activeJobToApply.company}</p>
              </div>
              <button
                onClick={() => setActiveJobToApply(null)}
                className="text-slate-400 hover:text-white text-2xl font-semibold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleDirectApply} className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-5">
                
                {/* Resume select */}
                {userResumes.length === 0 ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-300">
                    ⚠️ You haven&apos;t uploaded any resumes yet! Please exit and upload a resume before applying.
                  </div>
                ) : (
                  <div>
                    <label htmlFor="modal-resume-select" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Select Resume Attachment
                    </label>
                    <select
                      id="modal-resume-select"
                      value={selectedResumeId}
                      onChange={(e) => handleResumeSelectChange(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                      required
                    >
                      {userResumes.map((res) => (
                        <option key={res.id} value={res.id}>
                          {res.filename}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Job Specific Questions */}
                {activeJobToApply.questions.map((q) => (
                  <div key={q}>
                    <label className="block text-xs font-bold text-slate-300 mb-2 leading-relaxed">
                      💬 {q}
                    </label>
                    <textarea
                      rows={3}
                      value={questionAnswers[q] || ''}
                      onChange={(e) => setQuestionAnswers({ ...questionAnswers, [q]: e.target.value })}
                      placeholder="Type your response... (Keep it concise & keyword-rich!)"
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-xs text-white focus:border-purple-500 focus:outline-none resize-none leading-relaxed"
                      required
                    />
                  </div>
                ))}

                {/* Additional Cover Note */}
                <div>
                  <label htmlFor="cover-note-textarea" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Cover Note / Brief Message
                  </label>
                  <textarea
                    id="cover-note-textarea"
                    rows={4}
                    value={applicationNotes}
                    onChange={(e) => setApplicationNotes(e.target.value)}
                    placeholder="Describe why you are a good fit for this role..."
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-xs text-white focus:border-purple-500 focus:outline-none resize-none leading-relaxed"
                  />
                </div>

              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-white/5 flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setActiveJobToApply(null)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold hover:bg-white/10 transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applying || userResumes.length === 0}
                  className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.01] hover:shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {applying ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Submitting application...
                    </>
                  ) : (
                    '🚀 Submit Application'
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
