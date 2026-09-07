import React, { useEffect, useState } from 'react';
import { Plus, Printer, Eye, X, Check, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { listStudents, type BackendStudent } from '@/lib/students-api';
import {
  listReceipts, createReceipt, cancelReceipt, listInvoices, deriveBalances, num,
  type BackendReceipt, type DocStatus,
} from '@/lib/finance-api';

const paymentModes = ['Cash', 'Bank Transfer', 'EcoCash', 'Cheque', 'POS/Card'];

const emptyForm = () => ({
  date: new Date().toISOString().split('T')[0],
  studentId: '',
  amount: '',
  paymentMode: '',
  currency: 'USD',
  reference: '',
  description: '',
});

export default function Receipts() {
  const [receipts, setReceipts] = useState<BackendReceipt[]>([]);
  const [students, setStudents] = useState<BackendStudent[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [viewReceipt, setViewReceipt] = useState<BackendReceipt | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [recs, studs, invs] = await Promise.all([listReceipts(), listStudents(), listInvoices()]);
      setReceipts(recs);
      setStudents(studs);
      const map: Record<number, number> = {};
      for (const b of deriveBalances(invs, recs)) map[b.student] = num(b.balance);
      setBalances(map);
    } catch (e: any) {
      setError(e?.message || 'Could not load receipts from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const studentLabel = (rec: BackendReceipt) => {
    if (rec.student_name) return rec.student_name;
    const s = students.find(st => st.id === rec.student);
    return s ? `${s.first_name} ${s.last_name}` : '-';
  };

  const handleSave = async (status: DocStatus) => {
    if (!form.studentId || !form.amount || !form.paymentMode) {
      toast.error('Student, amount and payment mode are required.');
      return;
    }
    setSaving(true);
    try {
      await createReceipt({
        date: form.date,
        student: Number(form.studentId),
        amount: parseFloat(form.amount),
        payment_mode: form.paymentMode,
        currency: form.currency,
        reference: form.reference,
        description: form.description,
        status,
      });
      toast.success(`Payment saved as ${status.toLowerCase()}`);
      setForm(emptyForm());
      setShowCreate(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the payment.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelReceipt(id);
      toast.success('Receipt cancelled');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not cancel the receipt.');
    }
  };

  const filtered = filterStatus ? receipts.filter(r => r.status === filterStatus) : receipts;
  const totalReceived = filtered.filter(r => r.status === 'Processed').reduce((s, r) => s + num(r.amount), 0);

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const btnPrimary = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-60";
  const btnOutline = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Receipts</h1>
          <p className="text-sm text-muted-foreground">Fee payments received — saved to the database</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(true)} className={btnPrimary}><Plus size={18} /> Create Receipt</button>
          <button onClick={load} className={btnOutline}><RefreshCw size={16} /> Refresh</button>
          <button onClick={() => window.print()} className={btnOutline}><Printer size={18} /> Print</button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Receipt #</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mode</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Currency</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(rec => (
                  <tr key={rec.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-3 font-mono text-primary">{rec.receipt_number}</td>
                    <td className="px-4 py-3">{rec.date}</td>
                    <td className="px-4 py-3">{studentLabel(rec)}</td>
                    <td className="px-4 py-3">{rec.payment_mode}</td>
                    <td className="px-4 py-3">{rec.currency}</td>
                    <td className="px-4 py-3 text-right font-mono text-success">{num(rec.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">{(balances[rec.student] ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rec.status === 'Processed' ? 'bg-success/10 text-success' : rec.status === 'Draft' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>{rec.status}</span>
                    </td>
                    <td className="px-4 py-3 text-center flex gap-2 justify-center">
                      <button onClick={() => setViewReceipt(rec)} className="text-primary hover:text-primary/80"><Eye size={16} /></button>
                      {rec.status !== 'Cancelled' && <button onClick={() => handleCancel(rec.id)} className="text-destructive hover:text-destructive/80 text-xs">Cancel</button>}
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No receipts yet.</td></tr>
                )}
                {loading && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-muted font-semibold">
                  <td colSpan={5} className="px-4 py-3 text-foreground">Total Received</td>
                  <td className="px-4 py-3 text-right text-success font-mono">{totalReceived.toLocaleString()}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-lg font-bold text-foreground">Create Receipt</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Student</label>
                <select value={form.studentId} onChange={e => setForm(p => ({ ...p, studentId: e.target.value }))} className={inputClass}>
                  <option value="">Select student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_no})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Amount</label>
                <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className={inputClass} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Mode</label>
                <select value={form.paymentMode} onChange={e => setForm(p => ({ ...p, paymentMode: e.target.value }))} className={inputClass}>
                  <option value="">Select...</option>
                  {paymentModes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Currency</label>
                <input value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Reference</label>
                <input value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} className={inputClass} placeholder="INV-001" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className={btnOutline}>Close</button>
              <button disabled={saving} onClick={() => handleSave('Draft')} className={btnOutline}>Save as Draft</button>
              <button disabled={saving} onClick={() => handleSave('Processed')} className={btnPrimary}><Check size={18} /> Save & Process</button>
            </div>
          </div>
        </div>
      )}

      {viewReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">{viewReceipt.receipt_number}</h2>
              <button onClick={() => setViewReceipt(null)} className="text-muted-foreground"><X size={18} /></button>
            </div>
            <p className="text-sm text-muted-foreground">{studentLabel(viewReceipt)} · {viewReceipt.date}</p>
            <p className="text-2xl font-display font-bold text-success">{viewReceipt.currency} {num(viewReceipt.amount).toLocaleString()}</p>
            <p className="text-sm">{viewReceipt.payment_mode}{viewReceipt.reference ? ` · ${viewReceipt.reference}` : ''}</p>
            {viewReceipt.description && <p className="text-sm text-muted-foreground">{viewReceipt.description}</p>}
            <div className="flex justify-end">
              <button onClick={() => window.print()} className={btnOutline}><Printer size={16} /> Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
