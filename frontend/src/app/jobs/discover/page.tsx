'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import API from '@/lib/api';

/* ── Types ── */
interface Job {
  id: string; title: string; company: string; location: string;
  job_type: string; work_mode: string; salary: string;
  description: string; apply_url: string; source: string;
  required_skills: string[]; match_score?: number; logo_url?: string;
}
interface SearchResult { jobs: Job[]; total: number; page: number; has_more: boolean; }

/* ── Source badge ── */
const SOURCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  linkedin:  { label: 'LinkedIn',  color: 'text-blue-300',   bg: 'bg-blue-500/10 border-blue-500/20' },
  indeed:    { label: 'Indeed',    color: 'text-indigo-300', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  glassdoor: { label: 'Glassdoor', color: 'text-green-300',  bg: 'bg-green-500/10 border-green-500/20' },
  naukri:    { label: 'Naukri',    color: 'text-orange-300', bg: 'bg-orange-500/10 border-orange-500/20' },
  other:     { label: 'Other',     color: 'text-slate-300',  bg: 'bg-slate-500/10 border-slate-500/20' },
};

function SourceBadge({ source }: { source: string }) {
  const cfg = SOURCE_CONFIG[source] || SOURCE_CONFIG.other;
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

/* ── Match Score Badge ── */
function MatchBadge({ score }: { score?: number }) {
  if (score === null || score === undefined) return null;
  const color = score >= 70 ? 'text-green-400 bg-green-500/10 border-green-500/20'
    : score >= 40 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-red-400 bg-red-500/10 border-red-500/20';
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${color}`}>
      {score}% match
    </span>
  );
}

/* ── Job Card ── */
function JobCard({ job, onApply }: { job: Job; onApply: (job: Job) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="glass rounded-2xl p-5 card-hover flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm leading-tight truncate">{job.title}</h3>
          <p className="text-slate-400 text-xs mt-0.5">{job.company}</p>
        </div>
        <MatchBadge score={job.match_score} />
      </div>

      <div className="flex flex-wrap gap-2">
        <SourceBadge source={job.source} />
        <span className="text-xs px-2.5 py-1 rounded-full border bg-purple-500/10 border-purple-500/20 text-purple-300 capitalize">
          {job.job_type}
        </span>
        <span className="text-xs px-2.5 py-1 rounded-full border bg-slate-500/10 border-slate-500/20 text-slate-300 capitalize">
          {job.work_mode}
        </span>
      </div>

      <div className="text-xs text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
        {job.location && <span>📍 {job.location}</span>}
        {job.salary && job.salary !== 'Not disclosed' && <span>💰 {job.salary}</span>}
      </div>

      {job.required_skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.required_skills.slice(0, 5).map((s, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
              {s}
            </span>
          ))}
          {job.required_skills.length > 5 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-500">
              +{job.required_skills.length - 5}
            </span>
          )}
        </div>
      )}

      {job.description && (
        <>
          <p className={`text-xs text-slate-500 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
            {job.description}
          </p>
          {job.description.length > 120 && (
            <button onClick={() => setExpanded(!expanded)}
              className="text-xs text-purple-400 hover:text-purple-300 text-left cursor-pointer w-fit">
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </>
      )}

      <div className="flex gap-2 mt-auto pt-2">
        <button onClick={() => onApply(job)}
          className="btn-gradient flex-1 rounded-xl py-2 text-xs font-semibold text-white text-center">
          Apply Now →
        </button>
        <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
          className="glass rounded-xl px-3 py-2 text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/20 transition-all">
          🔗
        </a>
      </div>
    </div>
  );
}

