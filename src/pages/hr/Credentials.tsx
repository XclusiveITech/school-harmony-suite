import React, { useState } from 'react';
import { userCredentials, staff, UserCredential } from '@/lib/dummy-data';
import { Eye, EyeOff, Key, Shield, Search, Plus, Edit2, Lock, Unlock } from 'lucide-react';

export default function Credentials() {
  const [credentials, setCredentials] = useState<UserCredential[]>(userCredentials);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ staffId: '', email: '', role: 'teacher', password: 'test123' });

  const togglePassword = (id: string) => setShowPassword(p => ({ ...p, [id]: !p[id] }));

  const filtered = credentials.filter(c => {
    const s = staff.find(st => st.id === c.staffId);
    const name = s ? `${s.firstName} ${s.lastName}` : '';
    return name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
  });

  const resetPassword = (id: string) => {
    if (!newPassword.trim()) return;
    setCredentials(prev => prev.map(c => c.id === id ? { ...c, password: newPassword, lastChanged: new Date().toISOString().split('T')[0], mustChangePassword: true } : c));
    setEditingId(null);
    setNewPassword('');
  };

  const toggleStatus = (id: string) => {
    setCredentials(prev => prev.map(c => c.id === id ? { ...c, status: c.status === 'Active' ? 'Disabled' : 'Active' } : c));
  };

  const handleAdd = () => {
    if (!addForm.staffId || !addForm.email) return;
    const s = staff.find(st => st.id === addForm.staffId);
    const newCred: UserCredential = {
      id: String(credentials.length + 1),
      staffId: addForm.staffId,
      email: addForm.email,
      role: addForm.role,
      password: addForm.password,
      lastChanged: new Date().toISOString().split('T')[0],
      status: 'Active',
      mustChangePassword: true,
    };
    setCredentials(prev => [...prev, newCred]);
    setShowAddForm(false);
    setAddForm({ staffId: '', email: '', role: 'teacher', password: 'test123' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">User Credentials</h1>
          <p className="text-sm text-muted-foreground">Manage staff login accounts and passwords</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
          <Plus size={18} /> Create Account
        </button>
      </div>

      {showAddForm && (
        <div className="bg-card rounded-xl shadow-card p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">Create New Account</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Staff Member</label>
              <select value={addForm.staffId} onChange={e => {
                const s = staff.find(st => st.id === e.target.value);
                setAddForm(p => ({ ...p, staffId: e.target.value, email: s?.email || '' }));
              }} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
                <option value="">Select staff</option>
                {staff.filter(s => !credentials.some(c => c.staffId === s.id)).map(s => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
              <input value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Role</label>
              <select value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
                <option value="teacher">Teacher</option>
                <option value="accountant">Accountant</option>
                <option value="hr">HR</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Initial Password</label>
              <input value={addForm.password} onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground font-medium text-sm">Create</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg border border-input text-foreground font-medium text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm" />
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Staff</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Password</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Changed</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const s = staff.find(st => st.id === c.staffId);
                return (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{s?.firstName} {s?.lastName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">{c.role}</span></td>
                    <td className="px-4 py-3">
                      {editingId === c.id ? (
                        <div className="flex items-center gap-2">
                          <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" className="px-2 py-1 rounded border border-input bg-background text-foreground text-xs w-28" />
                          <button onClick={() => resetPassword(c.id)} className="px-2 py-1 rounded text-xs bg-success/10 text-success hover:bg-success/20">Save</button>
                          <button onClick={() => { setEditingId(null); setNewPassword(''); }} className="px-2 py-1 rounded text-xs bg-destructive/10 text-destructive hover:bg-destructive/20">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-foreground">{showPassword[c.id] ? c.password : '••••••••'}</span>
                          <button onClick={() => togglePassword(c.id)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                            {showPassword[c.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{c.lastChanged}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'Active' ? 'bg-success/10 text-success' : c.status === 'Locked' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
                        {c.status}
                      </span>
                      {c.mustChangePassword && <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-warning/10 text-warning">Must change</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditingId(c.id); setNewPassword(''); }} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title="Reset Password"><Key size={14} /></button>
                        <button onClick={() => toggleStatus(c.id)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title={c.status === 'Active' ? 'Disable' : 'Enable'}>
                          {c.status === 'Active' ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
