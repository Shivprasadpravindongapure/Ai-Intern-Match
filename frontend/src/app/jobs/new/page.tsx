'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { createJob, JobResponseData } from '@/lib/job';

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

export default function NewJobPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Form states
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');

  // Status states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [savedJob, setSavedJob] = useState<JobResponseData | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Form submit handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Frontend validation
    if (!title.trim() || !company.trim() || !description.trim()) {
      setError('All fields are required.');
      return;
    }

    if (description.trim().length < 50) {
      setError('Description must be at least 50 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await createJob({
        title: title.trim(),
        company: company.trim(),
        description: description.trim(),
      });
      setSavedJob(response.job);
      setSuccess(true);
      // Reset form
      setTitle('');
      setCompany('');
      setDescription('');
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Failed to save job description. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="relative min-h-[calc(100vh-64px)] flex items-center justify-center bg-grid-pattern">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-[calc(100vh-64px)] px-4 py-12 bg-grid-pattern overflow-hidden">
      {/* Floating background orbs */}
      <FloatingOrb
        className="animate-float"
        style={{
          width: 400,
          height: 400,
          top: '-10%',
          right: '-5%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.25), transparent 70%)',
        }}
      />
      <FloatingOrb
        className="animate-float-slow"
        style={{
          width: 350,
          height: 350,
          bottom: '-10%',
          left: '-5%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.2), transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Add <span className="gradient-text">Internship Description</span>
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Paste details for an internship. Our local parser will instantly extract required skills to match your resumes!
          </p>
        </div>

        {/* Success Card Dashboard */}
        {success && savedJob && (
          <div className="mb-8 glass-strong rounded-2xl p-6 glow-purple border border-purple-500/20 animate-fade-in">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-4xl">✨</span>
              <div>
                <h2 className="text-lg font-bold text-white">Saved Successfully!</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Saved {savedJob.title} at {savedJob.company}
                </p>
              </div>
            </div>

            {/* Extracted Skills Badge Grid */}
            <div className="mt-4 bg-white/5 rounded-xl border border-white/5 p-4">
              <h3 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3">
                Auto-Extracted Required Skills ({savedJob.requiredSkills.length})
              </h3>
              {savedJob.requiredSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {savedJob.requiredSkills.map((skill, index) => (
                    <span
                      key={index}
                      className="rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-xs font-medium text-purple-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  No skill keywords detected. The description will still be saved!
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/jobs/${savedJob.id}`}
                className="btn-gradient rounded-lg px-5 py-2.5 text-sm font-semibold text-white cursor-pointer hover:opacity-90 transition-all flex items-center gap-2"
              >
                ⚡ Match Resumes Now
              </Link>
              <Link
                href="/jobs"
                className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
              >
                View Saved Jobs
              </Link>
              <button
                onClick={() => setSuccess(false)}
                className="rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-all cursor-pointer ml-auto"
              >
                Add Another
              </button>
            </div>
          </div>
        )}

        {/* Input Form Card */}
        {!success && (
          <div className="glass-strong rounded-2xl p-8 glow-blue">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Alert */}
              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                  ⚠️ {error}
                </div>
              )}

              {/* Title & Company Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-semibold text-slate-300 mb-2">
                    Job / Internship Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. AI/ML Developer Intern"
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-semibold text-slate-300 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Microsoft"
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Description Textarea */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-slate-300 mb-2">
                  Job / Internship Description
                </label>
                <textarea
                  id="description"
                  rows={8}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Paste the full job details, requirements, and responsibilities here... (Minimum 50 characters)"
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-sans leading-relaxed resize-y"
                  required
                />
                <div className="mt-1 flex justify-between text-xs text-slate-500 px-1">
                  <span>Minimum 50 chars</span>
                  <span className={`${description.length >= 50 ? 'text-green-400' : 'text-slate-500'}`}>
                    {description.length} characters
                  </span>
                </div>
              </div>

              {/* Form Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-gradient rounded-xl py-3.5 text-sm font-bold text-white shadow-lg focus:outline-none hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 transition-all duration-200"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Extracting Skills & Saving…
                    </>
                  ) : (
                    'Save Internship Details'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
