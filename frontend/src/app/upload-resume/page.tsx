'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { uploadResume, ResumeData } from '@/lib/resume';

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

/* ─── Upload Cloud Icon ─── */
function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 4.502 4.502 0 013.516 5.855A3.75 3.75 0 0117.25 19.5H6.75z"
      />
    </svg>
  );
}

/* ─── Page ─── */
export default function UploadResumePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Validate selected file
  const validateFile = useCallback((f: File): string | null => {
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      return 'Only PDF files are allowed.';
    }
    if (f.size > 5 * 1024 * 1024) {
      return 'File size exceeds 5 MB limit.';
    }
    return null;
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(
    (f: File) => {
      const err = validateFile(f);
      if (err) {
        setError(err);
        setFile(null);
        return;
      }
      setError('');
      setSuccess('');
      setResumeData(null);
      setFile(f);
    },
    [validateFile]
  );

  // Drag handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files?.[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect]
  );

  // Upload handler
  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const data = await uploadResume(file);
      setSuccess(data.message);
      setResumeData(data.resume);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Failed to upload resume. Please try again.';
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  // Loading state
  if (loading) {
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
        className="animate-float"
        style={{
          width: 400,
          height: 400,
          top: '5%',
          left: '-8%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.3), transparent 70%)',
        }}
      />
      <FloatingOrb
        className="animate-float-slow"
        style={{
          width: 350,
          height: 350,
          bottom: '10%',
          right: '-5%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.25), transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold gradient-text mb-2">Upload Resume</h1>
          <p className="text-slate-400 text-sm">
            Upload your PDF resume to get started with AI-powered analysis
          </p>
        </div>

        {/* Upload Card */}
        <div className="glass-strong rounded-2xl p-8 glow-purple">
          {/* Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
              dragActive
                ? 'border-purple-400 bg-purple-500/10'
                : 'border-white/15 bg-white/[0.02] hover:border-purple-400/50 hover:bg-white/[0.04]'
            }`}
          >
            <UploadIcon
              className={`mx-auto mb-4 h-14 w-14 transition-colors duration-300 ${
                dragActive ? 'text-purple-400' : 'text-slate-500'
              }`}
            />
            <p className="text-sm font-medium text-slate-300 mb-1">
              Drag & drop your PDF resume here
            </p>
            <p className="text-xs text-slate-500">or click to browse • PDF only • Max 5 MB</p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
              }}
            />
          </div>

          {/* Selected File */}
          {file && (
            <div className="mt-5 flex items-center gap-3 rounded-lg bg-white/[0.04] border border-white/10 px-4 py-3">
              <span className="text-2xl">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{file.name}</p>
                <p className="text-xs text-slate-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                aria-label="Remove file"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-5 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 text-center">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mt-5 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400 text-center">
              ✅ {success}
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn-gradient mt-6 w-full rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {uploading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Uploading…
              </>
            ) : (
              <>
                <UploadIcon className="h-4 w-4" />
                Upload Resume
              </>
            )}
          </button>
        </div>

        {/* Extracted Text Preview */}
        {resumeData && (
          <div className="mt-8 glass-strong rounded-2xl p-6 glow-blue">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">📝 Extracted Text Preview</h2>
              <span className="text-xs text-slate-500">
                {resumeData.filename}
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto rounded-lg bg-black/30 border border-white/10 p-4">
              <pre className="whitespace-pre-wrap text-sm text-slate-300 font-mono leading-relaxed">
                {resumeData.extracted_text || 'No text could be extracted from this PDF.'}
              </pre>
            </div>
            <div className="mt-5 flex gap-3">
              <Link
                href="/resumes"
                className="btn-gradient flex-1 rounded-lg py-2.5 text-center text-sm font-semibold text-white"
              >
                View My Resumes
              </Link>
              <button
                onClick={() => {
                  setResumeData(null);
                  setSuccess('');
                }}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                Upload Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
