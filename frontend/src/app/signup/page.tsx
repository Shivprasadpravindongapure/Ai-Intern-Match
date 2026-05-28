'use client';

import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

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

/* ─── Eye Icons ─── */
function EyeIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeSlashIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

/* ─── Page ─── */
export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ── Client Validation ── */
  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2)
      next.fullName = 'Full name must be at least 2 characters';

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) next.email = 'Email is required';
    else if (!emailRe.test(email)) next.email = 'Enter a valid email address';

    if (!password) next.password = 'Password is required';
    else if (password.length < 6)
      next.password = 'Password must be at least 6 characters';

    if (password !== confirmPassword)
      next.confirmPassword = 'Passwords do not match';

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  /* ── Submit ── */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      await signup(fullName.trim(), email.trim(), password);
      setSuccess(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Something went wrong. Please try again.';
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12 bg-grid-pattern">
      {/* Floating orbs */}
      <FloatingOrb
        className="animate-float-slow"
        style={{
          width: 400,
          height: 400,
          top: '-10%',
          right: '-5%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.3), transparent 70%)',
        }}
      />
      <FloatingOrb
        className="animate-float"
        style={{
          width: 300,
          height: 300,
          bottom: '0%',
          left: '-5%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.25), transparent 70%)',
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md glass-strong rounded-2xl p-8 sm:p-10 glow-purple">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold gradient-text mb-2">Create Account</h1>
          <p className="text-slate-400 text-sm">Join SkillProof AI and launch your career</p>
        </div>

        {/* Success toast */}
        {success && (
          <div className="mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400 text-center">
            🎉 Account created! Redirecting to login…
          </div>
        )}

        {/* API error */}
        {apiError && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 text-center">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-slate-300">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              className="input-dark w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-500"
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-red-400">{errors.fullName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-dark w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-500"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-400">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-300">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-dark w-full rounded-lg px-4 py-2.5 pr-10 text-sm text-white placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-400">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-300">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="input-dark w-full rounded-lg px-4 py-2.5 pr-10 text-sm text-white placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || success}
            className="btn-gradient w-full rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Creating Account…
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-purple-400 hover:text-purple-300 transition-colors">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
