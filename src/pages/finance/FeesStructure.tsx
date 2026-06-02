import React, { useState, useMemo } from 'react';
import {
  FeeStructure, FeeItem, StudentAssignment, GeneratedInvoice, AcademicTerm, AuditEntry,
  BillingCycle, StructureStatus,
  academicTerms as seedTerms, initialStructures, initialAssignments,
  structureTotal, structureFullTotal, generateInvoiceForAssignment, agingBuckets,
} from '@/lib/fees-structure-store';
import { students, glAccounts, classes } from '@/lib/dummy-data';
import ReportHeader from '@/components/ReportHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus, Printer, Check, X, Eye, Layers, Calendar, Users, Receipt,
  PlayCircle, History, FileSpreadsheet, AlertTriangle, DollarSign, Trash2, Copy,
} from 'lucide-react';

type Tab = 'structures' | 'calendar' | 'assignments' | 'billing' | 'invoices' | 'aging' | 'audit';

const revenueAccounts = glAccounts.filter(a => a.type === 'Revenue');
const levels = Array.from(new Set(classes.map(c => c.level)));

export default function FeesStructure() {
  const [tab, setTab] = useState<Tab>('structures');
  const [structures, setStructures] = useState<FeeStructure[]>(initialStructures);
  const [terms, setTerms] = useState<AcademicTerm[]>(seedTerms);
  const [assignments, setAssignments] = useState<StudentAssignment[]>(initialAssignments);
  const [invoices, setInvoices] = useState<GeneratedInvoice[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([
    { id: 'a1', timestamp: '2025-11-15 09:12', actor: 'Principal', action: 'Approved', entity: 'FeeStructure', entityId: 'fs1', details: 'Form 1 Day Scholar - 2026 v1 approved' },
    { id: 'a2', timestamp: '2025-11-15 09:13', actor: 'Principal', action: 'Approved', entity: 'FeeStructure', entityId: 'fs2', details: 'Form 3 Boarding - 2026 v1 approved' },
  ]);

  const log = (action: string, entity: string, entityId: string, details: string) =>
    setAudit(p => [{ id: String(Date.now()), timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16), actor: 'Current User', action, entity, entityId, details }, ...p]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'structures', label: 'Fee Structures', icon: <Layers size={16} /> },
    { id: 'calendar', label: 'Academic Calendar', icon: <Calendar size={16} /> },
    { id: 'assignments', label: 'Student Assignments', icon: <Users size={16} /> },
    { id: 'billing', label: 'Billing Engine', icon: <PlayCircle size={16} /> },
    { id: 'invoices', label: 'Generated Invoices', icon: <Receipt size={16} /> },
    { id: 'aging', label: 'Aging Analysis', icon: <AlertTriangle size={16} /> },
    { id: 'audit', label: 'Audit Trail', icon: <History size={16} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Fees Structure & Automated Billing</h1>
          <p className="text-sm text-muted-foreground">Versioned fee structures, academic calendar driven invoicing, AR & GL integration</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm hover:bg-muted">
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border no-print">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'structures' && <StructuresTab structures={structures} setStructures={setStructures} log={log} />}
      {tab === 'calendar' && <CalendarTab terms={terms} setTerms={setTerms} log={log} />}
      {tab === 'assignments' && <AssignmentsTab assignments={assignments} setAssignments={setAssignments} structures={structures} log={log} />}
      {tab === 'billing' && <BillingTab structures={structures} terms={terms} assignments={assignments} invoices={invoices} setInvoices={setInvoices} log={log} />}
      {tab === 'invoices' && <InvoicesTab invoices={invoices} setInvoices={setInvoices} structures={structures} log={log} />}
      {tab === 'aging' && <AgingTab invoices={invoices} />}
      {tab === 'audit' && <AuditTab audit={audit} />}
    </div>
  );
}

