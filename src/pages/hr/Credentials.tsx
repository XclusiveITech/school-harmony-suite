import React, { useEffect, useState } from 'react';
import { Key, Search, Lock, Unlock, RefreshCw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { listUsers, forceResetPassword, lockUser, unlockUser, passwordProblem, type AccountUser } from '@/lib/auth-api';

export default function Credentials() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [resetFor, setResetFor] = useState<AccountUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try { setUsers(await listUsers()); }
    catch (e: any) { setError(e?.message || 'Failed to load accounts'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="bg-card rounded-xl shadow-card p-8 text-center space-y-2">
        <ShieldAlert className="mx-auto text-destructive" size={32} />
        <h1 className="font-display text-xl font-bold text-foreground">Admins only</h1>
        <p className="text-sm text-muted-foreground">Only administrators can manage user accounts and reset passwords.</p>
      </div>
    );
  }

  const nameOf = (u: AccountUser) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
  const filtered = users.filter(u => `${nameOf(u)} ${u.email}`.toLowerCase().includes(search.toLowerCase()));

  const generate = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    setNewPassword(s + Math.floor(10 + Math.random() * 90));
  };

  const doReset = async () => {
    if (!resetFor) return;
    const problem = passwordProblem(newPassword);
    if (problem) return toast.error(problem);
    setSaving(true);
    try {
      await forceResetPassword(resetFor.id, newPassword);
      setUsers(prev => prev.map(u => u.id === resetFor.id ? { ...u, must_change_password: true, is_locked: false } : u));
      toast.success(`Password reset for ${nameOf(resetFor)}. Share it with them securely — they must change it at next sign-in.`);
      setResetFor(null); setNewPassword('');
    } catch (e: any) { toast.error(e?.message || 'Reset failed'); }
    finally { setSaving(false); }
  };

  const toggleLock = async (u: AccountUser) => {
    try {
      if (u.is_locked) await unlockUser(u.id); else await lockUser(u.id);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_locked: !u.is_locked } : x));
    } catch (e: any) { toast.error(e?.message || 'Update failed'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">User Credentials</h1>
          <p className="text-sm text-muted-foreground">Manage login accounts and force password resets</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {(loading || error) && (
        <div className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between ${error ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
          <span>{error || 'Loading accounts…'}</span>
          {error && <button onClick={load} className="underline font-medium">Retry</button>}
        </div>
      )}

      {resetFor && (
        <div className="bg-card rounded-xl shadow-card p-6 border border-border space-y-4">
          <h2 className="font-display text-lg font-bold text-foreground">Force password reset — {nameOf(resetFor)}</h2>
          <p className="text-sm text-muted-foreground">Sets a temporary password. The user will be required to change it the next time they sign in, and any locked status is cleared.</p>
          <div className="flex flex-wrap gap-2">
            <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Temporary password" className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm font-mono" />
            <button onClick={generate} className="px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted">Generate</button>
            <button onClick={doReset} disabled={saving} className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50">{saving ? 'Resetting…' : 'Reset password'}</button>
            <button onClick={() => { setResetFor(null); setNewPassword(''); }} className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted">Cancel</button>
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm" />
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              {['Name', 'Email', 'Role', 'Last sign-in', 'Status', 'Actions'].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const status = !u.is_active ? 'Disabled' : u.is_locked ? 'Locked' : 'Active';
              return (
                <tr key={u.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-foreground">{nameOf(u)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">{u.role || '—'}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status === 'Active' ? 'bg-success/10 text-success' : status === 'Locked' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>{status}</span>
                    {u.must_change_password && <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-warning/10 text-warning">Must change</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setResetFor(u); setNewPassword(''); }} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title="Force password reset"><Key size={14} /></button>
                      {String(u.id) !== user?.id && (
                        <button onClick={() => toggleLock(u)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title={u.is_locked ? 'Unlock' : 'Lock'}>
                          {u.is_locked ? <Unlock size={14} /> : <Lock size={14} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && !error && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No accounts found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
