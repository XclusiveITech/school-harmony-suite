import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AcademicTerm, StudentAssignment, GeneratedInvoice, AuditEntry,
  academicTerms as seedTerms, initialAssignments, agingBuckets,
} from '@/lib/fees-structure-store';
import {
  listFeeStructures, createFeeStructure, updateFeeStructure, activateFeeStructure,
  newVersionFeeStructure, billStudentsForFeeStructure,
  type BackendFeeStructure, type BackendFeeItem, type FeeStructureStatus,
} from '@/lib/fees-api';
import { listGLAccounts, type BackendGLAccount, num } from '@/lib/finance-api';
import { listStudents, type BackendStudent } from '@/lib/students-api';
import ReportHeader from '@/components/ReportHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus, Printer, Check, X, Eye, Layers, Calendar, Users, Receipt,
  PlayCircle, History, FileSpreadsheet, AlertTriangle, Trash2, Copy, RefreshCw,
} from 'lucide-react';

type Tab = 'structures' | 'calendar' | 'assignments' | 'billing' | 'invoices' | 'aging' | 'audit';

export default function FeesStructure() {
  const [tab, setTab] = useState<Tab>('structures');
  const [structures, setStructures] = useState<BackendFeeStructure[]>([]);
  const [glAccounts, setGlAccounts] = useState<BackendGLAccount[]>([]);
  const [students, setStudents] = useState<BackendStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [terms, setTerms] = useState<AcademicTerm[]>(seedTerms);
  const [assignments, setAssignments] = useState<StudentAssignment[]>(initialAssignments);
  const [invoices, setInvoices] = useState<GeneratedInvoice[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  const log = (action: string, entity: string, entityId: string, details: string) =>
    setAudit(p => [{ id: String(Date.now()), timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16), actor: 'Current User', action, entity, entityId, details }, ...p]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fs, gl, studs] = await Promise.all([listFeeStructures(), listGLAccounts(), listStudents()]);
      setStructures(fs);
      setGlAccounts(gl);
      setStudents(studs);
    } catch (e: any) {
      setError(e?.message || 'Could not load fee structures from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
          <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm hover:bg-muted">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm hover:bg-muted">
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm flex items-center justify-between no-print">
          <span>{error}</span>
          <button onClick={load} className="underline font-medium">Retry</button>
        </div>
      )}

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

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading fee structures…</div>
      ) : (
        <>
          {tab === 'structures' && <StructuresTab structures={structures} glAccounts={glAccounts} reload={load} log={log} />}
          {tab === 'calendar' && <CalendarTab terms={terms} setTerms={setTerms} log={log} />}
          {tab === 'assignments' && <AssignmentsTab assignments={assignments} setAssignments={setAssignments} structures={structures} students={students} log={log} />}
          {tab === 'billing' && <BillingTab structures={structures} terms={terms} students={students} reload={load} log={log} />}
          {tab === 'invoices' && <InvoicesTab invoices={invoices} setInvoices={setInvoices} structures={structures} students={students} log={log} />}
          {tab === 'aging' && <AgingTab invoices={invoices} students={students} />}
          {tab === 'audit' && <AuditTab audit={audit} />}
        </>
      )}
    </div>
  );
}

const statusBadge = (status: FeeStructureStatus) =>
  status === 'Active' ? 'bg-success/10 text-success' :
  status === 'Draft' ? 'bg-muted text-muted-foreground' :
  'bg-destructive/10 text-destructive';

function structureTotal(s: BackendFeeStructure): number {
  return s.items.filter(i => i.mandatory).reduce((sum, i) => sum + num(i.amount), 0);
}
function structureFullTotal(s: BackendFeeStructure): number {
  return s.items.reduce((sum, i) => sum + num(i.amount), 0);
}

// ============== STRUCTURES TAB ==============
interface StructFormState {
  id?: number;
  name: string; level: string; class_name: string; term: string; year: string;
  currency: string; effective_from: string;
  items: { name: string; amount: number; gl_account: number; mandatory: boolean }[];
}

function emptyForm(glAccounts: BackendGLAccount[]): StructFormState {
  return {
    name: '', level: '', class_name: '', term: '', year: String(new Date().getFullYear()),
    currency: 'USD', effective_from: new Date().toISOString().split('T')[0],
    items: [],
  };
}

