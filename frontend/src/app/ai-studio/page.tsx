'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import API from '@/lib/api';
import {
  analyzeResume, analyzeJD, resumeVsJD,
  generateCoverLetter, generateInterviewPrep, chatWithAI,
  type AIAnalysis, type JDAnalysis, type ResumeVsJD, type InterviewQuestion,
} from '@/lib/ai';

/* ── Types ── */
interface Resume { id: number; filename: string; ai_score?: number; }
interface ChatMsg { role: 'user' | 'ai'; text: string; }

const TABS = [
  { id: 'resume', label: 'Resume Analyzer', icon: '📊' },
  { id: 'jd', label: 'JD Analyzer', icon: '🔍' },
  { id: 'compare', label: 'Resume vs JD', icon: '⚡' },
  { id: 'cover', label: 'Cover Letter', icon: '📝' },
  { id: 'interview', label: 'Interview Prep', icon: '🎯' },
  { id: 'chat', label: 'AI Chat', icon: '💬' },
];

const SUGGESTED_QUESTIONS = [
  'How do I improve my resume ATS score?',
  'What skills should I learn for a Frontend role in 2024?',
  'How do I negotiate salary as a fresher?',
  'What are the best platforms to apply for internships in India?',
];

/* ── Score Circle ── */
function ScoreCircle({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold text-white">{score}</div>
        <div className="text-xs text-slate-400">/100</div>
      </div>
    </div>
  );
}

