import React, { useState } from 'react';
import { staff, leaveRequests, leaveAllocations, LeaveRequest, LeaveAllocation } from '@/lib/dummy-data';
import { Plus, Calendar, DollarSign, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

type Tab = 'requests' | 'allocations' | 'payroll';

export default function LeaveManagement() {
  const [tab, setTab] = useState<Tab>('requests');
  const [requests, setRequests] = useState<LeaveRequest[]>(leaveRequests);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>(leaveAllocations);
  const [showAddRequest, setShowAddRequest] = useState(false);
  const [editAlloc, setEditAlloc] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<LeaveAllocation>>({});
  const [reqForm, setReqForm] = useState({ staffId: '', type: 'Annual' as LeaveRequest['type'], startDate: '', endDate: '', reason: '', paid: true });

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'requests', label: 'Leave Requests', icon: <Calendar size={16} /> },
    { id: 'allocations', label: 'Allocations', icon: <CheckCircle size={16} /> },
    { id: 'payroll', label: 'Leave & Payroll', icon: <DollarSign size={16} /> },
  ];

  const calcDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  };

  const handleAddRequest = () => {
    if (!reqForm.staffId || !reqForm.startDate || !reqForm.endDate) return;
    const days = calcDays(reqForm.startDate, reqForm.endDate);
    const newReq: LeaveRequest = {
      id: String(requests.length + 1),
      staffId: reqForm.staffId,
      type: reqForm.type,
      startDate: reqForm.startDate,
      endDate: reqForm.endDate,
      days,
      reason: reqForm.reason,
      status: 'Pending',
      paid: reqForm.paid,
    };
    setRequests(prev => [...prev, newReq]);
    setShowAddRequest(false);
    setReqForm({ staffId: '', type: 'Annual', startDate: '', endDate: '', reason: '', paid: true });
  };

  const approveReject = (id: string, status: 'Approved' | 'Rejected') => {
    setRequests(prev => prev.map(r => {
      if (r.id !== id) return r;
      if (status === 'Approved') {
        const typeKey = r.type.toLowerCase() as string;
        const usedKey = `${typeKey}Used` as keyof LeaveAllocation;
        setAllocations(allocs => allocs.map(a => {
          if (a.staffId !== r.staffId) return a;
          return { ...a, [usedKey]: (a[usedKey] as number || 0) + r.days };
        }));
      }
      return { ...r, status };
    }));
  };

  const saveAllocation = (staffId: string) => {
    setAllocations(prev => prev.map(a => a.staffId === staffId ? { ...a, ...editValues } : a));
    setEditAlloc(null);
    setEditValues({});
  };

  const getLeaveBalance = (alloc: LeaveAllocation, type: string) => {
    const typeKey = type.toLowerCase() as keyof LeaveAllocation;
    const usedKey = `${type.toLowerCase()}Used` as keyof LeaveAllocation;
    const total = (alloc[typeKey] as number) || 0;
    const used = (alloc[usedKey] as number) || 0;
    return { total, used, remaining: total - used };
  };

  const dailyRate = (staffId: string) => {
    const s = staff.find(st => st.id === staffId);
    return s ? s.salary / 22 : 0; // 22 working days
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Leave Management</h1>
          <p className="text-sm text-muted-foreground">Track leave allocations, requests and payroll impact</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* LEAVE REQUESTS */}
      {tab === 'requests' && (
        <div className="space-y-4">
          <button onClick={() => setShowAddRequest(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
            <Plus size={18} /> New Leave Request
          </button>

          {showAddRequest && (
            <div className="bg-card rounded-xl shadow-card p-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-4">Submit Leave Request</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Staff Member</label>
                  <select value={reqForm.staffId} onChange={e => setReqForm(p => ({ ...p, staffId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
                    <option value="">Select</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Leave Type</label>
                  <select value={reqForm.type} onChange={e => setReqForm(p => ({ ...p, type: e.target.value as any }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
                    {['Annual', 'Sick', 'Maternity', 'Personal', 'Compassionate'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Start Date</label>
                  <input type="date" value={reqForm.startDate} onChange={e => setReqForm(p => ({ ...p, startDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">End Date</label>
                  <input type="date" value={reqForm.endDate} onChange={e => setReqForm(p => ({ ...p, endDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Days</label>
                  <input readOnly value={calcDays(reqForm.startDate, reqForm.endDate)} className="w-full px-3 py-2 rounded-lg border border-input bg-muted text-foreground text-sm" />
                </div>
                <div className="flex items-end gap-3">
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input type="checkbox" checked={reqForm.paid} onChange={e => setReqForm(p => ({ ...p, paid: e.target.checked }))} className="rounded border-input" />
                    Paid Leave
                  </label>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Reason</label>
                  <textarea value={reqForm.reason} onChange={e => setReqForm(p => ({ ...p, reason: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                </div>
              </div>
              {reqForm.staffId && reqForm.startDate && reqForm.endDate && (() => {
                const alloc = allocations.find(a => a.staffId === reqForm.staffId);
                if (!alloc) return null;
                const bal = getLeaveBalance(alloc, reqForm.type);
                const days = calcDays(reqForm.startDate, reqForm.endDate);
                const exceeds = days > bal.remaining;
                return (
                  <div className={`mt-3 p-3 rounded-lg text-sm ${exceeds ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                    {exceeds ? <AlertTriangle size={14} className="inline mr-1" /> : <CheckCircle size={14} className="inline mr-1" />}
                    {reqForm.type} balance: {bal.remaining} days remaining ({bal.used}/{bal.total} used).
                    {exceeds && ` Exceeds by ${days - bal.remaining} days — unpaid leave will apply for excess days.`}
                    {reqForm.paid && ` Paid value: $${(Math.min(days, bal.remaining) * dailyRate(reqForm.staffId)).toFixed(2)}`}
                  </div>
                );
              })()}
              <div className="flex gap-2 mt-4">
                <button onClick={handleAddRequest} className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground font-medium text-sm">Submit</button>
                <button onClick={() => setShowAddRequest(false)} className="px-4 py-2 rounded-lg border border-input text-foreground font-medium text-sm">Cancel</button>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Staff</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">From</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">To</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Days</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Paid</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => {
                    const s = staff.find(st => st.id === r.staffId);
                    return (
                      <tr key={r.id} className="border-b border-border hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium text-foreground">{s?.firstName} {s?.lastName}</td>
                        <td className="px-4 py-3 text-foreground">{r.type}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.startDate}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.endDate}</td>
                        <td className="px-4 py-3 text-foreground">{r.days}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.paid ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                            {r.paid ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'Approved' ? 'bg-success/10 text-success' : r.status === 'Rejected' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 space-x-1">
                          {r.status === 'Pending' && <>
                            <button onClick={() => approveReject(r.id, 'Approved')} className="px-2 py-1 rounded text-xs bg-success/10 text-success hover:bg-success/20">Approve</button>
                            <button onClick={() => approveReject(r.id, 'Rejected')} className="px-2 py-1 rounded text-xs bg-destructive/10 text-destructive hover:bg-destructive/20">Reject</button>
                          </>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ALLOCATIONS */}
      {tab === 'allocations' && (
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Staff</th>
                  <th className="text-center px-3 py-3 font-medium text-muted-foreground">Annual</th>
                  <th className="text-center px-3 py-3 font-medium text-muted-foreground">Sick</th>
                  <th className="text-center px-3 py-3 font-medium text-muted-foreground">Maternity</th>
                  <th className="text-center px-3 py-3 font-medium text-muted-foreground">Personal</th>
                  <th className="text-center px-3 py-3 font-medium text-muted-foreground">Compassionate</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map(a => {
                  const s = staff.find(st => st.id === a.staffId);
                  const isEditing = editAlloc === a.staffId;
                  const types = ['annual', 'sick', 'maternity', 'personal', 'compassionate'] as const;
                  return (
                    <tr key={a.staffId} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium text-foreground">{s?.firstName} {s?.lastName}</td>
                      {types.map(type => {
                        const bal = getLeaveBalance(a, type);
                        return (
                          <td key={type} className="px-3 py-3 text-center">
                            {isEditing ? (
                              <input type="number" value={editValues[type] ?? a[type]} onChange={e => setEditValues(p => ({ ...p, [type]: Number(e.target.value) }))} className="w-16 px-1 py-1 rounded border border-input bg-background text-foreground text-xs text-center" />
                            ) : (
                              <div>
                                <span className="text-foreground font-medium">{bal.remaining}</span>
                                <span className="text-muted-foreground text-xs">/{bal.total}</span>
                                {bal.used > 0 && <span className="text-xs text-muted-foreground block">({bal.used} used)</span>}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button onClick={() => saveAllocation(a.staffId)} className="px-2 py-1 rounded text-xs bg-success/10 text-success hover:bg-success/20">Save</button>
                            <button onClick={() => { setEditAlloc(null); setEditValues({}); }} className="px-2 py-1 rounded text-xs bg-destructive/10 text-destructive hover:bg-destructive/20">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditAlloc(a.staffId); setEditValues({}); }} className="px-2 py-1 rounded text-xs bg-primary/10 text-primary hover:bg-primary/20">Edit</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LEAVE & PAYROLL */}
      {tab === 'payroll' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl p-5 shadow-card">
              <p className="text-sm text-muted-foreground">Total Paid Leave Days</p>
              <p className="text-2xl font-display font-bold text-foreground mt-1">{requests.filter(r => r.status === 'Approved' && r.paid).reduce((s, r) => s + r.days, 0)}</p>
            </div>
            <div className="bg-card rounded-xl p-5 shadow-card">
              <p className="text-sm text-muted-foreground">Paid Leave Cost</p>
              <p className="text-2xl font-display font-bold text-success mt-1">
                ${requests.filter(r => r.status === 'Approved' && r.paid).reduce((s, r) => s + r.days * dailyRate(r.staffId), 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-card rounded-xl p-5 shadow-card">
              <p className="text-sm text-muted-foreground">Unpaid Leave Days</p>
              <p className="text-2xl font-display font-bold text-destructive mt-1">{requests.filter(r => r.status === 'Approved' && !r.paid).reduce((s, r) => s + r.days, 0)}</p>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-display font-bold text-foreground">Leave Payroll Impact</h2>
              <p className="text-xs text-muted-foreground">Shows how leave affects each staff member's pay. Excess unpaid days reduce net salary.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Staff</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Monthly Salary</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Daily Rate</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Paid Leave</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Unpaid Leave</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Deduction</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Adjusted Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.filter(s => s.status !== 'Terminated').map(s => {
                    const dr = dailyRate(s.id);
                    const approvedReqs = requests.filter(r => r.staffId === s.id && r.status === 'Approved');
                    const paidDays = approvedReqs.filter(r => r.paid).reduce((sum, r) => sum + r.days, 0);
                    const unpaidDays = approvedReqs.filter(r => !r.paid).reduce((sum, r) => sum + r.days, 0);
                    
                    // Check if paid days exceed allocation
                    const alloc = allocations.find(a => a.staffId === s.id);
                    let excessDays = 0;
                    if (alloc) {
                      const totalAlloc = alloc.annual + alloc.sick + alloc.personal + alloc.compassionate;
                      const totalUsed = alloc.annualUsed + alloc.sickUsed + alloc.personalUsed + alloc.compassionateUsed;
                      if (totalUsed > totalAlloc) excessDays = totalUsed - totalAlloc;
                    }
                    
                    const deduction = (unpaidDays + excessDays) * dr;
                    const adjusted = s.salary - deduction;
                    
                    return (
                      <tr key={s.id} className="border-b border-border hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium text-foreground">{s.firstName} {s.lastName}</td>
                        <td className="px-4 py-3 text-right text-foreground">${s.salary.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">${dr.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">{paidDays}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${unpaidDays > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                            {unpaidDays}{excessDays > 0 && ` (+${excessDays} excess)`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-destructive">{deduction > 0 ? `-$${deduction.toFixed(2)}` : '-'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">${adjusted.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
