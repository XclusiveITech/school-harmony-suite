import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { students } from '@/lib/dummy-data';
import { CheckCircle2, AlertTriangle, Search, Printer, Download, Link2, ArrowRightLeft, FileText, Clock } from 'lucide-react';

interface DebtorInvoice {
  id: string;
  studentId: string;
  date: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  paid: number;
  balance: number;
  dueDate: string;
  status: 'Outstanding' | 'Partially Paid' | 'Paid';
  matched: boolean;
  matchedWith?: string;
}

interface DebtorPayment {
  id: string;
  studentId: string;
  date: string;
  receiptNumber: string;
  description: string;
  amount: number;
  paymentMode: string;
  matched: boolean;
  matchedWith?: string;
}

// Dummy data
const debtorInvoices: DebtorInvoice[] = [
  { id: 'di1', studentId: '1', date: '2026-01-15', invoiceNumber: 'INV-2026-001', description: 'Term 1 Tuition Fees', amount: 1200, paid: 800, balance: 400, dueDate: '2026-02-15', status: 'Partially Paid', matched: false },
  { id: 'di2', studentId: '1', date: '2026-01-15', invoiceNumber: 'INV-2026-002', description: 'Term 1 Boarding Fees', amount: 800, paid: 800, balance: 0, dueDate: '2026-02-15', status: 'Paid', matched: true, matchedWith: 'dp2' },
  { id: 'di3', studentId: '2', date: '2026-01-15', invoiceNumber: 'INV-2026-003', description: 'Term 1 Tuition Fees', amount: 900, paid: 750, balance: 150, dueDate: '2026-02-15', status: 'Partially Paid', matched: false },
  { id: 'di4', studentId: '4', date: '2026-01-15', invoiceNumber: 'INV-2026-004', description: 'Term 1 Tuition Fees', amount: 1200, paid: 600, balance: 600, dueDate: '2026-02-15', status: 'Partially Paid', matched: false },
  { id: 'di5', studentId: '5', date: '2026-01-15', invoiceNumber: 'INV-2026-005', description: 'Term 1 Tuition + Boarding', amount: 2000, paid: 1750, balance: 250, dueDate: '2026-02-15', status: 'Partially Paid', matched: false },
  { id: 'di6', studentId: '6', date: '2026-01-15', invoiceNumber: 'INV-2026-006', description: 'Term 1 Tuition Fees', amount: 900, paid: 580, balance: 320, dueDate: '2026-02-15', status: 'Partially Paid', matched: false },
  { id: 'di7', studentId: '3', date: '2026-01-15', invoiceNumber: 'INV-2026-007', description: 'Term 1 Tuition + Boarding', amount: 2000, paid: 2000, balance: 0, dueDate: '2026-02-15', status: 'Paid', matched: true, matchedWith: 'dp5' },
];

const debtorPayments: DebtorPayment[] = [
  { id: 'dp1', studentId: '1', date: '2026-02-01', receiptNumber: 'REC-001', description: 'Tuition payment - bank transfer', amount: 800, paymentMode: 'Bank Transfer', matched: true, matchedWith: 'di1' },
  { id: 'dp2', studentId: '1', date: '2026-02-05', receiptNumber: 'REC-002', description: 'Boarding fees payment', amount: 800, paymentMode: 'Bank Transfer', matched: true, matchedWith: 'di2' },
  { id: 'dp3', studentId: '2', date: '2026-02-10', receiptNumber: 'REC-003', description: 'Tuition payment - EcoCash', amount: 750, paymentMode: 'EcoCash', matched: false },
  { id: 'dp4', studentId: '4', date: '2026-02-20', receiptNumber: 'REC-004', description: 'Partial tuition payment', amount: 600, paymentMode: 'Cash', matched: false },
  { id: 'dp5', studentId: '3', date: '2026-01-20', receiptNumber: 'REC-005', description: 'Full fees payment', amount: 2000, paymentMode: 'Bank Transfer', matched: true, matchedWith: 'di7' },
  { id: 'dp6', studentId: '5', date: '2026-03-01', receiptNumber: 'REC-006', description: 'Tuition & boarding - partial', amount: 1750, paymentMode: 'Bank Transfer', matched: false },
  { id: 'dp7', studentId: '6', date: '2026-02-28', receiptNumber: 'REC-007', description: 'Tuition payment - cash', amount: 580, paymentMode: 'Cash', matched: false },
];

