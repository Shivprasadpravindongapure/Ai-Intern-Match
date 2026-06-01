'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getJobs, deleteJob, JobResponseData } from '@/lib/job';

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
    month: 'short',
    day: 'numeric',
  });
}

export default function JobListPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // State
  const [jobs, setJobs] = useState<JobResponseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch jobs
  useEffect(() => {
    if (!user) return;

    async function fetchJobs() {
      try {
        setLoading(true);
        const data = await getJobs();
        setJobs(data.jobs);
      } catch {
        setError('Failed to fetch saved job descriptions.');
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, [user]);

  // Delete handler
  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this job description? This will also delete any matching results.')) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteJob(id);
      setJobs((prev) => prev.filter((job) => job.id !== id));
    } catch {
      setError('Failed to delete job description.');
    } finally {
      setDeletingId(null);
    }
  }

  // Loading skeleton card
  if (authLoading || loading) {
    return (
      <div className="relative min-h-[calc(100vh-64px)] px-4 py-12 bg-grid-pattern">
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="flex items-center justify-between mb-8">
            <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
            <div className="h-10 w-32 animate-pulse rounded bg-purple-500/10" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-strong rounded-2xl p-6 h-56 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-[calc(100vh-64px)] px-4 py-12 bg-grid-pattern overflow-hidden">
      {/* Floating Background Orbs */}
      <FloatingOrb
        className="animate-float"
        style={{
          width: 350,
          height: 350,
          top: '10%',
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

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white sm:text-4xl leading-tight">
              My Saved <span className="gradient-text">Jobs & Internships</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Select any saved position description to match your resumes and view ATS evidence reports.
            </p>
          </div>
          <Link
            href="/jobs/new"
            className="btn-gradient inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white cursor-pointer hover:opacity-95 transition-all text-center self-start sm:self-center"
          >
            ➕ Add Job Description
          </Link>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Empty state */}
        {jobs.length === 0 && (
          <div className="glass-strong rounded-2xl p-12 text-center max-w-md mx-auto mt-12 glow-purple">
            <span className="mb-4 inline-block text-5xl">🔍</span>
            <h2 className="mb-2 text-xl font-bold text-white">No Saved Jobs</h2>
            <p className="mb-6 text-sm text-slate-400">
              You haven&apos;t pasted any internship descriptions yet. Paste one now to calculate match scores and suggestions!
            </p>
            <Link
              href="/jobs/new"
              className="btn-gradient inline-block rounded-lg px-6 py-2.5 text-sm font-semibold text-white cursor-pointer hover:opacity-90"
            >
              Add Your First Job Description
            </Link>
          </div>
        )}

        {/* Job Cards Grid */}
        {jobs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="glass-strong rounded-2xl p-6 glow-blue card-hover flex flex-col justify-between"
              >
                <div>
                  {/* Title & Company */}
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h2 className="text-lg font-bold text-white leading-snug">{job.title}</h2>
                      <p className="text-sm font-semibold text-purple-300 mt-0.5">{job.company}</p>
                    </div>
                    <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                      📅 {formatDate(job.createdAt)}
                    </span>
                  </div>

                  {/* Skills badge section */}
                  <div className="mt-4">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Required Skills ({job.requiredSkills.length})
                    </h3>
                    {job.requiredSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                        {job.requiredSkills.slice(0, 8).map((skill, idx) => (
                          <span
                            key={idx}
                            className="rounded-md bg-purple-500/10 border border-purple-500/15 px-2 py-0.5 text-[10px] font-medium text-purple-300"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.requiredSkills.length > 8 && (
                          <span className="rounded-md bg-white/5 border border-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                            +{job.requiredSkills.length - 8} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">No skills extracted</p>
                    )}
                  </div>
                </div>

                {/* Card action items */}
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="btn-gradient rounded-lg px-4 py-2 text-xs font-bold text-white shadow hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    ⚡ Match Workspace
                  </Link>

                  <button
                    onClick={() => handleDelete(job.id)}
                    disabled={deletingId === job.id}
                    className="rounded-lg border border-red-500/15 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/10 hover:border-red-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {deletingId === job.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