/* ── Skill Tag ── */
function Tag({ text, color = 'purple' }: { text: string; color?: string }) {
  const cls: Record<string, string> = {
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
    green:  'bg-green-500/10 border-green-500/20 text-green-300',
    red:    'bg-red-500/10 border-red-500/20 text-red-300',
    blue:   'bg-blue-500/10 border-blue-500/20 text-blue-300',
    amber:  'bg-amber-500/10 border-amber-500/20 text-amber-300',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cls[color] || cls.purple}`}>
      {text}
    </span>
  );
}

/* ── Loading Spinner ── */
function Spinner({ text = 'Analysing with Gemini AI...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">🧠</div>
      </div>
      <p className="text-sm text-slate-400 animate-pulse">{text}</p>
    </div>
  );
}

export default function AIStudioPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('resume');
  const [resumes, setResumes] = useState<Resume[]>([]);

  /* Resume Analyzer state */
  const [selectedResume, setSelectedResume] = useState('');
  const [resumeAnalysis, setResumeAnalysis] = useState<AIAnalysis | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState('');

  /* JD Analyzer state */
  const [jdText, setJdText] = useState('');
  const [jdAnalysis, setJdAnalysis] = useState<JDAnalysis | null>(null);
  const [jdLoading, setJdLoading] = useState(false);

  /* Resume vs JD state */
  const [compareResume, setCompareResume] = useState('');
  const [compareJD, setCompareJD] = useState('');
  const [comparison, setComparison] = useState<ResumeVsJD | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  /* Cover Letter state */
  const [clResume, setClResume] = useState('');
  const [clCompany, setClCompany] = useState('');
  const [clRole, setClRole] = useState('');
  const [clJD, setClJD] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [clLoading, setClLoading] = useState(false);

  /* Interview Prep state */
  const [ipRole, setIpRole] = useState('');
  const [ipJD, setIpJD] = useState('');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [ipLoading, setIpLoading] = useState(false);
  const [openQ, setOpenQ] = useState<number | null>(null);

  /* Chat state */
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { role: 'ai', text: "Hi! I'm SkillBot, your AI career assistant. Ask me anything about resumes, jobs, interviews, or career growth! 🚀" }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      API.get('/api/resumes').then((r) => setResumes(r.data.resumes || [])).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  /* ── Handlers ── */
  const handleAnalyzeResume = async () => {
    if (!selectedResume) return setResumeError('Please select a resume.');
    setResumeLoading(true); setResumeError(''); setResumeAnalysis(null);
    try {
      const res = await analyzeResume(Number(selectedResume));
      setResumeAnalysis(res.analysis);
    } catch { setResumeError('AI analysis failed. Please try again.'); }
    finally { setResumeLoading(false); }
  };

  const handleAnalyzeJD = async () => {
    if (jdText.trim().length < 30) return;
    setJdLoading(true); setJdAnalysis(null);
    try { const res = await analyzeJD(jdText); setJdAnalysis(res.analysis); }
    catch { } finally { setJdLoading(false); }
  };

  const handleCompare = async () => {
    if (!compareResume || compareJD.trim().length < 30) return;
    setCompareLoading(true); setComparison(null);
    try { const res = await resumeVsJD(Number(compareResume), compareJD); setComparison(res.comparison); }
    catch { } finally { setCompareLoading(false); }
  };

  const handleCoverLetter = async () => {
    if (!clResume || !clCompany || !clRole) return;
    setClLoading(true); setCoverLetter('');
    try { const res = await generateCoverLetter(Number(clResume), clRole, clCompany, clJD); setCoverLetter(res.cover_letter); }
    catch { } finally { setClLoading(false); }
  };

  const handleInterviewPrep = async () => {
    if (!ipRole || ipJD.trim().length < 30) return;
    setIpLoading(true); setQuestions([]);
    try { const res = await generateInterviewPrep(ipJD, ipRole); setQuestions(res.questions); }
    catch { } finally { setIpLoading(false); }
  };

  const handleChat = async (msg?: string) => {
    const text = (msg || chatInput).trim();
    if (!text || chatLoading) return;
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text }]);
    setChatLoading(true);
    try {
      const res = await chatWithAI(text);
      setChatMessages((prev) => [...prev, { role: 'ai', text: res.reply }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: 'ai', text: "Sorry, I couldn't connect right now. Please try again." }]);
    } finally { setChatLoading(false); }
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-grid-pattern">
      <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text-animated">AI Studio</h1>
          <p className="text-slate-400 mt-1">Powered by Google Gemini 1.5 Flash — All features are real-time</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer
                ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25'
                  : 'glass text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Resume Analyzer ── */}
        {activeTab === 'resume' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Select Resume</h2>
              {resumes.length === 0 ? (
                <p className="text-slate-400 text-sm">No resumes found. <a href="/upload-resume" className="text-purple-400 hover:underline">Upload one first</a>.</p>
              ) : (
                <select value={selectedResume} onChange={(e) => setSelectedResume(e.target.value)}
                  className="input-dark w-full rounded-xl px-4 py-3 text-white text-sm mb-4 cursor-pointer">
                  <option value="">-- Select a resume --</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>{r.filename} {r.ai_score ? `(Score: ${r.ai_score})` : ''}</option>
                  ))}
                </select>
              )}
              {resumeError && <p className="text-red-400 text-sm mb-3">{resumeError}</p>}
              <button onClick={handleAnalyzeResume} disabled={resumeLoading || !selectedResume}
                className="btn-gradient w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed">
                {resumeLoading ? '⏳ Analysing...' : '🧠 Analyse with Gemini AI'}
              </button>
            </div>

            <div className="glass rounded-2xl p-6">
              {resumeLoading && <Spinner text="Gemini is reading your resume..." />}
              {!resumeLoading && !resumeAnalysis && (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <span className="text-5xl mb-3">📊</span>
                  <p className="text-slate-400 text-sm">Select a resume and click Analyse to see your AI report.</p>
                </div>
              )}
              {resumeAnalysis && (
                <div className="space-y-5">
                  <div className="flex items-center gap-5">
                    <ScoreCircle score={resumeAnalysis.score} />
                    <div>
                      <h3 className="font-semibold text-white text-lg">AI Score</h3>
                      <p className="text-slate-400 text-sm mt-1">{resumeAnalysis.summary}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-green-400 uppercase tracking-wider mb-2">Strengths</p>
                    <ul className="space-y-1">{resumeAnalysis.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-slate-300 flex gap-2"><span className="text-green-400">✓</span>{s}</li>
                    ))}</ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-2">Weaknesses</p>
                    <ul className="space-y-1">{resumeAnalysis.weaknesses.map((s, i) => (
                      <li key={i} className="text-sm text-slate-300 flex gap-2"><span className="text-red-400">✗</span>{s}</li>
                    ))}</ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-2">Suggestions</p>
                    <ul className="space-y-1">{resumeAnalysis.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-slate-300 flex gap-2"><span className="text-amber-400">→</span>{s}</li>
                    ))}</ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-400 uppercase tracking-wider mb-2">ATS Keywords</p>
                    <div className="flex flex-wrap gap-2">{resumeAnalysis.ats_keywords.map((k, i) => <Tag key={i} text={k} color="blue" />)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: JD Analyzer ── */}
        {activeTab === 'jd' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Paste Job Description</h2>
              <textarea value={jdText} onChange={(e) => setJdText(e.target.value)}
                rows={12} placeholder="Paste the full job description here..."
                className="input-dark w-full rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 resize-none" />
              <button onClick={handleAnalyzeJD} disabled={jdLoading || jdText.trim().length < 30}
                className="btn-gradient w-full rounded-xl py-3 text-sm font-semibold text-white mt-4 disabled:opacity-50 disabled:cursor-not-allowed">
                {jdLoading ? '⏳ Analysing...' : '🔍 Analyse Job Description'}
              </button>
            </div>
            <div className="glass rounded-2xl p-6">
              {jdLoading && <Spinner text="Extracting insights from JD..." />}
              {!jdLoading && !jdAnalysis && (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <span className="text-5xl mb-3">🔍</span>
                  <p className="text-slate-400 text-sm">Paste a job description and click Analyse.</p>
                </div>
              )}
              {jdAnalysis && (
                <div className="space-y-5">
                  <div className="flex gap-3 flex-wrap">
                    <span className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 font-medium">
                      {jdAnalysis.experience_level}
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 font-medium">
                      {jdAnalysis.role_type}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-green-400 uppercase tracking-wider mb-2">Required Skills</p>
                    <div className="flex flex-wrap gap-2">{jdAnalysis.required_skills.map((s, i) => <Tag key={i} text={s} color="green" />)}</div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-400 uppercase tracking-wider mb-2">Nice to Have</p>
                    <div className="flex flex-wrap gap-2">{jdAnalysis.nice_to_have.map((s, i) => <Tag key={i} text={s} color="blue" />)}</div>
                  </div>
                  {jdAnalysis.red_flags.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-2">⚠️ Red Flags</p>
                      <div className="flex flex-wrap gap-2">{jdAnalysis.red_flags.map((s, i) => <Tag key={i} text={s} color="red" />)}</div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Responsibilities</p>
                    <ul className="space-y-1">{jdAnalysis.responsibilities.map((r, i) => (
                      <li key={i} className="text-sm text-slate-300 flex gap-2"><span className="text-slate-500">•</span>{r}</li>
                    ))}</ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Resume vs JD ── */}
        {activeTab === 'compare' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Compare Resume vs JD</h2>
              <select value={compareResume} onChange={(e) => setCompareResume(e.target.value)}
                className="input-dark w-full rounded-xl px-4 py-3 text-white text-sm cursor-pointer">
                <option value="">-- Select resume --</option>
                {resumes.map((r) => <option key={r.id} value={r.id}>{r.filename}</option>)}
              </select>
              <textarea value={compareJD} onChange={(e) => setCompareJD(e.target.value)}
                rows={10} placeholder="Paste the job description..."
                className="input-dark w-full rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 resize-none" />
              <button onClick={handleCompare} disabled={compareLoading || !compareResume || compareJD.trim().length < 30}
                className="btn-gradient w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed">
                {compareLoading ? '⏳ Comparing...' : '⚡ Compare Now'}
              </button>
            </div>
            <div className="glass rounded-2xl p-6">
              {compareLoading && <Spinner text="Comparing your resume vs the JD..." />}
              {!compareLoading && !comparison && (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <span className="text-5xl mb-3">⚡</span>
                  <p className="text-slate-400 text-sm">Select a resume and paste a JD to compare.</p>
                </div>
              )}
              {comparison && (
                <div className="space-y-5">
                  <div className="flex items-center gap-5">
                    <ScoreCircle score={comparison.match_score} size={100} />
                    <div>
                      <h3 className="font-semibold text-white">Match Score</h3>
                      <p className="text-sm text-slate-400 mt-1">{comparison.verdict}</p>
                    </div>
                  </div>
                  {comparison.tailored_summary && (
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                      <p className="text-xs font-medium text-purple-400 uppercase mb-2">Tailored Summary for This Role</p>
                      <p className="text-sm text-slate-300">{comparison.tailored_summary}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-green-400 uppercase mb-2">Matched Skills</p>
                      <div className="flex flex-wrap gap-1.5">{comparison.matched_skills.map((s, i) => <Tag key={i} text={s} color="green" />)}</div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-red-400 uppercase mb-2">Missing Skills</p>
                      <div className="flex flex-wrap gap-1.5">{comparison.missing_skills.map((s, i) => <Tag key={i} text={s} color="red" />)}</div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-amber-400 uppercase mb-2">Improvement Tips</p>
                    <ul className="space-y-1">{comparison.improvement_tips.map((t, i) => (
                      <li key={i} className="text-sm text-slate-300 flex gap-2"><span className="text-amber-400">→</span>{t}</li>
                    ))}</ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Cover Letter ── */}
        {activeTab === 'cover' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Generate Cover Letter</h2>
              <select value={clResume} onChange={(e) => setClResume(e.target.value)}
                className="input-dark w-full rounded-xl px-4 py-3 text-white text-sm cursor-pointer">
                <option value="">-- Select resume --</option>
                {resumes.map((r) => <option key={r.id} value={r.id}>{r.filename}</option>)}
              </select>
              <input value={clCompany} onChange={(e) => setClCompany(e.target.value)}
                placeholder="Company Name (e.g. Google India)"
                className="input-dark w-full rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600" />
              <input value={clRole} onChange={(e) => setClRole(e.target.value)}
                placeholder="Job Title (e.g. Software Engineer Intern)"
                className="input-dark w-full rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600" />
              <textarea value={clJD} onChange={(e) => setClJD(e.target.value)}
                rows={6} placeholder="Paste job description (optional but recommended)..."
                className="input-dark w-full rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 resize-none" />
              <button onClick={handleCoverLetter} disabled={clLoading || !clResume || !clCompany || !clRole}
                className="btn-gradient w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed">
                {clLoading ? '⏳ Writing...' : '📝 Generate Cover Letter'}
              </button>
            </div>
            <div className="glass rounded-2xl p-6">
              {clLoading && <Spinner text="Writing your cover letter..." />}
              {!clLoading && !coverLetter && (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <span className="text-5xl mb-3">📝</span>
                  <p className="text-slate-400 text-sm">Fill in the details and generate your personalised cover letter.</p>
                </div>
              )}
              {coverLetter && (
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-white">Your Cover Letter</h3>
                    <button onClick={() => navigator.clipboard.writeText(coverLetter)}
                      className="text-xs text-purple-400 hover:text-purple-300 border border-purple-500/20 rounded-lg px-3 py-1.5 transition-colors">
                      📋 Copy
                    </button>
                  </div>
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap flex-1 overflow-y-auto leading-relaxed">
                    {coverLetter}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Interview Prep ── */}
        {activeTab === 'interview' && (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Interview Preparation Generator</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <input value={ipRole} onChange={(e) => setIpRole(e.target.value)}
                  placeholder="Role (e.g. Frontend Engineer)"
                  className="input-dark rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600" />
                <button onClick={handleInterviewPrep} disabled={ipLoading || !ipRole || ipJD.trim().length < 20}
                  className="btn-gradient rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed">
                  {ipLoading ? '⏳ Generating...' : '🎯 Generate 10 Q&As'}
                </button>
              </div>
              <textarea value={ipJD} onChange={(e) => setIpJD(e.target.value)}
                rows={5} placeholder="Paste job description for targeted questions..."
                className="input-dark w-full rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 resize-none mt-4" />
            </div>

            {ipLoading && <div className="glass rounded-2xl p-6"><Spinner text="Generating interview questions..." /></div>}

            {questions.length > 0 && (
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={i} className="glass rounded-xl overflow-hidden card-hover">
                    <button onClick={() => setOpenQ(openQ === i ? null : i)}
                      className="w-full flex items-center gap-4 p-4 text-left cursor-pointer hover:bg-white/5 transition-colors">
                      <span className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-white font-medium flex-1">{q.question}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium
                          ${q.category === 'Technical' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                          : q.category === 'Behavioral' ? 'bg-green-500/10 border-green-500/20 text-green-400'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                          {q.category}
                        </span>
                        <span className="text-slate-400 text-xs">{openQ === i ? '▲' : '▼'}</span>
                      </div>
                    </button>
                    {openQ === i && (
                      <div className="px-5 pb-4 border-t border-white/5">
                        <p className="text-xs font-medium text-purple-400 mt-3 mb-2">MODEL ANSWER</p>
                        <p className="text-sm text-slate-300 leading-relaxed">{q.model_answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: AI Chat ── */}
        {activeTab === 'chat' && (
          <div className="glass rounded-2xl flex flex-col" style={{ height: '70vh' }}>
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <h2 className="font-semibold text-white text-sm">SkillBot</h2>
                <p className="text-xs text-green-400">● Online — Powered by Gemini AI</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-br-sm'
                      : 'bg-white/5 border border-white/10 text-slate-300 rounded-bl-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Suggested questions */}
            {chatMessages.length <= 1 && (
              <div className="px-4 pb-2 flex gap-2 flex-wrap">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button key={q} onClick={() => handleChat(q)}
                    className="text-xs text-slate-400 border border-white/10 rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-3">
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChat()}
                  placeholder="Ask me anything about your career..."
                  className="input-dark flex-1 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600" />
                <button onClick={() => handleChat()} disabled={chatLoading || !chatInput.trim()}
                  className="btn-gradient rounded-xl px-5 py-3 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
