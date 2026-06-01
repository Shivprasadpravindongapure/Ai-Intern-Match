'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getProfile, saveProfile, analyzeProfile, UserProfileResponseData } from '@/lib/profile';

export default function ConnectedProfilesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Profile data states
  const [profile, setProfile] = useState<UserProfileResponseData | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [leetcodeUrl, setLeetcodeUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [codechefUrl, setCodechefUrl] = useState('');
  const [hackerrankUrl, setHackerrankUrl] = useState('');

  // UI status states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getProfile();
      if (res.profile) {
        setProfile(res.profile);
        setLinkedinUrl(res.profile.linkedinUrl || '');
        setGithubUrl(res.profile.githubUrl || '');
        setLeetcodeUrl(res.profile.leetcodeUrl || '');
        setPortfolioUrl(res.profile.portfolioUrl || '');
        setCodechefUrl(res.profile.codechefUrl || '');
        setHackerrankUrl(res.profile.hackerrankUrl || '');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to load connected profiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Basic inline URL checks
    if (linkedinUrl && !linkedinUrl.toLowerCase().includes('linkedin.com')) {
      setError('LinkedIn URL must contain "linkedin.com".');
      setSaving(false);
      return;
    }
    if (githubUrl && !githubUrl.toLowerCase().includes('github.com')) {
      setError('GitHub URL must contain "github.com".');
      setSaving(false);
      return;
    }
    if (leetcodeUrl && !leetcodeUrl.toLowerCase().includes('leetcode.com')) {
      setError('LeetCode URL must contain "leetcode.com".');
      setSaving(false);
      return;
    }
    if (codechefUrl && !codechefUrl.toLowerCase().includes('codechef.com')) {
      setError('CodeChef URL must contain "codechef.com".');
      setSaving(false);
      return;
    }
    if (hackerrankUrl && !hackerrankUrl.toLowerCase().includes('hackerrank.com')) {
      setError('HackerRank URL must contain "hackerrank.com".');
      setSaving(false);
      return;
    }

    try {
      const res = await saveProfile({
        linkedinUrl: linkedinUrl || undefined,
        githubUrl: githubUrl || undefined,
        leetcodeUrl: leetcodeUrl || undefined,
        portfolioUrl: portfolioUrl || undefined,
        codechefUrl: codechefUrl || undefined,
        hackerrankUrl: hackerrankUrl || undefined,
      });
      setProfile(res.profile);
      setSuccess('Profile links successfully connected!');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to save connected profiles.');
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!profile) {
      setError('Please connect and save your profile links first.');
      return;
    }
    setAnalyzing(true);
    setError(null);
    setSuccess(null);
    try {
      await analyzeProfile();
      router.push('/profile/analysis');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          'Failed to perform public fetching profile analysis. Ensure you have parsed a resume.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-[#0f172a] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <p className="text-slate-400 font-medium animate-pulse">Syncing profile connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] bg-gradient-to-b from-[#0f172a] via-[#1e1b4b]/20 to-[#0f172a] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">
              Connected Profiles
            </h1>
            <p className="mt-1 text-slate-400 text-sm">
              Link your professional platforms to let our AI scan public repositories and generate resume update suggestions.
            </p>
          </div>
          {profile && (
            <Link
              href="/profile/analysis"
              className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-4 py-2.5 text-sm font-semibold text-purple-300 transition-colors hover:bg-purple-500/20 self-start sm:self-center"
            >
              📊 View Suggestions
            </Link>
          )}
        </div>

        {/* Form Panel */}
        <div className="rounded-2xl border border-white/10 bg-[#151f32]/80 p-8 backdrop-blur-xl shadow-2xl">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300 mb-6">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300 mb-6">
              ✔️ {success}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* LinkedIn */}
              <div>
                <label htmlFor="linkedin" className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                  LinkedIn URL
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-sm" aria-hidden>🔗</span>
                  <input
                    id="linkedin"
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/in/username"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 pl-11 pr-4 py-3 text-sm text-white focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* GitHub */}
              <div>
                <label htmlFor="github" className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                  GitHub URL
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-sm" aria-hidden>🐙</span>
                  <input
                    id="github"
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 pl-11 pr-4 py-3 text-sm text-white focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* LeetCode */}
              <div>
                <label htmlFor="leetcode" className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                  LeetCode URL
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-sm" aria-hidden>📝</span>
                  <input
                    id="leetcode"
                    type="url"
                    value={leetcodeUrl}
                    onChange={(e) => setLeetcodeUrl(e.target.value)}
                    placeholder="https://leetcode.com/username"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 pl-11 pr-4 py-3 text-sm text-white focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Portfolio */}
              <div>
                <label htmlFor="portfolio" className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                  Personal Portfolio / Deployed site
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-sm" aria-hidden>💼</span>
                  <input
                    id="portfolio"
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://myportfolio.dev"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 pl-11 pr-4 py-3 text-sm text-white focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* CodeChef */}
              <div>
                <label htmlFor="codechef" className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                  CodeChef URL
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-sm" aria-hidden>🍳</span>
                  <input
                    id="codechef"
                    type="url"
                    value={codechefUrl}
                    onChange={(e) => setCodechefUrl(e.target.value)}
                    placeholder="https://www.codechef.com/users/username"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 pl-11 pr-4 py-3 text-sm text-white focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* HackerRank */}
              <div>
                <label htmlFor="hackerrank" className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                  HackerRank URL
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-sm" aria-hidden>💻</span>
                  <input
                    id="hackerrank"
                    type="url"
                    value={hackerrankUrl}
                    onChange={(e) => setHackerrankUrl(e.target.value)}
                    placeholder="https://www.hackerrank.com/profile/username"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 pl-11 pr-4 py-3 text-sm text-white focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

            </div>

            {/* Timestamps if analyzed */}
            {profile?.lastAnalyzedAt && (
              <p className="text-[10px] text-slate-500">
                Last analyzed on {new Date(profile.lastAnalyzedAt).toLocaleString()}
              </p>
            )}

            {/* Actions Panel */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-white/5 pt-6 mt-8">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto rounded-xl bg-white/5 border border-white/10 px-6 py-3 text-xs font-bold hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Connecting...' : '💾 Save Profiles'}
              </button>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing || !profile}
                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {analyzing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing repos...
                  </>
                ) : (
                  '⚡ Analyze Public Activities'
                )}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
