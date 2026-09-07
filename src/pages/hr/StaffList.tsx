import React, { useEffect, useState } from 'react';
import { Plus, Eye, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  listStaff, createStaff, listLeaveRequests, setLeaveStatus, staffName, num,
  type BackendStaff, type BackendLeaveRequest, type StaffStatus,
} from '@/lib/hr-api';

const emptyForm = () => ({
  employee_id: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: '',
  department: '',
  status: 'Active' as StaffStatus,
  salary: '',
});

export default function StaffList() {
  const [staff, setStaff] = useState<BackendStaff[]>([]);
  const [leave, setLeave] = useState<BackendLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [view, setView] = useState<BackendStaff | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, l] = await Promise.all([listStaff(), listLeaveRequests()]);
      setStaff(s);
      setLeave(l);
    } catch (e: any) {
      setError(e?.message || 'Could not load staff from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.employee_id || !form.first_name || !form.last_name || !form.email) {
      toast.error('Employee ID, name and email are required.');
      return;
    }
    setSaving(true);
    try {
      await createStaff({ ...form, salary: parseFloat(form.salary) || 0 });
      toast.success('Staff member saved');
      setForm(emptyForm());
      setShowAdd(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the staff member.');
    } finally {
      setSaving(false);
    }
  };

  const decide = async (id: number, status: 'Approved' | 'Rejected') => {
    try {
      await setLeaveStatus(id, status);
      toast.success(`Leave ${status.toLowerCase()}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not update the leave request.');
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const btnOutline = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Staff Management</h1>
          <p className="text-sm text-muted-foreground">{staff.length} staff members</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
            <Plus size={18} /> Add Staff
          </button>
          <button onClick={load} className={btnOutline}><RefreshCw size={16} /> Refresh</button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>
      )}

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Salary</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{s.employee_id}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{staffName(s)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                  <td className="px-4 py-3 text-foreground">{s.role}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.department}</td>
                  <td className="px-4 py-3 text-right font-mono">{num(s.salary).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'Active' ? 'bg-success/10 text-success' : s.status === 'On Leave' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setView(s)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Eye size={16} /></button>
                  </td>
                </tr>
              ))}
              {!loading && staff.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No staff records yet.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-bold text-foreground mb-4">Recent Leave Requests</h2>
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Staff</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">From</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">To</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Days</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leave.map(lr => {
                const s = staff.find(st => st.id === lr.staff);
                return (
                  <tr key={lr.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium text-foreground">{lr.staff_name || (s ? staffName(s) : '-')}</td>
                    <td className="px-4 py-3 text-foreground">{lr.type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lr.start_date}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lr.end_date}</td>
                    <td className="px-4 py-3 text-foreground">{num(lr.days)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${lr.status === 'Approved' ? 'bg-success/10 text-success' : lr.status === 'Rejected' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                        {lr.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 space-x-1">
                      {lr.status === 'Pending' && <>
                        <button onClick={() => decide(lr.id, 'Approved')} className="px-2 py-1 rounded text-xs bg-success/10 text-success hover:bg-success/20">Approve</button>
                        <button onClick={() => decide(lr.id, 'Rejected')} className="px-2 py-1 rounded text-xs bg-destructive/10 text-destructive hover:bg-destructive/20">Reject</button>
                      </>}
                    </td>
                  </tr>
                );
              })}
              {leave.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No leave requests.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-lg font-bold text-foreground">Add Staff Member</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Employee ID" value={form.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))} className={inputClass} />
              <input placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputClass} />
              <input placeholder="First name" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} className={inputClass} />
              <input placeholder="Last name" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} className={inputClass} />
              <input placeholder="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inputClass} />
              <input placeholder="Role" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className={inputClass} />
              <input placeholder="Department" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} className={inputClass} />
              <input type="number" min="0" step="0.01" placeholder="Monthly salary" value={form.salary} onChange={e => setForm(p => ({ ...p, salary: e.target.value }))} className={inputClass} />
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as StaffStatus }))} className={inputClass}>
                <option>Active</option>
                <option>On Leave</option>
                <option>Inactive</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className={btnOutline}>Close</button>
              <button disabled={saving} onClick={handleAdd} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-60">Save Staff</button>
            </div>
          </div>
        </div>
      )}

      {view && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">{staffName(view)}</h2>
              <button onClick={() => setView(null)} className="text-muted-foreground"><X size={18} /></button>
            </div>
            <p className="text-sm text-muted-foreground font-mono">{view.employee_id}</p>
            <p className="text-sm">{view.role} · {view.department}</p>
            <p className="text-sm">{view.email}{view.phone ? ` · ${view.phone}` : ''}</p>
            <p className="text-sm">Monthly salary: <span className="font-mono">{num(view.salary).toLocaleString()}</span></p>
            <p className="text-sm">Status: {view.status}</p>
          </div>
        </div>
      )}
    </div>
  );
}
