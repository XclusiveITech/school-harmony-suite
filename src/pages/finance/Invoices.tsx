import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Printer, Eye, X, Check, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { listStudents, type BackendStudent } from '@/lib/students-api';
import {
  listInvoices, createInvoice, cancelInvoice, listGLAccounts, listReceipts,
  deriveBalances, num,
  type BackendInvoice, type BackendGLAccount, type DocStatus,
} from '@/lib/finance-api';

interface FormLine { description: string; gl_account_code: string; amount: number }

const emptyForm = () => ({
  date: new Date().toISOString().split('T')[0],
  studentId: '',
  currency: 'USD',
  lines: [{ description: '', gl_account_code: '', amount: 0 }] as FormLine[],
});

export default function Invoices() {
  const [invoices, setInvoices] = useState<BackendInvoice[]>([]);
  const [students, setStudents] = useState<BackendStudent[]>([]);
  const [accounts, setAccounts] = useState<BackendGLAccount[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<BackendInvoice | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [inv, studs, accs, recs] = await Promise.all([
        listInvoices(), listStudents(), listGLAccounts(), listReceipts(),
      ]);
      setInvoices(inv);
      setStudents(studs);
      setAccounts(accs);
      const map: Record<number, number> = {};
      for (const b of deriveBalances(inv, recs)) map[b.student] = num(b.balance);
      setBalances(map);
    } catch (e: any) {
      setError(e?.message || 'Could not load invoices from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const revenueAccounts = useMemo(
    () => accounts.filter(a => (a.type || '').toLowerCase() === 'revenue'),
    [accounts],
  );
  const accountOptions = revenueAccounts.length ? revenueAccounts : accounts;

  const studentLabel = (inv: BackendInvoice) => {
    if (inv.student_name) return inv.student_name;
    const s = students.find(st => st.id === inv.student);
    return s ? `${s.first_name} ${s.last_name}` : '-';
  };

  const addLine = () => setForm(p => ({ ...p, lines: [...p.lines, { description: '', gl_account_code: '', amount: 0 }] }));
  const removeLine = (i: number) => setForm(p => ({ ...p, lines: p.lines.filter((_, idx) => idx !== i) }));
  const updateLine = (i: number, field: keyof FormLine, value: string | number) => {
    setForm(p => ({ ...p, lines: p.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));
  };

  const handleSave = async (status: DocStatus) => {
    if (!form.studentId || form.lines.some(l => !l.description || !l.gl_account_code || l.amount <= 0)) {
      toast.error('Pick a student and complete every invoice line.');
      return;
    }
    setSaving(true);
    try {
      await createInvoice({
        date: form.date,
        student: Number(form.studentId),
        currency: form.currency,
        status,
        lines: form.lines,
      });
      toast.success(`Invoice saved as ${status.toLowerCase()}`);
      setForm(emptyForm());
      setShowCreate(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the invoice.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelInvoice(id);
      toast.success('Invoice cancelled');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not cancel the invoice.');
    }
  };

  const filtered = filterStatus ? invoices.filter(i => i.status === filterStatus) : invoices;
  const totalInvoiced = filtered.reduce((s, i) => s + num(i.total), 0);

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const selectClass = inputClass;
  const btnPrimary = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-60";
  const btnOutline = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground">Student fee invoicing & billing — saved to the database</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(true)} className={btnPrimary}><Plus size={18} /> Create Invoice</button>
          <button onClick={load} className={btnOutline}><RefreshCw size={16} /> Refresh</button>
          <button onClick={() => window.print()} className={btnOutline}><Printer size={18} /> Print</button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
          <option value="">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Processed">Processed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice #</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Currency</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Outstanding</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-3 font-mono text-primary">{inv.invoice_number}</td>
                    <td className="px-4 py-3">{inv.date}</td>
                    <td className="px-4 py-3">{studentLabel(inv)}</td>
                    <td className="px-4 py-3">{inv.currency}</td>
                    <td className="px-4 py-3 text-right font-mono">{num(inv.total).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">{(balances[inv.student] ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inv.status === 'Processed' ? 'bg-success/10 text-success' : inv.status === 'Draft' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>{inv.status}</span>
                    </td>
                    <td className="px-4 py-3 text-center flex gap-2 justify-center">
                      <button onClick={() => setViewInvoice(inv)} className="text-primary hover:text-primary/80"><Eye size={16} /></button>
                      {inv.status !== 'Cancelled' && <button onClick={() => handleCancel(inv.id)} className="text-destructive hover:text-destructive/80 text-xs">Cancel</button>}
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No invoices yet.</td></tr>
                )}
                {loading && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-muted font-semibold">
                  <td colSpan={4} className="px-4 py-3 text-foreground">Total Invoiced</td>
                  <td className="px-4 py-3 text-right font-mono">{totalInvoiced.toLocaleString()}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-lg font-bold text-foreground">Create Invoice</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Student</label>
                <select value={form.studentId} onChange={e => setForm(p => ({ ...p, studentId: e.target.value }))} className={selectClass}>
                  <option value="">Select student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_no})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Currency</label>
                <input value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))} className={inputClass} placeholder="USD" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Invoice Lines</h3>
                <button onClick={addLine} className="text-primary text-xs hover:underline">+ Add Line</button>
              </div>
              {form.lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <input value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Description" className={inputClass} />
                  </div>
                  <div className="col-span-3">
                    <select value={line.gl_account_code} onChange={e => updateLine(i, 'gl_account_code', e.target.value)} className={selectClass}>
                      <option value="">GL Account</option>
                      {accountOptions.map(a => <option key={a.id ?? a.code} value={a.code}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input type="number" min="0" step="0.01" value={line.amount || ''} onChange={e => updateLine(i, 'amount', parseFloat(e.target.value) || 0)} placeholder="Amount" className={inputClass} />
                  </div>
                  <div className="col-span-1">
                    {form.lines.length > 1 && <button onClick={() => removeLine(i)} className="text-destructive"><X size={16} /></button>}
                  </div>
                </div>
              ))}
              <div className="text-right font-bold text-foreground">Total: {form.lines.reduce((s, l) => s + l.amount, 0).toLocaleString()}</div>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className={btnOutline}>Close</button>
              <button disabled={saving} onClick={() => handleSave('Draft')} className={btnOutline}>Save as Draft</button>
              <button disabled={saving} onClick={() => handleSave('Processed')} className={btnPrimary}><Check size={18} /> Save & Process</button>
            </div>
          </div>
        </div>
      )}

      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">{viewInvoice.invoice_number}</h2>
              <button onClick={() => setViewInvoice(null)} className="text-muted-foreground"><X size={18} /></button>
            </div>
            <p className="text-sm text-muted-foreground">{studentLabel(viewInvoice)} · {viewInvoice.date}</p>
            <table className="w-full text-sm">
              <tbody>
                {(viewInvoice.lines || []).map((l, i) => (
                  <tr key={l.id ?? i} className="border-b border-border">
                    <td className="py-2">{l.description}</td>
                    <td className="py-2 text-muted-foreground">{l.gl_account_code}</td>
                    <td className="py-2 text-right font-mono">{num(l.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold"><td colSpan={2} className="py-2">Total</td><td className="py-2 text-right font-mono">{num(viewInvoice.total).toLocaleString()}</td></tr>
              </tfoot>
            </table>
            <div className="flex justify-end gap-2">
              <button onClick={() => window.print()} className={btnOutline}><Printer size={16} /> Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
