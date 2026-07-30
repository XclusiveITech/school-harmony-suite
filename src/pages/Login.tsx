import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Landmark, Eye, EyeOff, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) {
      navigate('/dashboard');
    } else {
      setError('Invalid email or password, or backend not reachable at ' + (import.meta.env.VITE_API_URL || 'http://localhost:8000'));
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden gradient-primary">
      {/* Background brand watermark */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center select-none">
        <Landmark className="text-primary-foreground/10" size={320} strokeWidth={1} />
        <span className="font-display font-bold text-primary-foreground/10 text-[14vw] leading-none -mt-10 tracking-tight">
          BRAINSTAR
        </span>
      </div>
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary-foreground/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary-foreground/10 blur-3xl" />

      {/* Glass login card */}
      <div className="relative w-full max-w-md rounded-2xl border border-primary-foreground/25 bg-primary-foreground/10 backdrop-blur-xl shadow-2xl p-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-primary-foreground/20 backdrop-blur flex items-center justify-center">
            <Landmark size={22} className="text-primary-foreground" />
          </div>
          <h1 className="font-display text-xl font-bold text-primary-foreground">Brainstar SMS</h1>
        </div>

        <h2 className="font-display text-2xl font-bold text-primary-foreground mb-1">Welcome back</h2>
        <p className="text-primary-foreground/70 mb-8">Sign in to your staff portal</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/20 border border-destructive/40 text-primary-foreground text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-primary-foreground mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@brainstar.edu"
              className="w-full px-4 py-2.5 rounded-lg border border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-foreground mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-2.5 rounded-lg border border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-foreground/70"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary-foreground text-primary font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6">
          <Link to="/portal/login" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-primary-foreground/40 text-primary-foreground font-semibold hover:bg-primary-foreground/10 transition-colors text-sm">
            <GraduationCap size={18} /> Go to Student Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
