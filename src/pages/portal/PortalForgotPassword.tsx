import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, GraduationCap, MailCheck } from 'lucide-react';
import { requestStudentPasswordReset } from '@/lib/auth-api';

export default function PortalForgotPassword() {
  const [regNumber, setRegNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try { await requestStudentPasswordReset(regNumber.trim()); setSent(true); }
    catch (err: any) { setError(err?.message || 'Could not send reset link.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md animate-fade-in">
        <Link to="/portal/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Back to Student Login
        </Link>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(142_71%_45%)] to-[hsl(199_89%_48%)] flex items-center justify-center">
            <GraduationCap size={22} className="text-primary-foreground" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">Student Portal</h1>
        </div>

        {sent ? (
          <div className="text-center space-y-4 bg-card rounded-xl p-8 shadow-card">
            <MailCheck size={40} className="mx-auto text-primary" />
            <h2 className="font-display text-2xl font-bold text-foreground">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              If <b className="text-foreground">{regNumber}</b> is registered, a reset link has been sent to the student's or guardian's email on file. It expires in 1 hour.
            </p>
            <p className="text-xs text-muted-foreground">No email on file? Ask the school office to reset your password.</p>
          </div>
        ) : (
          <>
            <h2 className="font-display text-2xl font-bold text-foreground mb-1">Forgot password</h2>
            <p className="text-muted-foreground mb-8">Enter your registration number and we'll email a reset link.</p>
            {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Registration Number</label>
                <input value={regNumber} onChange={e => setRegNumber(e.target.value)} required placeholder="e.g. 2026HM4521"
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <button disabled={loading} className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[hsl(142_71%_45%)] to-[hsl(199_89%_48%)] text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-60">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