function StructuresTab({ structures, glAccounts, reload, log }: {
  structures: BackendFeeStructure[]; glAccounts: BackendGLAccount[];
  reload: () => Promise<void>; log: (a: string, e: string, id: string, d: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BackendFeeStructure | null>(null);
  const [viewing, setViewing] = useState<BackendFeeStructure | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const revenueAccounts = useMemo(
    () => glAccounts.filter(a => (a.type || '').toLowerCase() === 'revenue'),
    [glAccounts],
  );
  const accountOptions = revenueAccounts.length ? revenueAccounts : glAccounts;

  const handleActivate = async (s: BackendFeeStructure) => {
    setBusyId(s.id);
    try {
      await activateFeeStructure(s.id);
      toast.success(`${s.name} activated (previous active version archived)`);
      log('Activated', 'FeeStructure', String(s.id), `${s.name} v${s.version} activated`);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || 'Could not activate fee structure.');
    } finally {
      setBusyId(null);
    }
  };

  const handleNewVersion = async (s: BackendFeeStructure) => {
    setBusyId(s.id);
    try {
      const created = await newVersionFeeStructure(s.id);
      toast.success(`Created v${created.version} draft from ${s.name}`);
      log('Versioned', 'FeeStructure', String(created.id), `Created v${created.version} from ${s.name}`);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || 'Could not create a new version.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSave = async (form: StructFormState) => {
    setSaving(true);
    try {
      const payload = {
        name: form.name, level: form.level, class_name: form.class_name || null,
        term: form.term, year: form.year, currency: form.currency,
        effective_from: form.effective_from, items: form.items,
      };
      if (form.id) {
        await updateFeeStructure(form.id, payload);
        toast.success('Fee structure updated');
        log('Updated', 'FeeStructure', String(form.id), `${form.name}`);
      } else {
        const created = await createFeeStructure(payload);
        toast.success('Fee structure created');
        log('Created', 'FeeStructure', String(created.id), `${created.name}`);
      }
      setShowForm(false);
      setEditing(null);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the fee structure.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center no-print">
        <p className="text-sm text-muted-foreground">{structures.length} structures · {structures.filter(s => s.status === 'Active').length} active</p>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus size={16} /> New Structure
        </button>
      </div>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Level / Class</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Term</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Year</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Version</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Termly Total</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Status</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {structures.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No fee structures yet. Create one to get started.</td></tr>
              )}
              {structures.map(s => (
                <tr key={s.id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{s.level}{s.class_name ? ` / ${s.class_name}` : ''}</td>
                  <td className="px-3 py-2">{s.term}</td>
                  <td className="px-3 py-2 text-center">{s.year}</td>
                  <td className="px-3 py-2 text-center">v{s.version}</td>
                  <td className="px-3 py-2 text-right font-mono">{s.currency} {structureFullTotal(s).toLocaleString()}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(s.status)}`}>{s.status}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 justify-center">
                      <button onClick={() => setViewing(s)} className="text-primary hover:text-primary/80" title="View"><Eye size={14} /></button>
                      {s.status === 'Draft' && (
                        <button disabled={busyId === s.id} onClick={() => { setEditing(s); setShowForm(true); }} className="text-muted-foreground text-xs hover:underline">Edit</button>
                      )}
                      {s.status === 'Draft' && (
                        <button disabled={busyId === s.id} onClick={() => handleActivate(s)} className="text-success text-xs hover:underline">Activate</button>
                      )}
                      {s.status === 'Active' && (
                        <button disabled={busyId === s.id} onClick={() => handleNewVersion(s)} className="text-primary text-xs hover:underline" title="Create new version"><Copy size={14} /></button>
                      )}
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
          accountOptions={accountOptions}
          saving={saving}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}

      {viewing && <StructureView structure={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function StructureForm({ initial, accountOptions, saving, onClose, onSave }: {
  initial: BackendFeeStructure | null; accountOptions: BackendGLAccount[]; saving: boolean;
  onClose: () => void; onSave: (s: StructFormState) => void;
}) {
  const [form, setForm] = useState<StructFormState>(() => initial ? {
    id: initial.id, name: initial.name, level: initial.level, class_name: initial.class_name ?? '',
    term: initial.term, year: initial.year, currency: initial.currency, effective_from: initial.effective_from,
    items: initial.items.map(i => ({ name: i.name, amount: num(i.amount), gl_account: i.gl_account, mandatory: i.mandatory })),
  } : {
    name: '', level: '', class_name: '', term: '', year: String(new Date().getFullYear()),
    currency: 'USD', effective_from: new Date().toISOString().split('T')[0], items: [],
  });

  const updateItem = (idx: number, patch: Partial<StructFormState['items'][number]>) =>
    setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, ...patch } : it) }));
  const addItem = () =>
    setForm(f => ({ ...f, items: [...f.items, { name: '', amount: 0, gl_account: accountOptions[0]?.id ?? 0, mandatory: true }] }));
  const removeItem = (idx: number) =>
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const valid = form.name && form.level && form.term && form.year && form.items.length > 0 &&
    form.items.every(i => i.name && i.gl_account && i.amount > 0);

  const input = "w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-4xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{initial ? 'Edit Fee Structure' : 'New Fee Structure'}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2"><label className="text-xs text-muted-foreground">Structure Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={input} placeholder="e.g. Form 3 Boarding - 2026" /></div>
          <div><label className="text-xs text-muted-foreground">Academic Year</label><input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} className={input} /></div>
          <div><label className="text-xs text-muted-foreground">Level</label><input value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className={input} placeholder="e.g. Form 3" /></div>
          <div><label className="text-xs text-muted-foreground">Class (optional)</label><input value={form.class_name} onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))} className={input} placeholder="All classes in level" /></div>
          <div><label className="text-xs text-muted-foreground">Term</label><input value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))} className={input} placeholder="e.g. Term 1" /></div>
          <div><label className="text-xs text-muted-foreground">Currency</label><input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className={input} /></div>
          <div><label className="text-xs text-muted-foreground">Effective From</label><input type="date" value={form.effective_from} onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))} className={input} /></div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Fee Items (linked to GL revenue accounts)</h3>
            <button onClick={addItem} className="text-primary text-xs hover:underline">+ Add Item</button>
          </div>
          {form.items.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">No fee items yet</p>}
          {form.items.map((it, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 rounded-lg border border-border">
              <div className="col-span-4"><label className="text-[10px] text-muted-foreground">Item</label><input value={it.name} onChange={e => updateItem(i, { name: e.target.value })} className={input} placeholder="e.g. Tuition" /></div>
              <div className="col-span-4"><label className="text-[10px] text-muted-foreground">GL Account</label>
                <select value={it.gl_account} onChange={e => updateItem(i, { gl_account: Number(e.target.value) })} className={input}>
                  <option value={0}>Select...</option>
                  {accountOptions.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                </select>
              </div>
              <div className="col-span-2"><label className="text-[10px] text-muted-foreground">Amount</label><input type="number" value={it.amount || ''} onChange={e => updateItem(i, { amount: parseFloat(e.target.value) || 0 })} className={input} /></div>
              <div className="col-span-1 flex items-center gap-1">
                <label className="text-[10px] flex items-center gap-1"><input type="checkbox" checked={it.mandatory} onChange={e => updateItem(i, { mandatory: e.target.checked })} />Req</label>
              </div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => removeItem(i)} className="text-destructive"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          <div className="text-right text-sm font-semibold">Full Total: {form.currency} {form.items.reduce((s, i) => s + i.amount, 0).toLocaleString()}</div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-input text-sm">Cancel</button>
          <button disabled={!valid || saving} onClick={() => onSave(form)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save Draft'}</button>
        </div>
      </div>
    </div>
  );
}

function StructureView({ structure, onClose }: { structure: BackendFeeStructure; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 no-print">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Fee Schedule</h2>
          <div className="flex gap-2"><button onClick={() => window.print()} className="text-primary"><Printer size={18} /></button><button onClick={onClose}><X size={20} /></button></div>
        </div>
        <ReportHeader reportTitle={`Fee Schedule - ${structure.name}`} />
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p><span className="text-muted-foreground">Version:</span> v{structure.version}</p>
          <p><span className="text-muted-foreground">Year:</span> {structure.year}</p>
          <p><span className="text-muted-foreground">Term:</span> {structure.term}</p>
          <p><span className="text-muted-foreground">Level:</span> {structure.level}</p>
          <p><span className="text-muted-foreground">Status:</span> {structure.status}</p>
          <p><span className="text-muted-foreground">Effective:</span> {structure.effective_from}</p>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted"><th className="text-left px-3 py-2">Item</th><th className="text-left px-3 py-2">GL Account</th><th className="text-right px-3 py-2">Amount</th></tr></thead>
          <tbody>
            {structure.items.map((i, idx) => (
              <tr key={i.id ?? idx} className="border-b border-border">
                <td className="px-3 py-2">{i.name} {!i.mandatory && <span className="text-xs text-muted-foreground">(optional)</span>}</td>
                <td className="px-3 py-2 font-mono text-xs text-primary">{i.gl_account_code ?? i.gl_account}</td>
                <td className="px-3 py-2 text-right font-mono">{structure.currency} {num(i.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="font-semibold"><td colSpan={2} className="px-3 py-2">Total Mandatory</td><td className="px-3 py-2 text-right">{structure.currency} {structureTotal(structure).toLocaleString()}</td></tr></tfoot>
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
function AssignmentsTab({ assignments, setAssignments, structures, students, log }: {
  assignments: StudentAssignment[]; setAssignments: React.Dispatch<React.SetStateAction<StudentAssignment[]>>;
  structures: BackendFeeStructure[]; students: BackendStudent[];
  log: (a: string, e: string, id: string, d: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<StudentAssignment>>({});
  const input = "w-full px-3 py-2 rounded-lg border border-input bg-background text-sm";

  const activeStructures = structures.filter(s => s.status === 'Active');

  const autoSuggest = () => {
    const unassigned = students.filter(s => !assignments.some(a => a.studentId === String(s.id)));
    const created: StudentAssignment[] = [];
    unassigned.forEach(s => {
      const match = activeStructures.find(st => st.level === s.level);
      if (match) created.push({ id: `a-${Date.now()}-${s.id}`, studentId: String(s.id), structureId: String(match.id), assignedAt: new Date().toISOString().split('T')[0] });
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
                const st = students.find(s => String(s.id) === a.studentId);
                const fs = structures.find(s => String(s.id) === a.structureId);
                return (
                  <tr key={a.id} className="border-b border-border">
                    <td className="px-3 py-2">{st?.first_name} {st?.last_name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{st?.student_no}</td>
                    <td className="px-3 py-2">{st?.class_name}</td>
                    <td className="px-3 py-2">{fs?.name}</td>
                    <td className="px-3 py-2 text-right">{a.discountPercent ? `${a.discountPercent}%` : '-'}</td>
                    <td className="px-3 py-2 text-right">{a.scholarshipAmount ? `$${a.scholarshipAmount}` : '-'}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{a.notes ?? ''}</td>
                    <td className="px-3 py-2"><button onClick={() => { setAssignments(p => p.filter(x => x.id !== a.id)); log('Removed', 'Assignment', a.id, `Student ${st?.student_no}`); }} className="text-destructive"><Trash2 size={14} /></button></td>
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
                {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.class_name})</option>)}
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground">Fee Structure</label>
              <select value={form.structureId ?? ''} onChange={e => setForm(f => ({ ...f, structureId: e.target.value }))} className={input}>
                <option value="">Select...</option>
                {activeStructures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                const st = students.find(s => String(s.id) === a.studentId);
                const fs = structures.find(s => String(s.id) === a.structureId);
                log('Assigned', 'StudentAssignment', a.id, `${st?.student_no} → ${fs?.name}`);
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
function BillingTab({ structures, terms, students, reload, log }: {
  structures: BackendFeeStructure[]; terms: AcademicTerm[]; students: BackendStudent[];
  reload: () => Promise<void>; log: (a: string, e: string, id: string, d: string) => void;
}) {
  const [termId, setTermId] = useState(terms[0]?.id ?? '');
  const [structureId, setStructureId] = useState<number | ''>('');
  const [billing, setBilling] = useState(false);
  const [lastResult, setLastResult] = useState<{ structure: string; count: number } | null>(null);

  const activeStructures = structures.filter(s => s.status === 'Active');

  const runBilling = async () => {
    if (!structureId) {
      toast.error('Select an active fee structure to bill.');
      return;
    }
    setBilling(true);
    try {
      const { count } = await billStudentsForFeeStructure(Number(structureId));
      const fs = structures.find(s => s.id === structureId);
      setLastResult({ structure: fs?.name ?? String(structureId), count });
      toast.success(`Generated ${count} invoice(s), posted to AR & GL`);
      log('Auto-Posted', 'Invoice', String(structureId), `Billed ${count} students for ${fs?.name}`);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || 'Could not run the billing engine.');
    } finally {
      setBilling(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><PlayCircle size={18} /> Automated Billing Engine</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Select an active fee structure — the server will generate invoices for every matching student and post entries to Accounts Receivable & General Ledger.</p>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Term (reference)</label>
              <select value={termId} onChange={e => setTermId(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                {terms.map(t => <option key={t.id} value={t.id}>{t.name} (bills {t.billingDate})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Active Fee Structure</label>
              <select value={structureId} onChange={e => setStructureId(e.target.value ? Number(e.target.value) : '')} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">Select...</option>
                {activeStructures.map(s => <option key={s.id} value={s.id}>{s.name} ({s.level}{s.class_name ? `/${s.class_name}` : ''}, {s.term} {s.year})</option>)}
              </select>
            </div>
            <button disabled={billing} onClick={runBilling} className="px-4 py-2 rounded-lg bg-success text-success-foreground text-sm disabled:opacity-60">
              <Check size={14} className="inline mr-1" /> {billing ? 'Billing…' : 'Bill Students'}
            </button>
          </div>

          {lastResult && (
            <div className="border border-border rounded-lg p-3 text-sm bg-muted/30">
              Generated <strong>{lastResult.count}</strong> invoice(s) for <strong>{lastResult.structure}</strong>.
            </div>
          )}

          {activeStructures.length === 0 && (
            <p className="text-xs text-warning">No active fee structures yet — activate one from the Fee Structures tab first.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Integration Status</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[
            { l: 'General Ledger', v: 'Connected', g: 'Revenue GL accounts' },
            { l: 'Accounts Receivable', v: 'Connected', g: 'Invoices created server-side' },
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
function InvoicesTab({ invoices, setInvoices, structures, students, log }: {
  invoices: GeneratedInvoice[]; setInvoices: React.Dispatch<React.SetStateAction<GeneratedInvoice[]>>;
  structures: BackendFeeStructure[]; students: BackendStudent[];
  log: (a: string, e: string, id: string, d: string) => void;
}) {
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
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Invoices generated via the Billing Engine are created directly on the server — check the Invoices page for the live list and AR balances.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted"><th className="text-left px-3 py-2">Invoice #</th><th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Due</th><th className="text-left px-3 py-2">Student</th><th className="text-left px-3 py-2">Structure</th><th className="text-right px-3 py-2">Total</th><th className="text-center px-3 py-2">Status</th><th></th></tr></thead>
              <tbody>
                {invoices.map(i => { const st = students.find(s => String(s.id) === i.studentId); const fs = structures.find(s => String(s.id) === i.structureId); return (
                  <tr key={i.id} className="border-b border-border">
                    <td className="px-3 py-2 font-mono text-primary">{i.invoiceNumber}</td>
                    <td className="px-3 py-2">{i.date}</td>
                    <td className="px-3 py-2">{i.dueDate}</td>
                    <td className="px-3 py-2">{st?.first_name} {st?.last_name}</td>
                    <td className="px-3 py-2 text-xs">{fs?.name}</td>
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
              <p>Student: <strong>{students.find(s => String(s.id) === view.studentId)?.first_name} {students.find(s => String(s.id) === view.studentId)?.last_name}</strong></p>
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
function AgingTab({ invoices, students }: { invoices: GeneratedInvoice[]; students: BackendStudent[] }) {
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
                const studentInvs = invoices.filter(i => i.studentId === String(s.id) && i.status !== 'Paid' && i.status !== 'Cancelled');
                const b = agingBuckets(studentInvs);
                const total = b.current + b.b30 + b.b60 + b.b90 + b.over90;
                if (total === 0) return null;
                return (
                  <tr key={s.id} className="border-b border-border">
                    <td className="px-3 py-2">{s.first_name} {s.last_name}</td>
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
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No actions recorded yet this session.</p>
        ) : (
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
        )}
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
