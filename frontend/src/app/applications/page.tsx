'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getApplications, deleteApplication, ApplicationResponseData } from '@/lib/application';

export default function ApplicationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationResponseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const res = await getApplications();
      setApplications(res.applications);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to fetch application trackers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchApps();
    }
  }, [user]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to stop tracking this application? This cannot be undone.')) {
      return;
    }
    try {
      await deleteApplication(id);
      setApplications((prev) => prev.filter((app) => app.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete application tracker.');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-[#0f172a] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-slate-400 font-medium animate-pulse">Syncing tracking logs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-white bg-[#0f172a]">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 backdrop-blur-xl">
          <span className="text-4xl" aria-hidden>⚠️</span>
          <h2 className="mt-4 text-xl font-semibold text-red-300">Tracker Sync Error</h2>
          <p className="mt-2 text-slate-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 px-6 py-2.5 font-medium text-white transition-all hover:brightness-110"
          >
            Try Syncing Again
          </button>
        </div>
      </div>
    );
  }

  const statusFilters = ['All', 'Saved', 'Applied', 'Assessment', 'Interview', 'Rejected', 'Selected', 'Follow-up'];

  const statusColors: Record<string, string> = {
    'Saved': 'bg-slate-500/10 border-slate-500/20 text-slate-300',
    'Applied': 'bg-blue-500/10 border-blue-500/20 text-blue-300',
    'Assessment': 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    'Interview': 'bg-purple-500/10 border-purple-500/20 text-purple-300',
    'Rejected': 'bg-rose-500/10 border-rose-500/20 text-rose-300',
    'Selected': 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    'Follow-up': 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300',
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

  const filteredApplications = selectedStatusFilter === 'All'
    ? applications
    : applications.filter((app) => app.status === selectedStatusFilter);

  return (
    <div className="min-h-screen bg-[#0f172a] bg-gradient-to-b from-[#0f172a] via-[#1e1b4b]/10 to-[#0f172a] text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Application Tracker
            </h1>
            <p className="mt-1 text-slate-400 text-sm">
              Keep tabs on saved internship roles, upcoming assessments, interviews, and status outcomes.
            </p>
          </div>
          <div>
            <Link
              href="/jobs"
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/20 cursor-pointer"
            >
              🔍 Find Saved Jobs to Track
            </Link>
          </div>
        </div>

        {/* Status Filters Bar */}
        <div className="flex flex-wrap gap-2 mb-8 bg-slate-900/60 p-2 rounded-xl border border-white/5 backdrop-blur-md">
          {statusFilters.map((filter) => {
            const count = filter === 'All'
              ? applications.length
              : applications.filter((app) => app.status === filter).length;

            return (
              <button
                key={filter}
                onClick={() => setSelectedStatusFilter(filter)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition-all duration-200 ${
                  selectedStatusFilter === filter
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {filter} <span className="ml-1 opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Applications List Grid */}
        {filteredApplications.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-[#1e293b]/20 p-8">
            <span className="text-5xl" aria-hidden>📦</span>
            <h3 className="mt-4 text-lg font-bold text-slate-300">No applications matched</h3>
            <p className="mt-1 text-slate-500 text-sm max-w-md mx-auto">
              {selectedStatusFilter === 'All'
                ? "You haven't tracked any applications yet. Evaluate your match score for a job and click \"Save to Tracker\"!"
                : `No tracked job listings currently hold the "${selectedStatusFilter}" status.`}
            </p>
            {selectedStatusFilter !== 'All' && (
              <button
                onClick={() => setSelectedStatusFilter('All')}
                className="mt-4 text-xs font-bold text-indigo-400 hover:text-indigo-300 underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApplications.map((app) => (
              <div
                key={app.id}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#151f32]/70 p-6 backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/5 group"
              >
                {/* Glowing subtle light */}
                <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-indigo-500/5 blur-2xl transition-all group-hover:bg-indigo-500/10" />

                {/* Status Badge */}
                <div className="flex justify-between items-start gap-4 mb-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusColors[app.status]}`}>
                    <span>{statusIcons[app.status]}</span>
                    <span>{app.status}</span>
                  </span>
                  
                  {/* Applied Date stamp */}
                  {app.appliedDate && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      Applied: {new Date(app.appliedDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  )}
                </div>

                {/* Job metadata */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white leading-tight truncate" title={app.job.title}>
                    {app.job.title}
                  </h3>
                  <p className="text-slate-400 text-sm mt-0.5 truncate">{app.job.company}</p>
                </div>

                {/* Candidate Notes Preview */}
                {app.notes ? (
                  <p className="text-slate-300 text-xs line-clamp-3 bg-white/2 border border-white/5 rounded-lg p-2.5 mb-6 min-h-[4.5rem]">
                    {app.notes}
                  </p>
                ) : (
                  <p className="text-slate-500 text-xs italic bg-white/2 border border-white/5 rounded-lg p-2.5 mb-6 min-h-[4.5rem] flex items-center justify-center">
                    No notes logged for this entry.
                  </p>
                )}

                {/* Tracker Actions footer */}
                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">
                    Updated: {new Date(app.updatedAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <Link
                      href={`/applications/${app.id}`}
                      className="rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      ✏️ Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(app.id)}
                      className="rounded-md bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors cursor-pointer"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
