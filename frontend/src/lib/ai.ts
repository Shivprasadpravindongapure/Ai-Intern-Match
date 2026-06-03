import API from './api';

export interface AIAnalysis {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  ats_keywords: string[];
  missing_sections: string[];
  summary: string;
}

export interface JDAnalysis {
  required_skills: string[];
  nice_to_have: string[];
  red_flags: string[];
  experience_level: string;
  role_type: string;
  responsibilities: string[];
  company_culture_hints: string[];
}

export interface ResumeVsJD {
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  improvement_tips: string[];
  tailored_summary: string;
  verdict: string;
}

export interface InterviewQuestion {
  question: string;
  model_answer: string;
  category: string;
  difficulty: string;
}

export const analyzeResume = async (resumeId: number): Promise<{ analysis: AIAnalysis; resume_id: number }> => {
  const res = await API.post('/api/ai/analyze-resume', { resume_id: resumeId });
  return res.data;
};

export const analyzeJD = async (jdText: string): Promise<{ analysis: JDAnalysis }> => {
  const res = await API.post('/api/ai/analyze-jd', { jd_text: jdText });
  return res.data;
};

export const resumeVsJD = async (resumeId: number, jdText: string): Promise<{ comparison: ResumeVsJD }> => {
  const res = await API.post('/api/ai/resume-vs-jd', { resume_id: resumeId, jd_text: jdText });
  return res.data;
};

export const generateCoverLetter = async (
  resumeId: number,
  jobTitle: string,
  company: string,
  jdText: string
): Promise<{ cover_letter: string; job_title: string; company: string }> => {
  const res = await API.post('/api/ai/cover-letter', {
    resume_id: resumeId,
    job_title: jobTitle,
    company,
    jd_text: jdText,
  });
  return res.data;
};

export const generateInterviewPrep = async (
  jdText: string,
  role: string
): Promise<{ questions: InterviewQuestion[]; role: string }> => {
  const res = await API.post('/api/ai/interview-prep', { jd_text: jdText, role });
  return res.data;
};

export const chatWithAI = async (
  message: string,
  context?: string
): Promise<{ reply: string; message: string }> => {
  const res = await API.post('/api/ai/chat', { message, context: context || '' });
  return res.data;
};

export const getCareerRoadmap = async (
  role: string,
  skills: string[]
): Promise<{ roadmap: Record<string, unknown> }> => {
  const params = new URLSearchParams({ role, skills: skills.join(',') });
  const res = await API.get(`/api/ai/career-roadmap?${params.toString()}`);
  return res.data;
};
