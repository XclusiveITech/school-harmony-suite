import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const demoUsers: Record<string, User & { password: string }> = {
  'admin@brainstar.edu': { id: '1', name: 'David Phiri', email: 'admin@brainstar.edu', role: 'superadmin', password: 'admin123' },
  'accountant@brainstar.edu': { id: '4', name: 'Linda Zuze', email: 'accountant@brainstar.edu', role: 'accountant', password: 'test123' },
  'teacher@brainstar.edu': { id: '1', name: 'John Banda', email: 'teacher@brainstar.edu', role: 'teacher', password: 'test123' },
  'hr@brainstar.edu': { id: '3', name: 'David Phiri', email: 'hr@brainstar.edu', role: 'hr', password: 'test123' },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('brainstar_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (email: string, password: string): boolean => {
    const found = demoUsers[email];
    if (found && found.password === password) {
      const { password: _, ...userData } = found;
      setUser(userData);
      localStorage.setItem('brainstar_user', JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('brainstar_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
