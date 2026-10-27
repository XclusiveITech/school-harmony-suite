import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Landmark, ArrowLeft, MailCheck } from 'lucide-react';
import { requestPasswordReset } from '@/lib/auth-api';

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0B1426] to-[#071124]" />
      <div className="relative w-full max-w-md rounded-2xl border border-blue-300/20 bg-[#0B1426]/70 backdrop-blur-xl shadow-2xl shadow-black/40 p-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Landmark size={22} className="text-white" />
          </div>
          <h1 className="font-display text-xl font-bold text-white">Brainstar SMS</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

export const authInput = "w-full px-4 py-2.5 rounded-lg border border-blue-300/30 bg-blue-900/20 text-white placeholder:text-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50";
export const authButton = "w-full py-2.5 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors disabled:opacity-60";

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try { await requestPasswordReset(email.trim()); setSent(true); }
    catch (err: any) { setError(err?.message || 'Could not send reset link.'); }
    finally { setLoading(false); }
  };

  return (
    <AuthShell>
      {sent ? (
        <div className="text-center space-y-4">
          <MailCheck size={40} className="mx-auto text-blue-300" />
          <h2 className="font-display text-2xl font-bold text-white">Check your email</h2>
          <p className="text-blue-100/70 text-sm">If an account exists for <b className="text-white">{email}</b>, a link to reset your password has been sent. The link expires in 1 hour.</p>
        </div>
      ) : (
        <>
          <h2 className="font-display text-2xl font-bold text-white mb-1">Forgot password</h2>
          <p className="text-blue-100/70 mb-6">Enter your email and we'll send you a reset link.</p>
          {error && <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-white text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-5">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@brainstar.edu" className={authInput} />
            <button disabled={loading} className={authButton}>{loading ? 'Sending…' : 'Send reset link'}</button>
          </form>
        </>
      )}
      <Link to="/login" className="mt-6 flex items-center justify-center gap-2 text-sm text-blue-200 hover:text-white">
        <ArrowLeft size={16} /> Back to sign in
      </Link>
    </AuthShell>
  );
}
