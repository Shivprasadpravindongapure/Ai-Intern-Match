'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getResumes, deleteResume, ResumeListItem } from '@/lib/resume';

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

/* ─── Skeleton Card ─── */
function SkeletonCard() {
  return (
    <div className="glass rounded-xl p-5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-white/10" />
          <div className="h-3 w-1/2 rounded bg-white/5" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-8 flex-1 rounded-lg bg-white/10" />
        <div className="h-8 flex-1 rounded-lg bg-white/5" />
      </div>
    </div>
  );
}

/* ─── Format date ─── */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ─── Page ─── */
export default function ResumesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch resumes
  const fetchResumes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getResumes();
      setResumes(data.resumes);
    } catch {
      setError('Failed to load resumes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchResumes();
  }, [user, fetchResumes]);

  // Delete handler
  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this resume? This action cannot be undone.')) {
      return;
    }

    setDeleting(id);
    try {
      await deleteResume(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError('Failed to delete resume.');
    } finally {
      setDeleting(null);
    }
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-[calc(100vh-64px)] px-4 py-12 bg-grid-pattern">
      {/* Floating orbs */}
      <FloatingOrb
        className="animate-float-slow"
        style={{
          width: 400,
          height: 400,
          top: '5%',
          right: '-8%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.25), transparent 70%)',
        }}
      />
      <FloatingOrb
        className="animate-float"
        style={{
          width: 300,
          height: 300,
          bottom: '15%',
          left: '-5%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.2), transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-1">My Resumes</h1>
            <p className="text-sm text-slate-400">
              Manage your uploaded resumes
            </p>
          </div>
          <Link
            href="/upload-resume"
            className="btn-gradient inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Upload New Resume
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : resumes.length === 0 ? (
          /* Empty State */
          <div className="glass-strong rounded-2xl p-12 text-center glow-blue">
            <span className="mb-4 inline-block text-5xl">📂</span>
            <h3 className="mb-2 text-xl font-semibold text-white">
              No Resumes Yet
            </h3>
            <p className="mb-6 text-sm text-slate-400">
              Upload your first resume to get started with AI-powered analysis
            </p>
            <Link
              href="/upload-resume"
              className="btn-gradient inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white"
            >
              Upload Your First Resume
            </Link>
          </div>
        ) : (
          /* Resume Grid */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="glass card-hover gradient-border rounded-xl p-5 group"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-xl group-hover:scale-110 transition-transform duration-300">
                    📄
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate" title={resume.filename}>
                      {resume.filename}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDate(resume.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/resumes/${resume.id}`}
                    className="flex-1 rounded-lg bg-gradient-to-r from-purple-600/80 to-blue-600/80 py-2 text-center text-xs font-medium text-white transition-all duration-200 hover:from-purple-500 hover:to-blue-500"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => handleDelete(resume.id)}
                    disabled={deleting === resume.id}
                    className="flex-1 rounded-lg border border-red-500/20 bg-red-500/10 py-2 text-xs font-medium text-red-400 transition-all duration-200 hover:bg-red-500/20 hover:border-red-500/30 disabled:opacity-50 cursor-pointer"
                  >
                    {deleting === resume.id ? 'Deleting…' : 'Delete'}
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
