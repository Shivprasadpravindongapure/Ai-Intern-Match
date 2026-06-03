'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

/* ── Password strength calculator ── */
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'];
  return { score, label: labels[score] || '', color: colors[score] || '' };
}

/* ── OTP Input (6 boxes) ── */
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  const handleChange = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1);
    const arr = digits.map((x) => x);
    arr[i] = d;
    onChange(arr.join(''));
    if (d && i < 5) refs[i + 1].current?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus();
  };

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-white/5 text-white
                     border-white/20 focus:border-purple-500 focus:outline-none focus:bg-white/10
                     transition-all duration-200 caret-transparent"
        />
      ))}
    </div>
  );
}

export default function SignupPage() {
  const { signup, verifyOtp, resendOtp } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const strength = getPasswordStrength(password);

  /* ── Resend OTP cooldown timer ── */
  const startCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(t); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  /* ── Step 1: Signup ── */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) return setError('Full name is required.');
    if (!email.includes('@')) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    try {
      await signup(fullName, email, password);
      startCooldown();
      setStep(2);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: Verify OTP ── */
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.length < 6) return setError('Please enter the complete 6-digit OTP.');

    setLoading(true);
    try {
      await verifyOtp(email, otp);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Resend OTP ── */
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    try {
      await resendOtp(email);
      startCooldown();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Failed to resend OTP.');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-grid-pattern overflow-hidden">
      {/* Background orbs */}
      <div className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ top: '-10%', left: '-10%', background: 'radial-gradient(circle, rgba(124,58,237,0.4), transparent 70%)' }} />
      <div className="absolute w-[400px] h-[400px] rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ bottom: '-10%', right: '-5%', background: 'radial-gradient(circle, rgba(37,99,235,0.35), transparent 70%)' }} />

      <div className="relative w-full max-w-md z-10">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                ${step >= s ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-white/5 text-slate-500 border border-white/10'}`}>
                {step > s ? '✓' : s}
              </div>
              {s < 2 && (
                <div className={`h-0.5 w-16 rounded transition-all duration-500
                  ${step > s ? 'bg-gradient-to-r from-purple-600 to-blue-600' : 'bg-white/10'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="glass-strong rounded-2xl p-8 glow-purple">
          {/* Brand */}
          <div className="text-center mb-8">
            <span className="text-4xl">🧠</span>
            <h1 className="mt-2 text-2xl font-bold text-white">
              {step === 1 ? 'Create Account' : 'Verify Email'}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {step === 1
                ? 'Join thousands of job seekers powered by AI'
                : `We sent a 6-digit code to ${email}`}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* ── STEP 1: Account Details ── */}
          {step === 1 && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
                <input
                  type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Prasad Dongapure"
                  className="input-dark w-full rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600"
                  required autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="input-dark w-full rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="input-dark w-full rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600"
                  required
                />
                {password && (
                  <div className="mt-2">
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(strength.score / 5) * 100}%`, backgroundColor: strength.color }}
                      />
                    </div>
                    <p className="text-xs mt-1" style={{ color: strength.color }}>{strength.label}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirm Password</label>
                <input
                  type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className={`input-dark w-full rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600
                    ${confirmPassword && confirmPassword !== password ? 'border-red-500/50' : ''}`}
                  required
                />
              </div>
              <button type="submit" disabled={loading}
                className="btn-gradient w-full rounded-xl py-3.5 text-sm font-semibold text-white mt-2
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating Account...</>
                ) : 'Continue →'}
              </button>
            </form>
          )}

          {/* ── STEP 2: OTP Verification ── */}
          {step === 2 && (
            <form onSubmit={handleVerify} className="space-y-6">
              <OtpInput value={otp} onChange={setOtp} />
              <button type="submit" disabled={loading || otp.length < 6}
                className="btn-gradient w-full rounded-xl py-3.5 text-sm font-semibold text-white
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying...</>
                ) : 'Verify & Continue 🚀'}
              </button>
              <div className="text-center">
                <button type="button" onClick={handleResend} disabled={resendCooldown > 0}
                  className="text-sm text-slate-400 hover:text-purple-400 transition-colors disabled:text-slate-600 disabled:cursor-not-allowed">
                  {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Didn't receive it? Resend OTP"}
                </button>
              </div>
              <button type="button" onClick={() => { setStep(1); setOtp(''); setError(''); }}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-400 transition-colors">
                ← Change email address
              </button>
            </form>
          )}

          {/* Footer */}
          {step === 1 && (
            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-600">
          By signing up you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
