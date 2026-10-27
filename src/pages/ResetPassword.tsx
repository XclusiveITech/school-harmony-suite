import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { confirmPasswordReset, passwordProblem } from '@/lib/auth-api';
import { AuthShell, authInput, authButton } from './ForgotPassword';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const uid = params.get('uid') || '';
  const token = params.get('token') || '';
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(pw);
    if (problem) return setError(problem);
    if (pw !== pw2) return setError('Passwords do not match.');
    setLoading(true); setError('');
    try { await confirmPasswordReset(uid, token, pw); setDone(true); }
    catch (err: any) { setError(err?.message || 'This reset link is invalid or has expired.'); }
    finally { setLoading(false); }
  };

  return (
    <AuthShell>
      {!uid || !token ? (
        <p className="text-blue-100/80">This reset link is incomplete. Please request a new one.</p>
      ) : done ? (
        <div className="text-center space-y-4">
          <CheckCircle2 size={40} className="mx-auto text-green-400" />
          <h2 className="font-display text-2xl font-bold text-white">Password updated</h2>
          <p className="text-blue-100/70 text-sm">You can now sign in with your new password.</p>
        </div>
      ) : (
        <>
          <h2 className="font-display text-2xl font-bold text-white mb-1">Set a new password</h2>
          <p className="text-blue-100/70 mb-6">At least 8 characters, with letters and numbers.</p>
          {error && <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-400/40 text-white text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <input type="password" required value={pw} onChange={e => setPw(e.target.value)} placeholder="New password" className={authInput} />
            <input type="password" required value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Confirm new password" className={authInput} />
            <button disabled={loading} className={authButton}>{loading ? 'Saving…' : 'Update password'}</button>
          </form>
        </>
      )}
      <Link to={done ? '/login' : '/forgot-password'} className="mt-6 flex items-center justify-center gap-2 text-sm text-blue-200 hover:text-white">
        <ArrowLeft size={16} /> {done ? 'Go to sign in' : 'Request a new link'}
      </Link>
    </AuthShell>
  );
}
