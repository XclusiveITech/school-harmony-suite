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

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (login(email, password)) {
      navigate('/dashboard');
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12">
        <div className="text-center max-w-md animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-primary-foreground/20 backdrop-blur flex items-center justify-center mx-auto mb-8">
            <Landmark size={40} className="text-primary-foreground" />
          </div>
          <h1 className="font-display text-4xl font-bold text-primary-foreground mb-4">Brainstar SMS</h1>
          <p className="text-primary-foreground/80 text-lg">Complete School Management System</p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-primary-foreground/70 text-sm">
            <div className="bg-primary-foreground/10 rounded-xl p-4">
              <p className="font-semibold text-2xl text-primary-foreground">500+</p>
              <p>Students</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-xl p-4">
              <p className="font-semibold text-2xl text-primary-foreground">50+</p>
              <p>Staff</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-xl p-4">
              <p className="font-semibold text-2xl text-primary-foreground">15+</p>
              <p>Modules</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Landmark size={22} className="text-primary-foreground" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">Brainstar</h1>
          </div>

          <h2 className="font-display text-2xl font-bold text-foreground mb-1">Welcome back</h2>
          <p className="text-muted-foreground mb-8">Sign in to your staff portal</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@brainstar.edu"
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              Sign In
            </button>
          </form>

          <div className="mt-8 p-4 rounded-lg bg-muted">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Demo Credentials:</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p><span className="font-medium text-foreground">Admin:</span> admin@brainstar.edu / admin123</p>
              <p><span className="font-medium text-foreground">Teacher:</span> teacher@brainstar.edu / test123</p>
              <p><span className="font-medium text-foreground">Accountant:</span> accountant@brainstar.edu / test123</p>
            </div>
          </div>

          <div className="mt-4">
            <Link to="/portal/login" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border-2 border-[hsl(142_71%_45%)] text-[hsl(142_71%_45%)] font-semibold hover:bg-[hsl(142_71%_45%)]/10 transition-colors text-sm">
              <GraduationCap size={18} /> Go to Student Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