// ============== STRUCTURES TAB ==============
function StructuresTab({ structures, setStructures, log }: { structures: FeeStructure[]; setStructures: React.Dispatch<React.SetStateAction<FeeStructure[]>>; log: (a: string, e: string, id: string, d: string) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FeeStructure | null>(null);
  const [viewing, setViewing] = useState<FeeStructure | null>(null);

  const updateStatus = (id: string, status: StructureStatus) => {
    setStructures(p => p.map(s => s.id === id ? { ...s, status, approvedBy: status === 'Approved' ? 'Current User' : s.approvedBy, approvedAt: status === 'Approved' ? new Date().toISOString().split('T')[0] : s.approvedAt } : s));
    log(status, 'FeeStructure', id, `Structure ${id} marked ${status}`);
  };

  const newVersion = (s: FeeStructure) => {
    const newer: FeeStructure = {
      ...s,
      id: `fs-${Date.now()}`,
      version: s.version + 1,
      parentId: s.id,
      status: 'Draft',
      createdAt: new Date().toISOString().split('T')[0],
      approvedAt: undefined,
      approvedBy: undefined,
    };
    setStructures(p => p.map(x => x.id === s.id ? { ...x, status: 'Archived' } : x).concat(newer));
    log('Versioned', 'FeeStructure', newer.id, `Created v${newer.version} from ${s.code}`);
    setEditing(newer);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center no-print">
        <p className="text-sm text-muted-foreground">{structures.length} structures · {structures.filter(s => s.status === 'Approved').length} active</p>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus size={16} /> New Structure
        </button>
      </div>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Code</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Level / Class</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Year</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Version</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Termly Total</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Status</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {structures.map(s => (
                <tr key={s.id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono text-xs text-primary">{s.code}</td>
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{s.level}{s.className ? ` / ${s.className}` : ''}</td>
                  <td className="px-3 py-2 text-center">{s.academicYear}</td>
                  <td className="px-3 py-2 text-center">v{s.version}</td>
                  <td className="px-3 py-2 text-right font-mono">{s.currency} {structureFullTotal(s).toLocaleString()}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.status === 'Approved' ? 'bg-success/10 text-success' :
                      s.status === 'Pending Approval' ? 'bg-warning/10 text-warning' :
                      s.status === 'Draft' ? 'bg-muted text-muted-foreground' :
                      'bg-destructive/10 text-destructive'
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 justify-center">
                      <button onClick={() => setViewing(s)} className="text-primary hover:text-primary/80" title="View"><Eye size={14} /></button>
                      {s.status === 'Draft' && <button onClick={() => updateStatus(s.id, 'Pending Approval')} className="text-warning text-xs hover:underline">Submit</button>}
                      {s.status === 'Pending Approval' && <button onClick={() => updateStatus(s.id, 'Approved')} className="text-success text-xs hover:underline">Approve</button>}
                      {s.status === 'Approved' && <button onClick={() => newVersion(s)} className="text-primary text-xs hover:underline" title="Create new version"><Copy size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {showForm && (
        <StructureForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={(s) => {
            setStructures(p => {
              const exists = p.find(x => x.id === s.id);
              return exists ? p.map(x => x.id === s.id ? s : x) : [...p, s];
            });
            log(editing ? 'Updated' : 'Created', 'FeeStructure', s.id, `${s.code} - ${s.name}`);
            setShowForm(false); setEditing(null);
          }}
        />
      )}

      {viewing && <StructureView structure={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function StructureForm({ initial, onClose, onSave }: { initial: FeeStructure | null; onClose: () => void; onSave: (s: FeeStructure) => void }) {
  const [form, setForm] = useState<FeeStructure>(initial ?? {
    id: `fs-${Date.now()}`,
    code: `FS-${Date.now().toString().slice(-5)}`,
    name: '', academicYear: '2026', level: '', currency: 'USD',
    version: 1, status: 'Draft', effectiveFrom: new Date().toISOString().split('T')[0],
    items: [], createdBy: 'Current User', createdAt: new Date().toISOString().split('T')[0],
  });

  const updateItem = (idx: number, patch: Partial<FeeItem>) =>
    setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, ...patch } : it) }));
  const addItem = () =>
    setForm(f => ({ ...f, items: [...f.items, { id: `it-${Date.now()}`, name: '', glAccountCode: revenueAccounts[0]?.code ?? '', amount: 0, cycle: 'Termly', mandatory: true, appliesTo: 'All' }] }));
  const removeItem = (idx: number) =>
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const valid = form.name && form.level && form.items.length > 0 && form.items.every(i => i.name && i.glAccountCode && i.amount > 0);

  const input = "w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-4xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{initial ? 'Edit Fee Structure' : 'New Fee Structure'}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className="text-xs text-muted-foreground">Code</label><input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className={input} /></div>
          <div className="sm:col-span-2"><label className="text-xs text-muted-foreground">Structure Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={input} placeholder="e.g. Form 3 Boarding - 2026" /></div>
          <div><label className="text-xs text-muted-foreground">Academic Year</label><input value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} className={input} /></div>
          <div><label className="text-xs text-muted-foreground">Level</label>
            <select value={form.level ?? ''} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className={input}>
              <option value="">Select level...</option>
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-muted-foreground">Class (optional)</label>
            <select value={form.className ?? ''} onChange={e => setForm(f => ({ ...f, className: e.target.value || undefined }))} className={input}>
              <option value="">All classes in level</option>
              {classes.filter(c => c.level === form.level).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-muted-foreground">Stream</label><input value={form.stream ?? ''} onChange={e => setForm(f => ({ ...f, stream: e.target.value }))} className={input} placeholder="Optional" /></div>
          <div><label className="text-xs text-muted-foreground">Program</label><input value={form.program ?? ''} onChange={e => setForm(f => ({ ...f, program: e.target.value }))} className={input} placeholder="Optional" /></div>
          <div><label className="text-xs text-muted-foreground">Currency</label><input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className={input} /></div>
          <div><label className="text-xs text-muted-foreground">Effective From</label><input type="date" value={form.effectiveFrom} onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} className={input} /></div>
          <div className="sm:col-span-3"><label className="text-xs text-muted-foreground">Notes</label><input value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={input} /></div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Fee Items (linked to GL revenue accounts)</h3>
            <button onClick={addItem} className="text-primary text-xs hover:underline">+ Add Item</button>
          </div>
          {form.items.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">No fee items yet</p>}
          {form.items.map((it, i) => (
            <div key={it.id} className="grid grid-cols-12 gap-2 items-end p-2 rounded-lg border border-border">
              <div className="col-span-3"><label className="text-[10px] text-muted-foreground">Item</label><input value={it.name} onChange={e => updateItem(i, { name: e.target.value })} className={input} placeholder="e.g. Tuition" /></div>
              <div className="col-span-3"><label className="text-[10px] text-muted-foreground">GL Account</label>
                <select value={it.glAccountCode} onChange={e => updateItem(i, { glAccountCode: e.target.value })} className={input}>
                  {revenueAccounts.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                </select>
              </div>
              <div className="col-span-2"><label className="text-[10px] text-muted-foreground">Amount</label><input type="number" value={it.amount || ''} onChange={e => updateItem(i, { amount: parseFloat(e.target.value) || 0 })} className={input} /></div>
              <div className="col-span-2"><label className="text-[10px] text-muted-foreground">Cycle</label>
                <select value={it.cycle} onChange={e => updateItem(i, { cycle: e.target.value as BillingCycle })} className={input}>
                  {(['Monthly', 'Termly', 'Annual', 'One-time', 'Custom'] as BillingCycle[]).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-1"><label className="text-[10px] text-muted-foreground">Applies</label>
                <select value={it.appliesTo ?? 'All'} onChange={e => updateItem(i, { appliesTo: e.target.value as FeeItem['appliesTo'] })} className={input}>
                  <option value="All">All</option><option value="Boarding">Boarding</option><option value="Day">Day</option>
                </select>
              </div>
              <div className="col-span-1 flex items-center gap-1">
                <label className="text-[10px] flex items-center gap-1"><input type="checkbox" checked={it.mandatory} onChange={e => updateItem(i, { mandatory: e.target.checked })} />Req</label>
                <button onClick={() => removeItem(i)} className="text-destructive"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          <div className="text-right text-sm font-semibold">Full Total: {form.currency} {form.items.reduce((s, i) => s + i.amount, 0).toLocaleString()}</div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-input text-sm">Cancel</button>
          <button disabled={!valid} onClick={() => onSave(form)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">Save Draft</button>
        </div>
      </div>
    </div>
  );
}

function StructureView({ structure, onClose }: { structure: FeeStructure; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 no-print">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Fee Schedule</h2>
          <div className="flex gap-2"><button onClick={() => window.print()} className="text-primary"><Printer size={18} /></button><button onClick={onClose}><X size={20} /></button></div>
        </div>
        <ReportHeader reportTitle={`Fee Schedule - ${structure.name}`} />
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p><span className="text-muted-foreground">Code:</span> <span className="font-mono">{structure.code}</span></p>
          <p><span className="text-muted-foreground">Version:</span> v{structure.version}</p>
          <p><span className="text-muted-foreground">Year:</span> {structure.academicYear}</p>
          <p><span className="text-muted-foreground">Level:</span> {structure.level}</p>
          <p><span className="text-muted-foreground">Status:</span> {structure.status}</p>
          <p><span className="text-muted-foreground">Effective:</span> {structure.effectiveFrom}</p>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted"><th className="text-left px-3 py-2">Item</th><th className="text-left px-3 py-2">GL Account</th><th className="text-left px-3 py-2">Cycle</th><th className="text-left px-3 py-2">Applies</th><th className="text-right px-3 py-2">Amount</th></tr></thead>
          <tbody>
            {structure.items.map(i => (
              <tr key={i.id} className="border-b border-border">
                <td className="px-3 py-2">{i.name} {!i.mandatory && <span className="text-xs text-muted-foreground">(optional)</span>}</td>
                <td className="px-3 py-2 font-mono text-xs text-primary">{i.glAccountCode}</td>
                <td className="px-3 py-2">{i.cycle}</td>
                <td className="px-3 py-2">{i.appliesTo ?? 'All'}</td>
                <td className="px-3 py-2 text-right font-mono">{structure.currency} {i.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="font-semibold"><td colSpan={4} className="px-3 py-2">Total Mandatory (per cycle)</td><td className="px-3 py-2 text-right">{structure.currency} {structureTotal(structure).toLocaleString()}</td></tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ============== CALENDAR TAB ==============
function CalendarTab({ terms, setTerms, log }: { terms: AcademicTerm[]; setTerms: React.Dispatch<React.SetStateAction<AcademicTerm[]>>; log: (a: string, e: string, id: string, d: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<AcademicTerm>({ id: '', name: '', academicYear: '2026', startDate: '', endDate: '', billingDate: '' });
  const input = "w-full px-3 py-2 rounded-lg border border-input bg-background text-sm";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Academic Calendar — drives auto-billing</CardTitle>
        <button onClick={() => setAdding(true)} className="text-primary text-sm flex items-center gap-1"><Plus size={14} /> Add Term</button>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted"><th className="text-left px-3 py-2">Term</th><th className="text-left px-3 py-2">Year</th><th className="text-left px-3 py-2">Start</th><th className="text-left px-3 py-2">End</th><th className="text-left px-3 py-2">Billing Date</th></tr></thead>
          <tbody>
            {terms.map(t => (
              <tr key={t.id} className="border-b border-border">
                <td className="px-3 py-2 font-medium">{t.name}</td>
                <td className="px-3 py-2">{t.academicYear}</td>
                <td className="px-3 py-2">{t.startDate}</td>
                <td className="px-3 py-2">{t.endDate}</td>
                <td className="px-3 py-2 text-primary">{t.billingDate}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {adding && (
          <div className="mt-4 p-4 border border-border rounded-lg space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <input placeholder="Term name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={input} />
              <input placeholder="Year" value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })} className={input} />
              <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className={input} />
              <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className={input} />
              <input type="date" value={form.billingDate} onChange={e => setForm({ ...form, billingDate: e.target.value })} className={input} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAdding(false)} className="px-3 py-1.5 rounded border border-input text-sm">Cancel</button>
              <button onClick={() => {
                if (!form.name || !form.startDate) return;
                const id = `t-${Date.now()}`;
                setTerms(p => [...p, { ...form, id }]);
                log('Created', 'AcademicTerm', id, form.name);
                setAdding(false);
                setForm({ id: '', name: '', academicYear: '2026', startDate: '', endDate: '', billingDate: '' });
              }} className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm">Save</button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============== ASSIGNMENTS TAB ==============
function AssignmentsTab({ assignments, setAssignments, structures, log }: { assignments: StudentAssignment[]; setAssignments: React.Dispatch<React.SetStateAction<StudentAssignment[]>>; structures: FeeStructure[]; log: (a: string, e: string, id: string, d: string) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<StudentAssignment>>({});
  const input = "w-full px-3 py-2 rounded-lg border border-input bg-background text-sm";

  const autoSuggest = () => {
    const unassigned = students.filter(s => !assignments.some(a => a.studentId === s.id));
    const created: StudentAssignment[] = [];
    unassigned.forEach(s => {
      const match = structures.find(st => st.status === 'Approved' && st.level === s.level);
      if (match) created.push({ id: `a-${Date.now()}-${s.id}`, studentId: s.id, structureId: match.id, assignedAt: new Date().toISOString().split('T')[0] });
    });
    if (created.length) {
      setAssignments(p => [...p, ...created]);
      log('Auto-Assigned', 'StudentAssignment', 'bulk', `Auto-assigned ${created.length} students based on class/level`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between no-print">
        <p className="text-sm text-muted-foreground">{assignments.length} assignments · Triggers invoice on next billing date</p>
        <div className="flex gap-2">
          <button onClick={autoSuggest} className="px-3 py-2 rounded-lg border border-input text-sm hover:bg-muted">Auto-assign by Level</button>
          <button onClick={() => { setForm({}); setShowForm(true); }} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm"><Plus size={14} className="inline mr-1" /> Assign</button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted"><th className="text-left px-3 py-2">Student</th><th className="text-left px-3 py-2">Reg #</th><th className="text-left px-3 py-2">Class</th><th className="text-left px-3 py-2">Structure</th><th className="text-right px-3 py-2">Discount</th><th className="text-right px-3 py-2">Scholarship</th><th className="text-left px-3 py-2">Notes</th><th></th></tr></thead>
            <tbody>
              {assignments.map(a => {
                const st = students.find(s => s.id === a.studentId);
                const fs = structures.find(s => s.id === a.structureId);
                return (
                  <tr key={a.id} className="border-b border-border">
                    <td className="px-3 py-2">{st?.firstName} {st?.lastName}</td>
                    <td className="px-3 py-2 font-mono text-xs">{st?.regNumber}</td>
                    <td className="px-3 py-2">{st?.className}</td>
                    <td className="px-3 py-2">{fs?.code}</td>
                    <td className="px-3 py-2 text-right">{a.discountPercent ? `${a.discountPercent}%` : '-'}</td>
                    <td className="px-3 py-2 text-right">{a.scholarshipAmount ? `$${a.scholarshipAmount}` : '-'}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{a.notes ?? ''}</td>
                    <td className="px-3 py-2"><button onClick={() => { setAssignments(p => p.filter(x => x.id !== a.id)); log('Removed', 'Assignment', a.id, `Student ${st?.regNumber}`); }} className="text-destructive"><Trash2 size={14} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg p-6 space-y-3">
            <div className="flex justify-between"><h3 className="font-bold">Assign Fee Structure</h3><button onClick={() => setShowForm(false)}><X size={18} /></button></div>
            <div><label className="text-xs text-muted-foreground">Student</label>
              <select value={form.studentId ?? ''} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} className={input}>
                <option value="">Select...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.className})</option>)}
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground">Fee Structure</label>
              <select value={form.structureId ?? ''} onChange={e => setForm(f => ({ ...f, structureId: e.target.value }))} className={input}>
                <option value="">Select...</option>
                {structures.filter(s => s.status === 'Approved').map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">Discount %</label><input type="number" value={form.discountPercent ?? ''} onChange={e => setForm(f => ({ ...f, discountPercent: parseFloat(e.target.value) || undefined }))} className={input} /></div>
              <div><label className="text-xs text-muted-foreground">Scholarship $</label><input type="number" value={form.scholarshipAmount ?? ''} onChange={e => setForm(f => ({ ...f, scholarshipAmount: parseFloat(e.target.value) || undefined }))} className={input} /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Notes</label><input value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={input} /></div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded border border-input text-sm">Cancel</button>
              <button disabled={!form.studentId || !form.structureId} onClick={() => {
                const a: StudentAssignment = { id: `a-${Date.now()}`, studentId: form.studentId!, structureId: form.structureId!, discountPercent: form.discountPercent, scholarshipAmount: form.scholarshipAmount, notes: form.notes, assignedAt: new Date().toISOString().split('T')[0] };
                setAssignments(p => [...p, a]);
                log('Assigned', 'StudentAssignment', a.id, `${students.find(s => s.id === a.studentId)?.regNumber} → ${structures.find(s => s.id === a.structureId)?.code}`);
                setShowForm(false);
              }} className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm disabled:opacity-50">Assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============== BILLING ENGINE TAB ==============
function BillingTab({ structures, terms, assignments, invoices, setInvoices, log }: {
  structures: FeeStructure[]; terms: AcademicTerm[]; assignments: StudentAssignment[];
  invoices: GeneratedInvoice[]; setInvoices: React.Dispatch<React.SetStateAction<GeneratedInvoice[]>>;
  log: (a: string, e: string, id: string, d: string) => void;
}) {
  const [termId, setTermId] = useState(terms[0]?.id ?? '');
  const [preview, setPreview] = useState<GeneratedInvoice[]>([]);

  const generate = () => {
    const term = terms.find(t => t.id === termId);
    if (!term) return;
    const created: GeneratedInvoice[] = [];
    assignments.forEach((a, idx) => {
      const fs = structures.find(s => s.id === a.structureId);
      if (!fs || fs.status !== 'Approved') return;
      const st = students.find(s => s.id === a.studentId);
      if (!st) return;
      const exists = invoices.find(i => i.studentId === a.studentId && i.termId === term.id && i.structureId === fs.id);
      if (exists) return;
      created.push(generateInvoiceForAssignment(a, fs, term, st.boardingStatus as 'Boarding' | 'Day', idx + 1));
    });
    setPreview(created);
  };

  const post = () => {
    if (!preview.length) return;
    setInvoices(p => [...preview, ...p]);
    log('Auto-Posted', 'Invoice', termId, `Generated ${preview.length} invoices, posted to AR & GL (Dr 1200 / Cr 4xxx)`);
    setPreview([]);
  };

  const totalPreview = preview.reduce((s, i) => s + i.total, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><PlayCircle size={18} /> Automated Billing Engine</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Select an academic term — the engine will auto-generate invoices for every assigned student, applying discounts/scholarships, and post entries to Accounts Receivable & General Ledger.</p>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Term</label>
              <select value={termId} onChange={e => setTermId(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                {terms.map(t => <option key={t.id} value={t.id}>{t.name} (bills {t.billingDate})</option>)}
              </select>
            </div>
            <button onClick={generate} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Preview Run</button>
            {preview.length > 0 && <button onClick={post} className="px-4 py-2 rounded-lg bg-success text-success-foreground text-sm"><Check size={14} className="inline mr-1" /> Post {preview.length} Invoices</button>}
          </div>

          {preview.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-2 text-sm font-medium flex justify-between"><span>Preview — {preview.length} invoices</span><span>Total: ${totalPreview.toLocaleString()}</span></div>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border"><th className="text-left px-3 py-2">Invoice #</th><th className="text-left px-3 py-2">Student</th><th className="text-left px-3 py-2">Lines</th><th className="text-right px-3 py-2">Subtotal</th><th className="text-right px-3 py-2">Disc</th><th className="text-right px-3 py-2">Total</th></tr></thead>
                <tbody>
                  {preview.map(i => { const st = students.find(s => s.id === i.studentId); return (
                    <tr key={i.id} className="border-b border-border">
                      <td className="px-3 py-2 font-mono text-primary">{i.invoiceNumber}</td>
                      <td className="px-3 py-2">{st?.firstName} {st?.lastName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{i.lines.length} item(s)</td>
                      <td className="px-3 py-2 text-right">${i.subtotal.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-warning">${i.discount.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-semibold">${i.total.toLocaleString()}</td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Integration Status</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[
            { l: 'General Ledger', v: 'Connected', g: '4000, 4100, 4200' },
            { l: 'Accounts Receivable', v: 'Connected', g: 'GL 1200 - Debtors' },
            { l: 'Student Information', v: 'Connected', g: `${students.length} students` },
            { l: 'Academic Calendar', v: 'Connected', g: `${terms.length} terms` },
          ].map(x => (
            <div key={x.l} className="p-3 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">{x.l}</p>
              <p className="font-semibold text-success">{x.v}</p>
              <p className="text-xs text-muted-foreground">{x.g}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============== INVOICES TAB ==============
function InvoicesTab({ invoices, setInvoices, structures, log }: { invoices: GeneratedInvoice[]; setInvoices: React.Dispatch<React.SetStateAction<GeneratedInvoice[]>>; structures: FeeStructure[]; log: (a: string, e: string, id: string, d: string) => void }) {
  const [view, setView] = useState<GeneratedInvoice | null>(null);
  const total = invoices.reduce((s, i) => s + i.total, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total Invoices" value={String(invoices.length)} />
        <Stat label="Total Billed" value={`$${total.toLocaleString()}`} />
        <Stat label="Posted" value={String(invoices.filter(i => i.status === 'Posted').length)} />
        <Stat label="Cancelled" value={String(invoices.filter(i => i.status === 'Cancelled').length)} />
      </div>
      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          {invoices.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No invoices generated yet. Run the Billing Engine.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted"><th className="text-left px-3 py-2">Invoice #</th><th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Due</th><th className="text-left px-3 py-2">Student</th><th className="text-left px-3 py-2">Structure</th><th className="text-right px-3 py-2">Total</th><th className="text-center px-3 py-2">Status</th><th></th></tr></thead>
              <tbody>
                {invoices.map(i => { const st = students.find(s => s.id === i.studentId); const fs = structures.find(s => s.id === i.structureId); return (
                  <tr key={i.id} className="border-b border-border">
                    <td className="px-3 py-2 font-mono text-primary">{i.invoiceNumber}</td>
                    <td className="px-3 py-2">{i.date}</td>
                    <td className="px-3 py-2">{i.dueDate}</td>
                    <td className="px-3 py-2">{st?.firstName} {st?.lastName}</td>
                    <td className="px-3 py-2 text-xs">{fs?.code}</td>
                    <td className="px-3 py-2 text-right font-mono">${i.total.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-xs ${i.status === 'Posted' ? 'bg-primary/10 text-primary' : i.status === 'Paid' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{i.status}</span></td>
                    <td className="px-3 py-2 flex gap-2">
                      <button onClick={() => setView(i)} className="text-primary"><Eye size={14} /></button>
                      {i.status === 'Posted' && <button onClick={() => { setInvoices(p => p.map(x => x.id === i.id ? { ...x, status: 'Cancelled' } : x)); log('Cancelled', 'Invoice', i.id, i.invoiceNumber); }} className="text-destructive text-xs">Cancel</button>}
                    </td>
                  </tr>
                ); })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {view && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 no-print">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between"><h3 className="font-bold">Invoice {view.invoiceNumber}</h3><div className="flex gap-2"><button onClick={() => window.print()}><Printer size={18} /></button><button onClick={() => setView(null)}><X size={18} /></button></div></div>
            <ReportHeader reportTitle="Tax Invoice" />
            <div className="grid grid-cols-2 text-sm gap-2">
              <p>Student: <strong>{students.find(s => s.id === view.studentId)?.firstName} {students.find(s => s.id === view.studentId)?.lastName}</strong></p>
              <p>Date: {view.date}</p>
              <p>Due: {view.dueDate}</p>
              <p>Auto: {view.autoGenerated ? 'Yes' : 'No'}</p>
            </div>
            <table className="w-full text-sm"><thead><tr className="border-b bg-muted"><th className="text-left px-2 py-1">Description</th><th className="text-left px-2 py-1">GL</th><th className="text-right px-2 py-1">Amount</th></tr></thead>
              <tbody>{view.lines.map((l, i) => <tr key={i} className="border-b border-border"><td className="px-2 py-1">{l.description}</td><td className="px-2 py-1 font-mono text-xs">{l.glAccountCode}</td><td className="px-2 py-1 text-right">${l.amount.toLocaleString()}</td></tr>)}</tbody>
            </table>
            <div className="text-right space-y-1 text-sm">
              <p>Subtotal: <strong>${view.subtotal.toLocaleString()}</strong></p>
              <p>Discount: <strong className="text-warning">- ${view.discount.toLocaleString()}</strong></p>
              <p className="text-lg">Total: <strong>{view.currency} ${view.total.toLocaleString()}</strong></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============== AGING TAB ==============
function AgingTab({ invoices }: { invoices: GeneratedInvoice[] }) {
  const buckets = useMemo(() => agingBuckets(invoices), [invoices]);
  const totalOutstanding = Object.values(buckets).reduce((s, v) => s + v, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Current" value={`$${buckets.current.toLocaleString()}`} />
        <Stat label="1-30 days" value={`$${buckets.b30.toLocaleString()}`} />
        <Stat label="31-60 days" value={`$${buckets.b60.toLocaleString()}`} />
        <Stat label="61-90 days" value={`$${buckets.b90.toLocaleString()}`} />
        <Stat label="90+ days" value={`$${buckets.over90.toLocaleString()}`} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet size={18} /> Debtor Aging — Total Outstanding ${totalOutstanding.toLocaleString()}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted"><th className="text-left px-3 py-2">Student</th><th className="text-right px-3 py-2">Current</th><th className="text-right px-3 py-2">1-30</th><th className="text-right px-3 py-2">31-60</th><th className="text-right px-3 py-2">61-90</th><th className="text-right px-3 py-2">90+</th><th className="text-right px-3 py-2">Total</th></tr></thead>
            <tbody>
              {students.map(s => {
                const studentInvs = invoices.filter(i => i.studentId === s.id && i.status !== 'Paid' && i.status !== 'Cancelled');
                const b = agingBuckets(studentInvs);
                const total = b.current + b.b30 + b.b60 + b.b90 + b.over90;
                if (total === 0) return null;
                return (
                  <tr key={s.id} className="border-b border-border">
                    <td className="px-3 py-2">{s.firstName} {s.lastName}</td>
                    <td className="px-3 py-2 text-right">${b.current.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">${b.b30.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-warning">${b.b60.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-warning">${b.b90.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-destructive">${b.over90.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-semibold">${total.toLocaleString()}</td>
                  </tr>
                );
              })}
              {totalOutstanding === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Run billing engine to populate aging data.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============== AUDIT TAB ==============
function AuditTab({ audit }: { audit: AuditEntry[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><History size={18} /> Audit Trail</CardTitle></CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted"><th className="text-left px-3 py-2">Timestamp</th><th className="text-left px-3 py-2">Actor</th><th className="text-left px-3 py-2">Action</th><th className="text-left px-3 py-2">Entity</th><th className="text-left px-3 py-2">Details</th></tr></thead>
          <tbody>
            {audit.map(a => (
              <tr key={a.id} className="border-b border-border">
                <td className="px-3 py-2 font-mono text-xs">{a.timestamp}</td>
                <td className="px-3 py-2">{a.actor}</td>
                <td className="px-3 py-2"><span className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">{a.action}</span></td>
                <td className="px-3 py-2 text-muted-foreground">{a.entity}</td>
                <td className="px-3 py-2 text-xs">{a.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}
