import React, { useState } from 'react';
import { students, glAccounts } from '@/lib/dummy-data';
import { Plus, Printer, Eye, X, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InvoiceLine {
  description: string;
  glAccountCode: string;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  studentId: string;
  lines: InvoiceLine[];
  total: number;
  status: 'Draft' | 'Processed' | 'Cancelled';
  currency: string;
}

const revenueAccounts = glAccounts.filter(a => a.type === 'Revenue');

const dummyInvoices: Invoice[] = [
  { id: '1', invoiceNumber: 'INV-001', date: '2026-01-15', studentId: '1', lines: [{ description: 'Tuition Fees - Term 1', glAccountCode: '4000', amount: 1200 }], total: 1200, status: 'Processed', currency: 'USD' },
  { id: '2', invoiceNumber: 'INV-002', date: '2026-01-15', studentId: '2', lines: [{ description: 'Tuition Fees - Term 1', glAccountCode: '4000', amount: 900 }], total: 900, status: 'Processed', currency: 'USD' },
  { id: '3', invoiceNumber: 'INV-003', date: '2026-01-15', studentId: '3', lines: [{ description: 'Tuition Fees - Term 1', glAccountCode: '4000', amount: 1200 }, { description: 'Boarding Fees - Term 1', glAccountCode: '4100', amount: 500 }], total: 1700, status: 'Processed', currency: 'USD' },
  { id: '4', invoiceNumber: 'INV-004', date: '2026-01-15', studentId: '4', lines: [{ description: 'Tuition Fees - Term 1', glAccountCode: '4000', amount: 900 }], total: 900, status: 'Draft', currency: 'USD' },
];

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>(dummyInvoices);
  const [showCreate, setShowCreate] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [filterStatus, setFilterStatus] = useState('');

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    studentId: '',
    currency: 'USD',
    lines: [{ description: '', glAccountCode: '', amount: 0 }] as InvoiceLine[],
  });

  const addLine = () => setForm(p => ({ ...p, lines: [...p.lines, { description: '', glAccountCode: '', amount: 0 }] }));
  const removeLine = (i: number) => setForm(p => ({ ...p, lines: p.lines.filter((_, idx) => idx !== i) }));
  const updateLine = (i: number, field: keyof InvoiceLine, value: string | number) => {
    setForm(p => ({ ...p, lines: p.lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l) }));
  };

  const handleSave = (status: 'Draft' | 'Processed') => {
    if (!form.studentId || form.lines.some(l => !l.description || !l.glAccountCode || l.amount <= 0)) return;
    const total = form.lines.reduce((s, l) => s + l.amount, 0);
    const inv: Invoice = {
      id: String(Date.now()),
      invoiceNumber: `INV-${String(invoices.length + 1).padStart(3, '0')}`,
      date: form.date,
      studentId: form.studentId,
      lines: form.lines,
      total,
      status,
      currency: form.currency,
    };
    setInvoices(prev => [...prev, inv]);
    setForm({ date: new Date().toISOString().split('T')[0], studentId: '', currency: 'USD', lines: [{ description: '', glAccountCode: '', amount: 0 }] });
    setShowCreate(false);
  };

  const handleCancel = (id: string) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'Cancelled' } : inv));
  };

  const filtered = filterStatus ? invoices.filter(i => i.status === filterStatus) : invoices;

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const selectClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const btnPrimary = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors";
  const btnOutline = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground">Student fee invoicing & billing</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(true)} className={btnPrimary}><Plus size={18} /> Create Invoice</button>
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice #</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Currency</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const student = students.find(s => s.id === inv.studentId);
                  return (
                    <tr key={inv.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-3 font-mono text-primary">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3">{inv.date}</td>
                      <td className="px-4 py-3">{student ? `${student.firstName} ${student.lastName}` : '-'}</td>
                      <td className="px-4 py-3">{inv.currency}</td>
                      <td className="px-4 py-3 text-right font-mono">${inv.total.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inv.status === 'Processed' ? 'bg-success/10 text-success' : inv.status === 'Draft' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>{inv.status}</span>
                      </td>
                      <td className="px-4 py-3 text-center flex gap-2 justify-center">
                        <button onClick={() => setViewInvoice(inv)} className="text-primary hover:text-primary/80"><Eye size={16} /></button>
                        {inv.status !== 'Cancelled' && <button onClick={() => handleCancel(inv.id)} className="text-destructive hover:text-destructive/80 text-xs">Cancel</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Invoice Modal */}
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
                  {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.regNumber})</option>)}
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
                    <select value={line.glAccountCode} onChange={e => updateLine(i, 'glAccountCode', e.target.value)} className={selectClass}>
                      <option value="">GL Account</option>
                      {revenueAccounts.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
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
              <div className="text-right font-bold text-foreground">Total: ${form.lines.reduce((s, l) => s + l.amount, 0).toLocaleString()}</div>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className={btnOutline}>Cancel</button>
              <button onClick={() => handleSave('Draft')} className={btnOutline}>Save as Draft</button>
              <button onClick={() => handleSave('Processed')} className={btnPrimary}><Check size={16} /> Process Invoice</button>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">Invoice {viewInvoice.invoiceNumber}</h2>
              <button onClick={() => setViewInvoice(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p>Date: {viewInvoice.date}</p>
              <p>Student: {(() => { const s = students.find(s => s.id === viewInvoice.studentId); return s ? `${s.firstName} ${s.lastName} (${s.regNumber})` : '-'; })()}</p>
              <p>Status: <span className={`font-medium ${viewInvoice.status === 'Processed' ? 'text-success' : viewInvoice.status === 'Draft' ? 'text-warning' : 'text-destructive'}`}>{viewInvoice.status}</span></p>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border"><th className="text-left py-2">Description</th><th className="text-left py-2">GL Account</th><th className="text-right py-2">Amount</th></tr></thead>
              <tbody>
                {viewInvoice.lines.map((l, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="py-2">{l.description}</td>
                    <td className="py-2 font-mono text-xs text-primary">{l.glAccountCode}</td>
                    <td className="py-2 text-right font-mono">${l.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right font-bold text-lg text-foreground">Total: {viewInvoice.currency} ${viewInvoice.total.toLocaleString()}</div>
            <div className="flex justify-end">
              <button onClick={() => { setViewInvoice(null); window.print(); }} className={btnOutline}><Printer size={16} /> Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
