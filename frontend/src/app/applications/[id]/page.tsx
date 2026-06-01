'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getApplicationById, updateApplication } from '@/lib/application';

export default function EditApplicationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const appIdStr = params.id as string;
  const appId = parseInt(appIdStr, 10);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState('Saved');
  const [appliedDate, setAppliedDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadApplication() {
      if (isNaN(appId)) {
        setError('Invalid application ID.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await getApplicationById(appId);
        const app = res.application;
        setJobTitle(app.job.title);
        setCompany(app.job.company);
        setStatus(app.status);
        setNotes(app.notes || '');

        if (app.appliedDate) {
          // Format date as YYYY-MM-DD for standard html date picker input
          const dateObj = new Date(app.appliedDate);
          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(dateObj.getDate()).padStart(2, '0');
          setAppliedDate(`${yyyy}-${mm}-${dd}`);
        } else {
          setAppliedDate('');
        }
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.detail || 'Failed to fetch application details.');
      } finally {
        setLoading(false);
      }
    }

    if (user && appId) {
      loadApplication();
    }
  }, [user, appId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const parsedAppliedDate = appliedDate ? new Date(appliedDate).toISOString() : null;

      await updateApplication(appId, {
        status,
        appliedDate: parsedAppliedDate,
        notes: notes || undefined,
      });

      router.push('/applications');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to save application updates.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-[#0f172a] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-slate-400 font-medium animate-pulse">Syncing tracker files...</p>
        </div>
      </div>
    );
  }

  const statuses = ['Saved', 'Applied', 'Assessment', 'Interview', 'Rejected', 'Selected', 'Follow-up'];

  return (
    <div className="min-h-screen bg-[#0f172a] bg-gradient-to-b from-[#0f172a] via-[#1e1b4b]/10 to-[#0f172a] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        
        {/* Back navigation */}
        <Link
          href="/applications"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm font-semibold mb-6 transition-colors"
        >
          &larr; Back to Applications
        </Link>

        {/* Card Panel */}
        <div className="rounded-2xl border border-white/10 bg-[#151f32]/80 p-8 backdrop-blur-xl shadow-2xl">
          <div className="mb-8">
            <span className="text-xs font-black uppercase tracking-widest text-indigo-400">Tracker Modification</span>
            <h1 className="text-2xl font-black mt-1 text-white truncate" title={jobTitle}>
              Update {jobTitle}
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">{company}</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300 mb-6">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Status Select */}
            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-slate-300 mb-2">
                Application Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-purple-500 focus:outline-none transition-colors"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Applied Date (shows only if status is not Saved) */}
            <div>
              <label htmlFor="appliedDate" className="block text-sm font-semibold text-slate-300 mb-2">
                Applied Date
              </label>
              <input
                id="appliedDate"
                type="date"
                value={appliedDate}
                onChange={(e) => setAppliedDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-purple-500 focus:outline-none transition-colors"
              />
              <p className="text-[10px] text-slate-500 mt-1.5">
                Leave empty if you haven&apos;t officially submitted the application.
              </p>
            </div>

            {/* Custom Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-semibold text-slate-300 mb-2">
                Candidate Notes / Follow-up Details
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Log interviews, assessment questions, follow-up dates, or feedback received here..."
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-purple-500 focus:outline-none transition-colors text-sm"
              />
            </div>

            {/* Buttons Footer */}
            <div className="flex items-center justify-end gap-4 border-t border-white/5 pt-6 mt-8">
              <Link
                href="/applications"
                className="rounded-lg border border-white/10 bg-transparent px-5 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving Updates...' : '💾 Save Changes'}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
