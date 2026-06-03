'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login, resendOtp } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notVerified, setNotVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotVerified(false);

    if (!email || !password) return setError('Please enter email and password.');

    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      if (detail === 'EMAIL_NOT_VERIFIED') {
        setNotVerified(true);
      } else {
        setError(detail || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    try {
      await resendOtp(email);
      setResendSent(true);
      // Redirect to signup step 2 equivalent — since we don't have a standalone verify page,
      // push to signup with email pre-filled would need state management;
      // instead we confirm OTP was sent
    } catch {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-grid-pattern overflow-hidden">
      {/* Background orbs */}
      <div className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ top: '-10%', right: '-10%', background: 'radial-gradient(circle, rgba(37,99,235,0.4), transparent 70%)' }} />
      <div className="absolute w-[400px] h-[400px] rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ bottom: '-10%', left: '-5%', background: 'radial-gradient(circle, rgba(124,58,237,0.35), transparent 70%)' }} />

      <div className="relative w-full max-w-md z-10">
        <div className="glass-strong rounded-2xl p-8 glow-blue">
          {/* Brand */}
          <div className="text-center mb-8">
            <span className="text-4xl">🧠</span>
            <h1 className="mt-2 text-2xl font-bold text-white">Welcome Back</h1>
            <p className="mt-1 text-sm text-slate-400">Sign in to your SkillProof AI account</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Email Not Verified Banner */}
          {notVerified && (
            <div className="mb-5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-4">
              <p className="text-sm text-amber-400 font-medium mb-2">
                ⚠️ Email not verified
              </p>
              <p className="text-xs text-slate-400 mb-3">
                Your account hasn&apos;t been verified yet. Please check your email for the OTP or request a new one.
              </p>
              {resendSent ? (
                <p className="text-xs text-green-400 font-medium">
                  ✅ New OTP sent to {email}. Check your inbox!
                </p>
              ) : (
                <button
                  onClick={handleResendOtp}
                  disabled={resendLoading || !email}
                  className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors
                             disabled:text-slate-600 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {resendLoading
                    ? <><span className="w-3 h-3 border border-purple-400/30 border-t-purple-400 rounded-full animate-spin" /> Sending...</>
                    : '→ Resend verification OTP'}
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                className="input-dark w-full rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600"
                required autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="input-dark w-full rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600"
                required
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="btn-gradient w-full rounded-xl py-3.5 text-sm font-semibold text-white mt-2
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</>
                : 'Sign In →'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
              onClick={() => setError('Please contact support at prasaddongapure7660@gmail.com to reset your password.')}
            >
              Forgot password?
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
