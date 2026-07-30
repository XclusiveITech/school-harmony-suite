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
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-slate-950">
      {/* Subtle navy gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0B1426] to-[#071124]" />

      {/* Background brand watermark */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center select-none">
        <Landmark className="text-white/5" size={320} strokeWidth={1} />
        <span className="font-display font-bold text-white/5 text-[14vw] leading-none -mt-10 tracking-tight">
          BRAINSTAR
        </span>
      </div>
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-blue-400/5 blur-3xl" />

      {/* Glass login card — navy tint */}
      <div className="relative w-full max-w-md rounded-2xl border border-blue-300/20 bg-[#0B1426]/70 backdrop-blur-xl shadow-2xl shadow-black/40 p-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-blue-500/20 backdrop-blur flex items-center justify-center">
            <Landmark size={22} className="text-white" />
          </div>
          <h1 className="font-display text-xl font-bold text-white">Brainstar SMS</h1>
        </div>

        <h2 className="font-display text-2xl font-bold text-white mb-1">Welcome back</h2>
        <p className="text-blue-100/70 mb-8">Sign in to your staff portal</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-white text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@brainstar.edu"
              className="w-full px-4 py-2.5 rounded-lg border border-blue-300/30 bg-blue-900/20 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-2.5 rounded-lg border border-blue-300/30 bg-blue-900/20 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200/70"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6">
          <Link to="/portal/login" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-blue-300/40 text-white font-semibold hover:bg-blue-500/15 transition-colors text-sm">
            <GraduationCap size={18} /> Go to Student Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
