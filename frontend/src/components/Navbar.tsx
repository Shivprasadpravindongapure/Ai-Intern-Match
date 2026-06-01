'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

/* ─── Nav link data for authenticated users ─── */
const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/upload-resume', label: 'Upload Resume' },
  { href: '/resumes', label: 'My Resumes' },
  { href: '/jobs/new', label: 'Add Job' },
  { href: '/jobs', label: 'My Jobs' },
  { href: '/applications', label: 'Applications' },
  { href: '/profile/connect', label: 'Profiles' },
];

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const firstName = user?.full_name?.split(' ')[0] ?? '';

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0f172a]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl" aria-hidden>🧠</span>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-blue-400 bg-clip-text text-transparent transition-all duration-300 group-hover:from-purple-300 group-hover:to-cyan-300">
            SkillProof AI
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {loading ? (
            <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
          ) : user ? (
            <>
              {/* Navigation Links */}
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-purple-500/15 text-purple-300'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {/* Divider */}
              <div className="mx-2 h-5 w-px bg-white/10" />

              {/* User info & Logout */}
              <span className="text-sm text-slate-300 mr-1">
                Hi, <span className="font-semibold text-white">{firstName}</span>
              </span>
              <button
                onClick={logout}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white hover:border-white/20 cursor-pointer"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white hover:border-white/20"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="ml-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:from-purple-500 hover:to-blue-500 hover:shadow-lg hover:shadow-purple-500/25"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex flex-col gap-1.5 p-2 cursor-pointer"
          aria-label="Toggle menu"
        >
          <span
            className={`block h-0.5 w-6 rounded bg-white transition-all duration-300 ${
              mobileOpen ? 'translate-y-2 rotate-45' : ''
            }`}
          />
          <span
            className={`block h-0.5 w-6 rounded bg-white transition-all duration-300 ${
              mobileOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`block h-0.5 w-6 rounded bg-white transition-all duration-300 ${
              mobileOpen ? '-translate-y-2 -rotate-45' : ''
            }`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          mobileOpen ? 'max-h-80 border-t border-white/10' : 'max-h-0'
        }`}
      >
        <div className="flex flex-col gap-2 px-4 py-4">
          {loading ? (
            <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
          ) : user ? (
            <>
              <span className="text-sm text-slate-300 mb-1">
                Welcome, <span className="font-semibold text-white">{firstName}</span>
              </span>

              {/* Mobile Navigation Links */}
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-purple-500/15 text-purple-300'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              <button
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white cursor-pointer mt-1"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="w-full rounded-lg border border-white/10 bg-transparent px-4 py-2 text-center text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white"
              >
                Login
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-center text-sm font-medium text-white transition-all duration-200 hover:from-purple-500 hover:to-blue-500"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