export default function DebtorsReconciliation() {
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-03-31');
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyUnmatched, setShowOnlyUnmatched] = useState(false);
  const [invoices, setInvoices] = useState(debtorInvoices);
  const [payments, setPayments] = useState(debtorPayments);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  const levels = [...new Set(students.map(s => s.level))].sort();

  const filteredStudents = students.filter(s => {
    if (selectedLevel !== 'all' && s.level !== selectedLevel) return false;
    return true;
  });

  const filteredInvoices = invoices.filter(inv => {
    if (selectedStudent !== 'all' && inv.studentId !== selectedStudent) return false;
    if (selectedLevel !== 'all') {
      const st = students.find(s => s.id === inv.studentId);
      if (st && st.level !== selectedLevel) return false;
    }
    if (showOnlyUnmatched && inv.matched) return false;
    if (searchTerm && !inv.description.toLowerCase().includes(searchTerm.toLowerCase()) && !inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredPayments = payments.filter(p => {
    if (selectedStudent !== 'all' && p.studentId !== selectedStudent) return false;
    if (selectedLevel !== 'all') {
      const st = students.find(s => s.id === p.studentId);
      if (st && st.level !== selectedLevel) return false;
    }
    if (showOnlyUnmatched && p.matched) return false;
    if (searchTerm && !p.description.toLowerCase().includes(searchTerm.toLowerCase()) && !p.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const totalOwed = invoices.reduce((s, i) => s + i.balance, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  // Aging
  const aging = useMemo(() => {
    const today = new Date('2026-03-27');
    const b = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };
    invoices.filter(i => i.balance > 0).forEach(inv => {
      const days = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 0) b.current += inv.balance;
      else if (days <= 30) b.days30 += inv.balance;
      else if (days <= 60) b.days60 += inv.balance;
      else if (days <= 90) b.days90 += inv.balance;
      else b.over90 += inv.balance;
      b.total += inv.balance;
    });
    return b;
  }, [invoices]);

  const handleAutoMatch = () => {
    const newInv = [...invoices];
    const newPay = [...payments];
    for (let pi = 0; pi < newPay.length; pi++) {
      if (newPay[pi].matched) continue;
      for (let ii = 0; ii < newInv.length; ii++) {
        if (newInv[ii].matched || newInv[ii].studentId !== newPay[pi].studentId) continue;
        if (Math.abs(newPay[pi].amount - newInv[ii].paid) < 0.01 || Math.abs(newPay[pi].amount - newInv[ii].amount) < 0.01) {
          newInv[ii] = { ...newInv[ii], matched: true, matchedWith: newPay[pi].id };
          newPay[pi] = { ...newPay[pi], matched: true, matchedWith: newInv[ii].id };
          break;
        }
      }
    }
    setInvoices(newInv);
    setPayments(newPay);
  };

  const handleManualMatch = () => {
    if (!selectedInvoice || !selectedPayment) return;
    setInvoices(prev => prev.map(i => i.id === selectedInvoice ? { ...i, matched: true, matchedWith: selectedPayment } : i));
    setPayments(prev => prev.map(p => p.id === selectedPayment ? { ...p, matched: true, matchedWith: selectedInvoice } : p));
    setSelectedInvoice(null);
    setSelectedPayment(null);
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const selectClass = "px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const btnSuccess = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-success text-white font-medium text-sm hover:bg-success/90 transition-colors";
  const btnWarning = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-warning text-white font-medium text-sm hover:bg-warning/90 transition-colors";
  const btnOutline = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Debtors Reconciliation</h1>
          <p className="text-sm text-muted-foreground">Reconcile student fee invoices with payments received</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => window.print()} className={btnOutline}><Printer size={18} /> Print</button>
          <button className={btnOutline}><Download size={18} /> Export</button>
        </div>
      </div>

      <Tabs defaultValue="reconcile">
        <TabsList>
          <TabsTrigger value="reconcile">Reconciliation</TabsTrigger>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
          <TabsTrigger value="statement">Debtor Statement</TabsTrigger>
        </TabsList>

        <TabsContent value="reconcile" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-3 flex-wrap items-end">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Level</label>
                  <select value={selectedLevel} onChange={e => { setSelectedLevel(e.target.value); setSelectedStudent('all'); }} className={selectClass}>
                    <option value="all">All Levels</option>
                    {levels.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Student</label>
                  <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className={selectClass}>
                    <option value="all">All Students</option>
                    {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.regNumber})</option>)}
                  </select>
                </div>
                <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
                <button onClick={handleAutoMatch} className={btnSuccess}><Link2 size={16} /> Auto-Match</button>
                {selectedInvoice && selectedPayment && (
                  <button onClick={handleManualMatch} className={btnWarning}><ArrowRightLeft size={16} /> Match Selected</button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Card className="light-card-blue"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Invoiced</p><p className="text-lg font-bold font-display">${fmt(invoices.reduce((s, i) => s + i.amount, 0))}</p></CardContent></Card>
            <Card className="light-card-green"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Collected</p><p className="text-lg font-bold font-display">${fmt(totalPaid)}</p></CardContent></Card>
            <Card className="light-card-red"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Outstanding</p><p className="text-lg font-bold font-display">${fmt(totalOwed)}</p></CardContent></Card>
            <Card className="light-card-orange"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Unmatched Invoices</p><p className="text-lg font-bold font-display">{invoices.filter(i => !i.matched && i.balance > 0).length}</p></CardContent></Card>
            <Card className="light-card-purple"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Collection Rate</p><p className="text-lg font-bold font-display">{((totalPaid / invoices.reduce((s, i) => s + i.amount, 0)) * 100).toFixed(1)}%</p></CardContent></Card>
          </div>

          {/* Search */}
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search invoices & receipts..." className={`${inputClass} pl-9`} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={showOnlyUnmatched} onChange={e => setShowOnlyUnmatched(e.target.checked)} className="rounded" />
              Unmatched only
            </label>
          </div>

          {/* Side by Side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText size={18} className="text-destructive" /> Fee Invoices</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="border-b border-border">
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Invoice #</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Student</th>
                        <th className="text-right px-2 py-2 font-medium text-muted-foreground">Amount</th>
                        <th className="text-right px-2 py-2 font-medium text-muted-foreground">Balance</th>
                        <th className="text-center px-2 py-2 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map(inv => {
                        const st = students.find(s => s.id === inv.studentId);
                        return (
                          <tr key={inv.id} onClick={() => !inv.matched && setSelectedInvoice(inv.id === selectedInvoice ? null : inv.id)}
                            className={`border-b border-border cursor-pointer transition-colors ${inv.matched ? 'bg-success/5' : selectedInvoice === inv.id ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'}`}>
                            <td className="px-2 py-2">{inv.date}</td>
                            <td className="px-2 py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                            <td className="px-2 py-2">{st?.firstName} {st?.lastName}</td>
                            <td className="px-2 py-2 text-right">${fmt(inv.amount)}</td>
                            <td className="px-2 py-2 text-right font-medium">${fmt(inv.balance)}</td>
                            <td className="px-2 py-2 text-center">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === 'Paid' ? 'bg-success/10 text-success' : inv.status === 'Partially Paid' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>{inv.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText size={18} className="text-success" /> Payments Received</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="border-b border-border">
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Receipt #</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Student</th>
                        <th className="text-right px-2 py-2 font-medium text-muted-foreground">Amount</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Mode</th>
                        <th className="text-center px-2 py-2 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map(p => {
                        const st = students.find(s => s.id === p.studentId);
                        return (
                          <tr key={p.id} onClick={() => !p.matched && setSelectedPayment(p.id === selectedPayment ? null : p.id)}
                            className={`border-b border-border cursor-pointer transition-colors ${p.matched ? 'bg-success/5' : selectedPayment === p.id ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'}`}>
                            <td className="px-2 py-2">{p.date}</td>
                            <td className="px-2 py-2 font-mono text-xs">{p.receiptNumber}</td>
                            <td className="px-2 py-2">{st?.firstName} {st?.lastName}</td>
                            <td className="px-2 py-2 text-right">${fmt(p.amount)}</td>
                            <td className="px-2 py-2">{p.paymentMode}</td>
                            <td className="px-2 py-2 text-center">
                              {p.matched ? <span className="text-xs text-success flex items-center justify-center gap-1"><CheckCircle2 size={14} /> Matched</span>
                                : <span className="text-xs text-warning flex items-center justify-center gap-1"><AlertTriangle size={14} /> Unmatched</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AGING TAB */}
        <TabsContent value="aging" className="space-y-4">
          <div className="print-area">
            <ReportHeader reportTitle="Debtors Aging Report" subtitle={`As at ${dateTo}`} />
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
                  {[
                    { label: 'Current', value: aging.current, color: 'light-card-green' },
                    { label: '1-30 Days', value: aging.days30, color: 'light-card-blue' },
                    { label: '31-60 Days', value: aging.days60, color: 'light-card-orange' },
                    { label: '61-90 Days', value: aging.days90, color: 'light-card-red' },
                    { label: '90+ Days', value: aging.over90, color: 'light-card-red' },
                    { label: 'Total', value: aging.total, color: 'light-card-purple' },
                  ].map(b => (
                    <Card key={b.label} className={b.color}><CardContent className="pt-3 pb-2 text-center"><p className="text-xs text-muted-foreground">{b.label}</p><p className="text-lg font-bold font-display">${fmt(b.value)}</p></CardContent></Card>
                  ))}
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Student</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Level</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Current</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">1-30</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">31-60</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">61-90</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">90+</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(st => {
                      const stInvs = invoices.filter(i => i.studentId === st.id && i.balance > 0);
                      if (stInvs.length === 0) return null;
                      const today = new Date('2026-03-27');
                      const b = { current: 0, d30: 0, d60: 0, d90: 0, over: 0, total: 0 };
                      stInvs.forEach(inv => {
                        const days = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                        if (days <= 0) b.current += inv.balance;
                        else if (days <= 30) b.d30 += inv.balance;
                        else if (days <= 60) b.d60 += inv.balance;
                        else if (days <= 90) b.d90 += inv.balance;
                        else b.over += inv.balance;
                        b.total += inv.balance;
                      });
                      return (
                        <tr key={st.id} className="border-b border-border hover:bg-muted/50">
                          <td className="px-3 py-2 font-medium">{st.firstName} {st.lastName}</td>
                          <td className="px-3 py-2">{st.level}</td>
                          <td className="px-3 py-2 text-right">{b.current > 0 ? `$${fmt(b.current)}` : '-'}</td>
                          <td className="px-3 py-2 text-right">{b.d30 > 0 ? `$${fmt(b.d30)}` : '-'}</td>
                          <td className="px-3 py-2 text-right">{b.d60 > 0 ? `$${fmt(b.d60)}` : '-'}</td>
                          <td className="px-3 py-2 text-right">{b.d90 > 0 ? `$${fmt(b.d90)}` : '-'}</td>
                          <td className="px-3 py-2 text-right">{b.over > 0 ? `$${fmt(b.over)}` : '-'}</td>
                          <td className="px-3 py-2 text-right font-bold">${fmt(b.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-primary bg-muted font-bold">
                      <td className="px-3 py-2" colSpan={2}>TOTAL</td>
                      <td className="px-3 py-2 text-right">${fmt(aging.current)}</td>
                      <td className="px-3 py-2 text-right">${fmt(aging.days30)}</td>
                      <td className="px-3 py-2 text-right">${fmt(aging.days60)}</td>
                      <td className="px-3 py-2 text-right">${fmt(aging.days90)}</td>
                      <td className="px-3 py-2 text-right">${fmt(aging.over90)}</td>
                      <td className="px-3 py-2 text-right">${fmt(aging.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* STATEMENT TAB */}
        <TabsContent value="statement" className="space-y-4">
          <div className="print-area">
            <ReportHeader reportTitle="Debtor Statement" subtitle={selectedStudent !== 'all' ? (() => { const s = students.find(st => st.id === selectedStudent); return s ? `${s.firstName} ${s.lastName} (${s.regNumber})` : ''; })() : 'All Students'} />
            <Card>
              <CardContent className="pt-4">
                <div className="mb-4 flex gap-3 print:hidden">
                  <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className={selectClass}>
                    <option value="all">All Students</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.regNumber})</option>)}
                  </select>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Reference</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Charges</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Payments</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const sId = selectedStudent;
                      const items: { date: string; ref: string; desc: string; charge: number; payment: number; student: string }[] = [];
                      invoices.filter(i => sId === 'all' || i.studentId === sId).forEach(i => {
                        const st = students.find(s => s.id === i.studentId);
                        items.push({ date: i.date, ref: i.invoiceNumber, desc: `${st?.firstName} ${st?.lastName} - ${i.description}`, charge: i.amount, payment: 0, student: i.studentId });
                      });
                      payments.filter(p => sId === 'all' || p.studentId === sId).forEach(p => {
                        const st = students.find(s => s.id === p.studentId);
                        items.push({ date: p.date, ref: p.receiptNumber, desc: `${st?.firstName} ${st?.lastName} - ${p.description}`, charge: 0, payment: p.amount, student: p.studentId });
                      });
                      items.sort((a, b) => a.date.localeCompare(b.date));
                      let running = 0;
                      return items.map((item, idx) => {
                        running += item.charge - item.payment;
                        return (
                          <tr key={idx} className="border-b border-border hover:bg-muted/50">
                            <td className="px-3 py-2">{item.date}</td>
                            <td className="px-3 py-2 font-mono text-xs">{item.ref}</td>
                            <td className="px-3 py-2">{item.desc}</td>
                            <td className="px-3 py-2 text-right">{item.charge > 0 ? `$${fmt(item.charge)}` : ''}</td>
                            <td className="px-3 py-2 text-right">{item.payment > 0 ? `$${fmt(item.payment)}` : ''}</td>
                            <td className="px-3 py-2 text-right font-medium">${fmt(running)}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