/* ── Skeleton ── */
function JobSkeleton() {
  return (
    <div className="glass rounded-2xl p-5 space-y-3">
      {[80, 50, 60, 100].map((w, i) => (
        <div key={i} className="skeleton h-3 rounded" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

export default function JobDiscoverPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('India');
  const [jobType, setJobType] = useState('all');
  const [workMode, setWorkMode] = useState('all');
  const [source, setSource] = useState('all');
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchJobs = async (p = 1, append = false) => {
    setLoading(true);
    if (!append) setSearched(true);
    try {
      const params = new URLSearchParams({
        title, location, job_type: jobType, work_mode: workMode, source, page: String(p),
      });
      const res = await API.get(`/api/jobs/discover/search?${params}`);
      if (append && result) {
        setResult({ ...res.data, jobs: [...result.jobs, ...res.data.jobs] });
      } else {
        setResult(res.data);
      }
      setPage(p);
    } catch {
      setResult({ jobs: [], total: 0, page: 1, has_more: false });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchJobs(1, false);
  };

  const handleApply = (job: Job) => {
    // Track the application
    API.post('/api/applications', {
      company: job.company, role: job.title,
      status: 'applied', applied_date: new Date().toISOString().split('T')[0],
      url: job.apply_url, job_type: job.job_type,
    }).catch(() => {});
    // Open apply URL
    window.open(job.apply_url, '_blank', 'noopener,noreferrer');
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-grid-pattern">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text-animated">Discover Jobs</h1>
          <p className="text-slate-400 mt-1">Real-time listings from LinkedIn, Indeed & Glassdoor via JSearch API</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="glass rounded-2xl p-5 mb-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Job title or keyword..."
              className="input-dark rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 lg:col-span-1" />
            <input value={location} onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (e.g. Bengaluru)"
              className="input-dark rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600" />
            <div className="flex gap-2">
              <select value={jobType} onChange={(e) => setJobType(e.target.value)}
                className="input-dark flex-1 rounded-xl px-3 py-3 text-white text-sm cursor-pointer">
                <option value="all">All Types</option>
                <option value="internship">Internship</option>
                <option value="fulltime">Full-time</option>
                <option value="parttime">Part-time</option>
              </select>
              <select value={workMode} onChange={(e) => setWorkMode(e.target.value)}
                className="input-dark flex-1 rounded-xl px-3 py-3 text-white text-sm cursor-pointer">
                <option value="all">All Modes</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>
            </div>
            <div className="flex gap-2">
              <select value={source} onChange={(e) => setSource(e.target.value)}
                className="input-dark flex-1 rounded-xl px-3 py-3 text-white text-sm cursor-pointer">
                <option value="all">All Sources</option>
                <option value="linkedin">LinkedIn</option>
                <option value="indeed">Indeed</option>
                <option value="glassdoor">Glassdoor</option>
              </select>
              <button type="submit" className="btn-gradient rounded-xl px-5 py-3 text-sm font-semibold text-white whitespace-nowrap">
                🔍 Search
              </button>
            </div>
          </div>
        </form>

        {/* Results */}
        {!searched && !loading && (
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">🚀</span>
            <p className="text-slate-400 text-lg">Enter a job title and search to see live listings</p>
            <p className="text-slate-600 text-sm mt-2">Results are fetched in real-time from multiple platforms</p>
          </div>
        )}

        {loading && !result?.jobs.length && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <JobSkeleton key={i} />)}
          </div>
        )}

        {result && (
          <>
            {result.total > 0 && (
              <p className="text-sm text-slate-400 mb-4">
                Found <strong className="text-white">{result.total}</strong> jobs
                {title && <> for <strong className="text-purple-400">&quot;{title}&quot;</strong></>}
                {location && <> in <strong className="text-blue-400">{location}</strong></>}
              </p>
            )}

            {result.jobs.length === 0 && searched && !loading && (
              <div className="text-center py-20">
                <span className="text-5xl block mb-4">😕</span>
                <p className="text-slate-400">No jobs found. Try different keywords or filters.</p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.jobs.map((job) => (
                <JobCard key={job.id} job={job} onApply={handleApply} />
              ))}
            </div>

            {result.has_more && (
              <div className="mt-8 text-center">
                <button onClick={() => fetchJobs(page + 1, true)} disabled={loading}
                  className="glass rounded-xl px-8 py-3 text-sm text-white font-medium border border-white/10 hover:border-purple-500/40 transition-all disabled:opacity-50">
                  {loading ? 'Loading...' : 'Load More Jobs'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
