import React, { useState } from 'react';
import { students } from '@/lib/dummy-data';
import { Plus, Printer, Eye, X, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Receipt {
  id: string;
  receiptNumber: string;
  date: string;
  studentId: string;
  amount: number;
  paymentMode: string;
  currency: string;
  reference: string;
  description: string;
  status: 'Draft' | 'Processed' | 'Cancelled';
}

const paymentModes = ['Cash', 'Bank Transfer', 'EcoCash', 'Cheque', 'POS/Card'];

const dummyReceipts: Receipt[] = [
  { id: '1', receiptNumber: 'REC-001', date: '2026-02-01', studentId: '1', amount: 800, paymentMode: 'Cash', currency: 'USD', reference: 'INV-001', description: 'Tuition payment', status: 'Processed' },
  { id: '2', receiptNumber: 'REC-002', date: '2026-02-10', studentId: '2', amount: 750, paymentMode: 'EcoCash', currency: 'USD', reference: 'INV-002', description: 'Tuition payment', status: 'Processed' },
  { id: '3', receiptNumber: 'REC-003', date: '2026-02-05', studentId: '3', amount: 1700, paymentMode: 'Bank Transfer', currency: 'USD', reference: 'INV-003', description: 'Tuition & boarding payment', status: 'Processed' },
  { id: '4', receiptNumber: 'REC-004', date: '2026-03-01', studentId: '1', amount: 500, paymentMode: 'Bank Transfer', currency: 'USD', reference: 'INV-005', description: 'Boarding fees payment', status: 'Processed' },
];

export default function Receipts() {
  const [receipts, setReceipts] = useState<Receipt[]>(dummyReceipts);
  const [showCreate, setShowCreate] = useState(false);
  const [viewReceipt, setViewReceipt] = useState<Receipt | null>(null);
  const [filterStatus, setFilterStatus] = useState('');

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    studentId: '',
    amount: '',
    paymentMode: '',
    currency: 'USD',
    reference: '',
    description: '',
  });

  const handleSave = (status: 'Draft' | 'Processed') => {
    if (!form.studentId || !form.amount || !form.paymentMode) return;
    const rec: Receipt = {
      id: String(Date.now()),
      receiptNumber: `REC-${String(receipts.length + 1).padStart(3, '0')}`,
      date: form.date,
      studentId: form.studentId,
      amount: parseFloat(form.amount),
      paymentMode: form.paymentMode,
      currency: form.currency,
      reference: form.reference,
      description: form.description,
      status,
    };
    setReceipts(prev => [...prev, rec]);
    setForm({ date: new Date().toISOString().split('T')[0], studentId: '', amount: '', paymentMode: '', currency: 'USD', reference: '', description: '' });
    setShowCreate(false);
  };

  const handleCancel = (id: string) => {
    setReceipts(prev => prev.map(r => r.id === id ? { ...r, status: 'Cancelled' } : r));
  };

  const filtered = filterStatus ? receipts.filter(r => r.status === filterStatus) : receipts;

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const selectClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const btnPrimary = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors";
  const btnOutline = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Receipts</h1>
          <p className="text-sm text-muted-foreground">Record and manage fee payments received</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(true)} className={btnPrimary}><Plus size={18} /> Create Receipt</button>
          <button onClick={() => window.print()} className={btnOutline}><Printer size={18} /> Print</button>
        </div>
      </div>

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
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(rec => {
                  const student = students.find(s => s.id === rec.studentId);
                  return (
                    <tr key={rec.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-3 font-mono text-primary">{rec.receiptNumber}</td>
                      <td className="px-4 py-3">{rec.date}</td>
                      <td className="px-4 py-3">{student ? `${student.firstName} ${student.lastName}` : '-'}</td>
                      <td className="px-4 py-3">{rec.paymentMode}</td>
                      <td className="px-4 py-3">{rec.currency}</td>
                      <td className="px-4 py-3 text-right font-mono text-success">${rec.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rec.status === 'Processed' ? 'bg-success/10 text-success' : rec.status === 'Draft' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>{rec.status}</span>
                      </td>
                      <td className="px-4 py-3 text-center flex gap-2 justify-center">
                        <button onClick={() => setViewReceipt(rec)} className="text-primary hover:text-primary/80"><Eye size={16} /></button>
                        {rec.status !== 'Cancelled' && <button onClick={() => handleCancel(rec.id)} className="text-destructive hover:text-destructive/80 text-xs">Cancel</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted font-semibold">
                  <td colSpan={5} className="px-4 py-3 text-foreground">Total Received</td>
                  <td className="px-4 py-3 text-right text-success font-mono">${filtered.filter(r => r.status === 'Processed').reduce((s, r) => s + r.amount, 0).toLocaleString()}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Receipt Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-foreground">Create Receipt</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Student</label>
                <select value={form.studentId} onChange={e => setForm(p => ({ ...p, studentId: e.target.value }))} className={selectClass}>
                  <option value="">Select student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.regNumber})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Amount</label>
                <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className={inputClass} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Mode</label>
                <select value={form.paymentMode} onChange={e => setForm(p => ({ ...p, paymentMode: e.target.value }))} className={selectClass}>
                  <option value="">Select...</option>
                  {paymentModes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Currency</label>
                <input value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))} className={inputClass} placeholder="USD" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Reference (Invoice #)</label>
                <input value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} className={inputClass} placeholder="INV-001" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inputClass} placeholder="Payment description" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className={btnOutline}>Cancel</button>
              <button onClick={() => handleSave('Draft')} className={btnOutline}>Save Draft</button>
              <button onClick={() => handleSave('Processed')} className={btnPrimary}><Check size={16} /> Process Receipt</button>
            </div>
          </div>
        </div>
      )}

      {/* View Receipt Modal */}
      {viewReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">Receipt {viewReceipt.receiptNumber}</h2>
              <button onClick={() => setViewReceipt(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="border-2 border-primary rounded-lg p-4 space-y-3">
              <div className="text-center border-b border-border pb-3">
                <h3 className="font-display font-bold text-lg text-foreground">BRAINSTAR SCHOOL</h3>
                <p className="text-xs text-muted-foreground">Official Receipt</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Receipt #:</span> <span className="font-mono text-primary">{viewReceipt.receiptNumber}</span></div>
                <div><span className="text-muted-foreground">Date:</span> {viewReceipt.date}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Student:</span> {(() => { const s = students.find(s => s.id === viewReceipt.studentId); return s ? `${s.firstName} ${s.lastName} (${s.regNumber})` : '-'; })()}</div>
                <div><span className="text-muted-foreground">Mode:</span> {viewReceipt.paymentMode}</div>
                <div><span className="text-muted-foreground">Reference:</span> {viewReceipt.reference}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Description:</span> {viewReceipt.description}</div>
              </div>
              <div className="border-t-2 border-primary pt-3 text-center">
                <p className="text-2xl font-display font-bold text-success">{viewReceipt.currency} ${viewReceipt.amount.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => { setViewReceipt(null); window.print(); }} className={btnOutline}><Printer size={16} /> Print Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
