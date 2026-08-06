import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { loginRequest, fetchMe, tokens, ApiError, BackendUser } from '@/lib/api';

export type UserRole = 'superadmin' | 'admin' | 'accountant' | 'teacher' | 'hr' | 'student' | 'parent';

const ROLES: UserRole[] = ['superadmin', 'admin', 'accountant', 'teacher', 'hr', 'student', 'parent'];

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  username?: string;
  branchId?: number | null;
  branchName?: string | null;
  mustChangePassword?: boolean;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function deriveRole(raw: any): UserRole {
  if (raw?.is_superuser) return 'superadmin';
  const candidates = [raw?.role, raw?.user_role, ...(raw?.roles || [])];
  for (const c of candidates) {
    const r = (c ?? '').toString().toLowerCase();
    if (ROLES.includes(r as UserRole)) return r as UserRole;
  }
  return raw?.is_staff ? 'admin' : 'teacher';
}

function mapUser(raw: BackendUser | any, fallbackEmail: string): User {
  const first = raw?.first_name || '';
  const last = raw?.last_name || '';
  const name = raw?.name || (first || last ? `${first} ${last}`.trim() : raw?.username || fallbackEmail);
  return {
    id: String(raw?.id ?? raw?.pk ?? '0'),
    name,
    email: raw?.email || fallbackEmail,
    username: raw?.username,
    role: deriveRole(raw),
    branchId: raw?.branch ?? null,
    branchName: raw?.branch_name ?? null,
    mustChangePassword: !!raw?.must_change_password,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('brainstar_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persist = (u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem('brainstar_user', JSON.stringify(u));
    else localStorage.removeItem('brainstar_user');
  };

  // Revalidate the stored session against the backend on boot.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tokens.access) {
        if (!cancelled) {
          persist(null);
          setLoading(false);
        }
        return;
      }
      try {
        const me = await fetchMe();
        if (!cancelled && me) persist(mapUser(me, me.email || ''));
      } catch (e) {
        // Only drop the session on a real auth failure, not on a network outage.
        if (!cancelled && e instanceof ApiError && e.status === 401) {
          tokens.clear();
          persist(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const { access, refresh, user: rawUser } = await loginRequest(email.trim(), password);
      tokens.set(access, refresh);
      const me = rawUser ?? (await fetchMe());
      persist(mapUser(me || {}, email.trim()));
      return true;
    } catch (e: any) {
      setError(e?.message || 'Login failed. Check that the Django backend is running.');
      tokens.clear();
      persist(null);
      return false;
    }
  };

  const logout = () => {
    persist(null);
    tokens.clear();
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAuthenticated: !!user, loading, error }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
