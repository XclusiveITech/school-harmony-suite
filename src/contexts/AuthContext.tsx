import React, { createContext, useContext, useState, ReactNode } from 'react';
import { loginRequest, fetchMe, tokens } from '@/lib/api';

export type UserRole = 'superadmin' | 'admin' | 'accountant' | 'teacher' | 'hr' | 'student' | 'parent';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function deriveRole(raw: any): UserRole {
  if (raw?.is_superuser) return 'superadmin';
  const r = (raw?.role || raw?.user_role || '').toString().toLowerCase();
  if (['superadmin', 'admin', 'accountant', 'teacher', 'hr', 'student', 'parent'].includes(r)) {
    return r as UserRole;
  }
  return raw?.is_staff ? 'admin' : 'teacher';
}

function mapUser(raw: any, email: string): User {
  const first = raw?.first_name || '';
  const last = raw?.last_name || '';
  const name = (first || last) ? `${first} ${last}`.trim() : (raw?.username || email);
  return {
    id: String(raw?.id ?? raw?.pk ?? '0'),
    name,
    email: raw?.email || email,
    role: deriveRole(raw),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('brainstar_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const { access, refresh } = await loginRequest(email, password);
      tokens.set(access, refresh);
      const me = await fetchMe();
      const userData = mapUser(me || {}, email);
      setUser(userData);
      localStorage.setItem('brainstar_user', JSON.stringify(userData));
      return true;
    } catch (e: any) {
      setError(e?.message || 'Login failed. Check that the Django backend is running.');
      tokens.clear();
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('brainstar_user');
    tokens.clear();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
