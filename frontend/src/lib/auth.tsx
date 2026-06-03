'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import API, { setToken, getToken, removeToken } from './api';

export interface User {
  id: number;
  full_name: string;
  email: string;
  is_verified: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (fullName: string, email: string, password: string) => Promise<void>;
  verifyOtp: (email: string, otpCode: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = getToken();
      if (!token) { setLoading(false); return; }
      try {
        const res = await API.get('/auth/me');
        setUser(res.data);
      } catch {
        removeToken();
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const signup = useCallback(async (fullName: string, email: string, password: string) => {
    await API.post('/auth/signup', { full_name: fullName, email, password });
  }, []);

  const verifyOtp = useCallback(async (email: string, otpCode: string) => {
    const res = await API.post('/auth/verify-otp', { email, otp_code: otpCode });
    const { access_token, user: userData } = res.data;
    setToken(access_token);
    setUser(userData);
  }, []);

  const resendOtp = useCallback(async (email: string) => {
    await API.post('/auth/resend-otp', { email });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await API.post('/auth/login', { email, password });
    const { access_token, user: userData } = res.data;
    setToken(access_token);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, verifyOtp, resendOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
