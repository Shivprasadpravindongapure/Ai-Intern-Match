'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

/* ─── Feature data ─── */
const features = [
  {
    icon: '📄',
    title: 'Smart Resume Analysis',
    description: 'Upload your resume and get instant AI-powered analysis with detailed feedback on content, structure, and impact.',
  },
  {
    icon: '🎯',
    title: 'Internship Matching',
    description: 'Match with the perfect internships based on your skills, experience, and career goals using intelligent algorithms.',
  },
  {
    icon: '📊',
    title: 'ATS Score Optimization',
    description: 'Optimize your resume for Applicant Tracking Systems and dramatically increase your interview callback rate.',
  },
  {
    icon: '🔍',
    title: 'Missing Skills Detection',
    description: 'Identify critical skill gaps between your profile and target roles, with personalized improvement suggestions.',
  },
  {
    icon: '📋',
    title: 'Application Tracker',
    description: 'Track all your applications in one beautiful dashboard — status, deadlines, and follow-ups at a glance.',
  },
];

/* ─── Floating Orb Component ─── */
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

/* ─── Page ─── */
export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="relative overflow-hidden bg-grid-pattern">
      {/* ════════ Floating background orbs ════════ */}
      <FloatingOrb
        className="animate-float-slow"
        style={{
          width: 500,
          height: 500,
          top: '-5%',
          left: '-8%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.35), transparent 70%)',
        }}
      />
      <FloatingOrb
        className="animate-float"
        style={{
          width: 400,
          height: 400,
          top: '20%',
          right: '-5%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.3), transparent 70%)',
        }}
      />
      <FloatingOrb
        className="animate-float-slow"
        style={{
          width: 350,
          height: 350,
          bottom: '10%',
          left: '15%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.25), transparent 70%)',
          animationDelay: '3s',
        }}
      />

      {/* ════════ Hero Section ════════ */}
      <section className="relative mx-auto flex min-h-[85vh] max-w-7xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6 lg:px-8">
        {/* Decorative ring */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.04] animate-spin-slow pointer-events-none"
          style={{ width: 700, height: 700 }}
          aria-hidden
        />

        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-80 animate-pulse rounded-lg bg-white/10" />
            <div className="h-6 w-60 animate-pulse rounded-lg bg-white/5" />
          </div>
        ) : user ? (
          <>
            <span className="mb-4 inline-block rounded-full bg-purple-500/10 px-4 py-1.5 text-sm font-medium text-purple-300 ring-1 ring-purple-500/20">
              ✨ Welcome back
            </span>
            <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              <span className="gradient-text-animated">
                Welcome back, {user.full_name.split(' ')[0]}!
              </span>
            </h1>
            <p className="mb-10 max-w-2xl text-lg text-slate-400">
              Ready to supercharge your career journey? Your AI assistant is standing by.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/upload-resume"
                className="btn-gradient inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-base font-semibold text-white"
              >
                Upload Resume
                <svg
                  className="ml-2 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 4.502 4.502 0 013.516 5.855A3.75 3.75 0 0117.25 19.5H6.75z" />
                </svg>
              </Link>
              <Link
                href="/resumes"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-semibold text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white"
              >
                My Resumes
              </Link>
            </div>
          </>
        ) : (
          <>
            <span className="mb-4 inline-block rounded-full bg-purple-500/10 px-4 py-1.5 text-sm font-medium text-purple-300 ring-1 ring-purple-500/20">
              🚀 AI-Powered Career Platform
            </span>
            <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-7xl">
              Your{' '}
              <span className="gradient-text-animated">AI-Powered</span>
              <br />
              Career Launchpad
            </h1>
            <p className="mb-10 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
              Upload your resume, match with top internships, optimize for ATS,
              and discover the skills you need — all powered by cutting-edge AI.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="btn-gradient inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-base font-semibold text-white"
              >
                Get Started
                <svg
                  className="ml-2 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-semibold text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white"
              >
                Learn More
              </a>
            </div>
          </>
        )}
      </section>

      {/* ════════ Features Section ════════ */}
      <section
        id="features"
        className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8"
      >
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to{' '}
            <span className="gradient-text">Stand Out</span>
          </h2>
          <p className="mx-auto max-w-2xl text-slate-400">
            Powerful AI tools designed to give you an unfair advantage in the
            internship hunt.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass card-hover gradient-border group rounded-2xl p-6"
            >
              <span className="mb-4 inline-block text-4xl transition-transform duration-300 group-hover:scale-110">
                {f.icon}
              </span>
              <h3 className="mb-2 text-lg font-semibold text-white">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-400">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════ Logged-in Announcement Card ════════ */}
      {user && (
        <section className="relative mx-auto max-w-3xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="glass-strong glow-purple rounded-2xl p-8 text-center">
            <span className="mb-4 inline-block text-5xl">📄</span>
            <h3 className="mb-3 text-2xl font-bold gradient-text">
              Resume Analyzer — Now Live!
            </h3>
            <p className="text-slate-400 leading-relaxed mb-6">
              Upload your resume and get instant AI-powered text extraction.
              View, manage, and analyze all your resumes in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/upload-resume"
                className="btn-gradient inline-flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white"
              >
                Upload Resume
              </Link>
              <Link
                href="/resumes"
                className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white"
              >
                View My Resumes
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ════════ Footer ════════ */}
      <footer className="border-t border-white/5 py-8">
        <p className="text-center text-sm text-slate-500">
          Built with ❤️ by SkillProof AI Team &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
