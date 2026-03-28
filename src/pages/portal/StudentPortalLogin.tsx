import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { students } from '@/lib/dummy-data';

export default function StudentPortalLogin() {
  const navigate = useNavigate();
  const [regNumber, setRegNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const stored = localStorage.getItem('brainstar_student');
  if (stored) return <Navigate to="/portal/dashboard" replace />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const student = students.find(s => s.regNumber === regNumber);
    if (student && password === 'student123') {
      localStorage.setItem('brainstar_student', JSON.stringify(student));
      navigate('/portal/dashboard');
    } else {
      setError('Invalid registration number or password');
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[hsl(142_71%_45%)] to-[hsl(199_89%_48%)] items-center justify-center p-12">
        <div className="text-center max-w-md animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-8">
            <GraduationCap size={40} className="text-white" />
          </div>
          <h1 className="font-display text-4xl font-bold text-white mb-4">Student Portal</h1>
          <p className="text-white/80 text-lg">Access your academic records, fees, timetables and more</p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-white/70 text-sm">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="font-semibold text-2xl text-white">📚</p>
              <p>Academics</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="font-semibold text-2xl text-white">💰</p>
              <p>Fees</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="font-semibold text-2xl text-white">📝</p>
              <p>Results</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="font-semibold text-2xl text-white">📅</p>
              <p>Timetable</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft size={16} /> Back to Staff Login
          </Link>

          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(142_71%_45%)] to-[hsl(199_89%_48%)] flex items-center justify-center">
              <GraduationCap size={22} className="text-white" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">Student Portal</h1>
          </div>

          <h2 className="font-display text-2xl font-bold text-foreground mb-1">Student Login</h2>
          <p className="text-muted-foreground mb-8">Sign in with your registration number</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Registration Number</label>
              <input
                type="text"
                value={regNumber}
                onChange={e => setRegNumber(e.target.value)}
                placeholder="e.g. 2026HM4521"
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
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[hsl(142_71%_45%)] to-[hsl(199_89%_48%)] text-white font-semibold hover:opacity-90 transition-opacity">
              Sign In
            </button>
          </form>

          <div className="mt-8 p-4 rounded-lg bg-muted">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Demo Credentials:</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p><span className="font-medium text-foreground">Henry Murinda:</span> 2026HM4521 / student123</p>
              <p><span className="font-medium text-foreground">Tatenda Dube:</span> 2025TD9023 / student123</p>
              <p><span className="font-medium text-foreground">Kudzai Moyo:</span> 2026KM1456 / student123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
