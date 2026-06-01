'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import API from '@/lib/api';
import { getResumeById, ResumeDetail } from '@/lib/resume';
import { getJobs, JobResponseData } from '@/lib/job';

// Shared Skill Keywords list for real-time validation checks
const SKILL_KEYWORDS = [
  "C", "C++", "Java", "Python", "JavaScript", "TypeScript", "HTML", "CSS",
  "React", "Next.js", "Node.js", "Express.js", "Django", "Flask", "FastAPI",
  "REST API", "GraphQL", "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis",
  "Prisma", "Firebase", "Git", "GitHub", "Docker", "Kubernetes", "AWS",
  "Azure", "GCP", "Linux", "Machine Learning", "Deep Learning", "Artificial Intelligence",
  "NLP", "Computer Vision", "TensorFlow", "PyTorch", "Scikit-learn", "Pandas",
  "NumPy", "Data Structures", "Algorithms", "OOP", "DBMS", "Operating System",
  "Computer Networks", "ETL", "Spark", "Airflow", "Data Pipeline", "Tailwind CSS",
  "Postman", "JWT"
];

// Interfaces for our tailored data state
interface TailoredWorkExp {
  company: string;
  role: string;
  duration: string;
  bullets: string[];
}

interface TailoredProj {
  name: string;
  description: string;
  technologies: string[];
}

interface TailoredResumeData {
  name: string;
  email: string;
  phone: string;
  github: string;
  linkedin: string;
  portfolio: string;
  skills: string[];
  experience: TailoredWorkExp[];
  projects: TailoredProj[];
  education: Array<{ institution?: string; school?: string; degree: string; fieldOfStudy?: string; major?: string; duration?: string; year?: string; gpa?: string }>;
  certifications: string[];
}

export default function ResumeTailorWYSIWYGPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const resumeId = Number(params.id);

  // Data states
  const [originalResume, setOriginalResume] = useState<ResumeDetail | null>(null);
  const [jobs, setJobs] = useState<JobResponseData[]>([]);
  
  // Customization inputs
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [customJdText, setCustomJdText] = useState<string>('');
  const [tailoring, setTailoring] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Editor state (Tailored fields)
  const [resumeData, setResumeData] = useState<TailoredResumeData | null>(null);
  const [latexCode, setLatexCode] = useState<string>('');

  // UI status
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Track extracted keywords from current JD
  const [jdKeywords, setJdKeywords] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load resume & saved job list
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const resResume = await getResumeById(resumeId);
      setOriginalResume(resResume.resume);

      // Populate editor with parsed original data if available
      if (resResume.resume.parsed_data) {
        const parsed = resResume.resume.parsed_data as any;
        setResumeData({
          name: parsed.name || 'Your Name',
          email: parsed.email || 'your.email@example.com',
          phone: parsed.phone || '+1-234-567-8900',
          github: parsed.links?.github || parsed.github || '',
          linkedin: parsed.links?.linkedin || parsed.linkedin || '',
          portfolio: parsed.links?.portfolio || parsed.portfolio || '',
          skills: parsed.skills || [],
          experience: parsed.experience || [],
          projects: parsed.projects || [],
          education: parsed.education || [],
          certifications: parsed.certifications || [],
        });
      } else {
        // Fallback placeholder structure
        setResumeData({
          name: 'Your Name',
          email: 'your.email@example.com',
          phone: '+1-234-567-8900',
          github: '',
          linkedin: '',
          portfolio: '',
          skills: [],
          experience: [],
          projects: [],
          education: [],
          certifications: [],
        });
      }

      // Fetch saved jobs
      const jobsRes = await getJobs();
      setJobs(jobsRes.jobs);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to load initial data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && resumeId) {
      loadInitialData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, resumeId]);

  // Handle live JD changes to parse keywords locally
  const handleJdSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    if (jobId) {
      const selected = jobs.find((j) => j.id === Number(jobId));
      if (selected) {
        setCustomJdText(selected.description || '');
        extractJdKeywords(selected.description || '');
      }
    } else {
      setCustomJdText('');
      setJdKeywords([]);
    }
  };

  const handleCustomJdChange = (text: string) => {
    setCustomJdText(text);
    extractJdKeywords(text);
  };

  const extractJdKeywords = (text: string) => {
    if (!text.trim()) {
      setJdKeywords([]);
      return;
    }
    const found: string[] = [];
    const textLower = text.toLowerCase();
    
    // Scan standard SKILL_KEYWORDS
    SKILL_KEYWORDS.forEach((skill) => {
      const escaped = skill.toLowerCase().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const pattern = new RegExp('\\b' + escaped + '\\b', 'i');
      if (pattern.test(textLower)) {
        found.push(skill);
      }
    });
    setJdKeywords(found);
  };

  // Run Backend AI Tailoring Engine
  const handleTailor = async () => {
    if (!customJdText.trim()) {
      setError('Please select a saved job description or paste one in the input box.');
      return;
    }

    setTailoring(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Record<string, any> = {};
      if (selectedJobId) {
        payload.jobId = Number(selectedJobId);
      } else {
        payload.jobDescription = customJdText;
      }

      const res = await API.post(`/api/resumes/${resumeId}/tailor`, payload);
      if (res.data.tailoredData) {
        setResumeData(res.data.tailoredData);
        setLatexCode(res.data.latexCode);
        setSuccess('AI Resume Tailoring completed successfully!');
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to tailor resume.');
    } finally {
      setTailoring(false);
    }
  };

  // Save tailored version as a new Resume record
  const handleSaveTailored = async () => {
    if (!resumeData) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await API.post(`/api/resumes/${resumeId}/tailor/save`, resumeData);
      setSuccess('Tailored resume successfully saved as a new resume record!');
      setTimeout(() => {
        router.push('/resumes');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to save tailored resume.');
    } finally {
      setSaving(false);
    }
  };

  // Download raw LaTeX .tex file
  const handleDownloadLatex = () => {
    if (!latexCode) {
      // Re-generate locally if empty
      alert('Generating LaTeX code... Make sure to run Tailor first for fully updated alignment!');
      return;
    }
    const blob = new Blob([latexCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Tailored_Resume_${resumeId}.tex`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download PDF via high-fidelity print stylesheet trigger
  const handleDownloadPdf = () => {
    window.print();
  };

  // Local real-time match verification helper
  const isKeywordMatched = (skill: string) => {
    if (!resumeData) return false;
    const skillLower = skill.toLowerCase();
    
    // Check in skills
    if (resumeData.skills.some((s) => s.toLowerCase() === skillLower)) return true;
    
    // Check in bullets
    for (const exp of resumeData.experience) {
      if (exp.bullets.some((b) => b.toLowerCase().includes(skillLower))) return true;
    }
    
    // Check in projects
    for (const proj of resumeData.projects) {
      if (proj.description.toLowerCase().includes(skillLower) || proj.technologies.some((t) => t.toLowerCase() === skillLower)) return true;
    }
    
    return false;
  };

  // Inline editing state modification helpers
  const handleExpBulletChange = (expIdx: number, bulletIdx: number, val: string) => {
    if (!resumeData) return;
    const updated = { ...resumeData };
    updated.experience[expIdx].bullets[bulletIdx] = val;
    setResumeData(updated);
  };

  const handleSkillsChange = (val: string) => {
    if (!resumeData) return;
    const updated = { ...resumeData };
    updated.skills = val.split(',').map((s) => s.trim()).filter((s) => s);
    setResumeData(updated);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-[#0f172a] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <p className="text-slate-400 font-medium animate-pulse">Launching WYSIWYG Resume Tailor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] bg-gradient-to-b from-[#0f172a] via-[#1e1b4b]/20 to-[#0f172a] text-white py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:text-black print:p-0 print:m-0">
      
      {/* Hide controls when printing */}
      <div className="mx-auto max-w-7xl print:hidden">
        
        {/* Alerts */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            ✔️ {success}
          </div>
        )}

        {/* Back Link & Header */}
        <div className="flex items-center gap-2 mb-6">
          <Link href="/resumes" className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1">
            &larr; Back to Resumes List
          </Link>
        </div>

        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center mb-8 pb-6 border-b border-white/5">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">
              AI WYSIWYG Resume Tailor
            </h1>
            <p className="mt-1 text-slate-400 text-sm">
              Tailor bullet points, align core competencies, view real-time keyword checkmarks, and download A4 print PDFs or LaTeX templates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadPdf}
              disabled={!resumeData}
              className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold transition-all hover:scale-[1.02] shadow-lg cursor-pointer"
            >
              📥 Download PDF / Print
            </button>
            <button
              onClick={handleDownloadLatex}
              disabled={!resumeData}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold hover:bg-white/10 cursor-pointer"
            >
              📄 Download LaTeX (.tex)
            </button>
            <button
              onClick={handleSaveTailored}
              disabled={saving || !resumeData}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Saving...' : '💾 Save to Cockpit'}
            </button>
          </div>
        </div>

        {/* Layout Split: Left Controls, Right Virtual Page */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 mb-12">
          
          {/* LEFT 5-Columns: Job description input & keywords checklist */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* JD Selection Box */}
            <div className="rounded-2xl border border-white/10 bg-[#151f32]/80 p-6 backdrop-blur-xl shadow-2xl">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-1.5">
                <span>🎯</span> Choose Job Target
              </h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="job-select" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Saved Internship Post
                  </label>
                  <select
                    id="job-select"
                    value={selectedJobId}
                    onChange={(e) => handleJdSelect(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">-- Paste Custom JD Text --</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title} at {job.company}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="jd-textarea" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Job Description Text
                  </label>
                  <textarea
                    id="jd-textarea"
                    rows={6}
                    value={customJdText}
                    onChange={(e) => handleCustomJdChange(e.target.value)}
                    placeholder="Paste the target internship description or requirements details here..."
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-xs text-white focus:border-purple-500 focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                <button
                  onClick={handleTailor}
                  disabled={tailoring || !customJdText.trim()}
                  className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.01] hover:shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {tailoring ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Aligning bullet points...
                    </>
                  ) : (
                    '⚡ Tailor Resume with AI'
                  )}
                </button>
              </div>
            </div>

            {/* Keyword match indicator checklist */}
            <div className="rounded-2xl border border-white/10 bg-[#151f32]/80 p-6 backdrop-blur-xl shadow-2xl">
              <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                <span>📋</span> Real-time Keyword Checklist
              </h3>
              <p className="text-[11px] text-slate-400 mb-4">
                Ensures that crucial skills from the Job Description are physically placed in your resume. Checkmarks light up instantly.
              </p>

              {jdKeywords.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/5 p-6 text-center text-slate-500 text-xs">
                  Paste or select a Job Description above to extract matching keywords!
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {jdKeywords.map((keyword) => {
                    const matched = isKeywordMatched(keyword);
                    return (
                      <div
                        key={keyword}
                        className={`flex items-center gap-2 rounded-lg border p-2 transition-all ${
                          matched
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                            : 'bg-white/2 border-white/5 text-slate-500'
                        }`}
                      >
                        <span className="text-xs">{matched ? '✔️' : '⚪'}</span>
                        <span className="text-xs font-bold truncate">{keyword}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT 7-Columns: Live Virtual Page WYSIWYG Editor */}
          <div className="lg:col-span-7">
            
            <div className="rounded-2xl border border-white/10 bg-[#151f32]/40 p-4 backdrop-blur-xl flex justify-center overflow-auto max-h-[85vh] shadow-2xl">
              
              {/* Virtual A4 Sheet Container */}
              {resumeData ? (
                <div className="w-[100%] min-w-[550px] aspect-[1/1.414] bg-white text-slate-900 shadow-2xl rounded-sm p-8 flex flex-col font-sans select-text">
                  
                  {/* Header Info */}
                  <div className="text-center mb-6">
                    <input
                      type="text"
                      value={resumeData.name}
                      onChange={(e) => setResumeData({ ...resumeData, name: e.target.value })}
                      className="w-full text-center bg-transparent border-0 hover:bg-slate-100 focus:bg-slate-100 focus:ring-1 focus:ring-purple-500 rounded p-1 font-bold text-2xl text-slate-800 focus:outline-none"
                      placeholder="Your Full Name"
                    />
                    
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-[10px] text-slate-500 font-medium">
                      <input
                        type="text"
                        value={resumeData.phone}
                        onChange={(e) => setResumeData({ ...resumeData, phone: e.target.value })}
                        className="text-center bg-transparent border-0 hover:bg-slate-100 focus:bg-slate-100 focus:ring-1 focus:ring-purple-500 rounded px-1.5 py-0.5 focus:outline-none w-28"
                        placeholder="Phone Number"
                      />
                      <span>•</span>
                      <input
                        type="email"
                        value={resumeData.email}
                        onChange={(e) => setResumeData({ ...resumeData, email: e.target.value })}
                        className="text-center bg-transparent border-0 hover:bg-slate-100 focus:bg-slate-100 focus:ring-1 focus:ring-purple-500 rounded px-1.5 py-0.5 focus:outline-none w-44"
                        placeholder="Email Address"
                      />
                      
                      {(resumeData.github || resumeData.linkedin || resumeData.portfolio) && <span>•</span>}
                      
                      {resumeData.github && (
                        <input
                          type="text"
                          value={resumeData.github}
                          onChange={(e) => setResumeData({ ...resumeData, github: e.target.value })}
                          className="text-center bg-transparent border-0 hover:bg-slate-100 focus:bg-slate-100 focus:ring-1 focus:ring-purple-500 rounded px-1.5 py-0.5 focus:outline-none w-32"
                          placeholder="GitHub URL"
                        />
                      )}
                      
                      {resumeData.linkedin && (
                        <input
                          type="text"
                          value={resumeData.linkedin}
                          onChange={(e) => setResumeData({ ...resumeData, linkedin: e.target.value })}
                          className="text-center bg-transparent border-0 hover:bg-slate-100 focus:bg-slate-100 focus:ring-1 focus:ring-purple-500 rounded px-1.5 py-0.5 focus:outline-none w-32"
                          placeholder="LinkedIn URL"
                        />
                      )}
                    </div>
                  </div>

                  {/* Skills Section */}
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">
                      Technical Skills
                    </h4>
                    <div className="text-[11px] text-slate-700 leading-relaxed pl-1">
                      <span className="font-bold text-slate-800 mr-1.5">Skills:</span>
                      <textarea
                        value={resumeData.skills.join(', ')}
                        onChange={(e) => handleSkillsChange(e.target.value)}
                        className="w-full bg-transparent border-0 hover:bg-slate-100 focus:bg-slate-100 focus:ring-1 focus:ring-purple-500 rounded p-1 text-[11px] text-slate-700 resize-none h-12 focus:outline-none"
                        placeholder="List your skills, separated by commas..."
                      />
                    </div>
                  </div>

                  {/* Experience Section */}
                  <div className="mb-4 flex-1">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1 mb-3">
                      Work Experience
                    </h4>
                    <div className="space-y-4">
                      {resumeData.experience.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic pl-1">No experience blocks added yet.</p>
                      ) : (
                        resumeData.experience.map((exp, expIdx) => (
                          <div key={expIdx} className="pl-1">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                              <div className="flex gap-1.5 items-center">
                                <input
                                  type="text"
                                  value={exp.company}
                                  onChange={(e) => {
                                    const updated = { ...resumeData };
                                    updated.experience[expIdx].company = e.target.value;
                                    setResumeData(updated);
                                  }}
                                  className="bg-transparent border-0 hover:bg-slate-100 focus:bg-slate-100 focus:ring-1 focus:ring-purple-500 rounded px-1 py-0.5 focus:outline-none font-bold w-36"
                                  placeholder="Company"
                                />
                                <span className="text-slate-400 font-normal">|</span>
                                <input
                                  type="text"
                                  value={exp.role}
                                  onChange={(e) => {
                                    const updated = { ...resumeData };
                                    updated.experience[expIdx].role = e.target.value;
                                    setResumeData(updated);
                                  }}
                                  className="bg-transparent border-0 hover:bg-slate-100 focus:bg-slate-100 focus:ring-1 focus:ring-purple-500 rounded px-1 py-0.5 focus:outline-none font-semibold w-40 text-slate-700"
                                  placeholder="Role"
                                />
                              </div>
                              <input
                                type="text"
                                value={exp.duration}
                                onChange={(e) => {
                                  const updated = { ...resumeData };
                                  updated.experience[expIdx].duration = e.target.value;
                                  setResumeData(updated);
                                }}
                                className="bg-transparent border-0 hover:bg-slate-100 focus:bg-slate-100 focus:ring-1 focus:ring-purple-500 rounded px-1 py-0.5 focus:outline-none text-right text-[10px] text-slate-500 font-medium w-28"
                                placeholder="Duration"
                              />
                            </div>
                            
                            <ul className="list-disc pl-4 mt-1.5 space-y-1">
                              {exp.bullets.map((bullet, bulletIdx) => (
                                <li key={bulletIdx} className="text-[10px] text-slate-600">
                                  <textarea
                                    value={bullet}
                                    onChange={(e) => handleExpBulletChange(expIdx, bulletIdx, e.target.value)}
                                    className="w-full bg-transparent border-0 hover:bg-slate-100 focus:bg-slate-100 focus:ring-1 focus:ring-purple-500 rounded p-1 text-[10px] text-slate-600 resize-none focus:outline-none leading-relaxed h-8"
                                    placeholder="Enter achievements or contributions..."
                                  />
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Projects Section */}
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1 mb-3">
                      Projects
                    </h4>
                    <div className="space-y-4">
                      {resumeData.projects.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic pl-1">No projects added yet.</p>
                      ) : (
                        resumeData.projects.map((proj, projIdx) => (
                          <div key={projIdx} className="pl-1">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                              <input
                                type="text"
                                value={proj.name}
                                onChange={(e) => {
                                  const updated = { ...resumeData };
                                  updated.projects[projIdx].name = e.target.value;
                                  setResumeData(updated);
                                }}
                                className="bg-transparent border-0 hover:bg-slate-100 focus:bg-slate-100 focus:ring-1 focus:ring-purple-500 rounded px-1 py-0.5 focus:outline-none font-bold w-48"
                                placeholder="Project Name"
                              />
                              <input
                                type="text"
                                value={proj.technologies.join(', ')}
                                onChange={(e) => {
                                  const updated = { ...resumeData };
                                  updated.projects[projIdx].technologies = e.target.value.split(',').map((t) => t.trim());
                                  setResumeData(updated);
                                }}
                                className="bg-transparent border-0 hover:bg-slate-100 focus:bg-slate-100 focus:ring-1 focus:ring-purple-500 rounded px-1 py-0.5 focus:outline-none text-right text-[10px] text-slate-500 font-medium w-48"
                                placeholder="Technologies (comma separated)"
                              />
                            </div>
                            <textarea
                              value={proj.description}
                              onChange={(e) => {
                                const updated = { ...resumeData };
                                updated.projects[projIdx].description = e.target.value;
                                setResumeData(updated);
                              }}
                              className="w-full bg-transparent border-0 hover:bg-slate-100 focus:bg-slate-100 focus:ring-1 focus:ring-purple-500 rounded p-1 text-[10px] text-slate-600 resize-none h-12 focus:outline-none pl-4 mt-1 leading-relaxed border-l border-slate-200"
                              placeholder="Brief description of the project achievements..."
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Education Section */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300 pb-1 mb-2">
                      Education
                    </h4>
                    <div className="space-y-2">
                      {resumeData.education.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic pl-1">No education blocks listed.</p>
                      ) : (
                        resumeData.education.map((edu, eduIdx) => {
                          const school = edu.institution || edu.school || 'University';
                          const degree = edu.degree || 'Bachelor Degree';
                          const field = edu.fieldOfStudy || edu.major || '';
                          const duration = edu.duration || edu.year || '';
                          const gpa = edu.gpa || '';
                          
                          let degreeStr = degree;
                          if (field) degreeStr += ` in ${field}`;
                          if (gpa) degreeStr += ` (GPA: ${gpa})`;
                          
                          return (
                            <div key={eduIdx} className="pl-1 text-[11px] flex justify-between text-slate-800">
                              <div>
                                <span className="font-bold">{school}</span>
                                <span className="text-slate-500 font-normal ml-2">— {degreeStr}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-medium">{duration}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-slate-400 text-sm">No structured data found to load the editor.</div>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* PRINT-ONLY CSS CONTAINER Stylesheet */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          nav, button, select, textarea:not(.w-\[100\%\] *), input:not(.w-\[100\%\] *), div:not(.w-\[100\%\] *), a {
            display: none !important;
          }
          .aspect-\[1\/1\.414\] {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
          }
          .aspect-\[1\/1\.414\] * {
            display: block !important;
          }
          .aspect-\[1\/1\.414\] input, .aspect-\[1\/1\.414\] textarea {
            display: inline-block !important;
            border: none !important;
            background-color: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            outline: none !important;
            box-shadow: none !important;
            resize: none !important;
          }
        }
      `}</style>

    </div>
  );
}
