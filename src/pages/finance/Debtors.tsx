import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { students } from '@/lib/dummy-data';
import {
  Search, Printer, Download, Eye, Check, FileText, Clock, AlertTriangle, Plus
} from 'lucide-react';

interface FeeStructure {
  id: string;
  level: string;
  boardingStatus: 'Boarding' | 'Day' | 'All';
  description: string;
  amount: number;
  term: string;
}

interface StudentInvoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  date: string;
  dueDate: string;
  description: string;
  amount: number;
  paid: number;
  balance: number;
  term: string;
  status: 'Outstanding' | 'Partially Paid' | 'Paid';
}

interface StudentPayment {
  id: string;
  studentId: string;
  invoiceId: string;
  receiptNumber: string;
  date: string;
  amount: number;
  paymentMode: string;
  currency: string;
  description: string;
  status: 'Processed';
}

const feeStructures: FeeStructure[] = [
  { id: 'f1', level: 'Form 1', boardingStatus: 'Day', description: 'Tuition Fees', amount: 900, term: 'Term 1 2026' },
  { id: 'f2', level: 'Form 1', boardingStatus: 'Boarding', description: 'Tuition + Boarding', amount: 1800, term: 'Term 1 2026' },
  { id: 'f3', level: 'Form 2', boardingStatus: 'Day', description: 'Tuition Fees', amount: 900, term: 'Term 1 2026' },
  { id: 'f4', level: 'Form 2', boardingStatus: 'Boarding', description: 'Tuition + Boarding', amount: 1800, term: 'Term 1 2026' },
  { id: 'f5', level: 'Form 3', boardingStatus: 'Day', description: 'Tuition Fees', amount: 1200, term: 'Term 1 2026' },
  { id: 'f6', level: 'Form 3', boardingStatus: 'Boarding', description: 'Tuition + Boarding', amount: 2000, term: 'Term 1 2026' },
  { id: 'f7', level: 'Form 4', boardingStatus: 'Day', description: 'Tuition Fees', amount: 1200, term: 'Term 1 2026' },
  { id: 'f8', level: 'Form 4', boardingStatus: 'Boarding', description: 'Tuition + Boarding', amount: 2000, term: 'Term 1 2026' },
];

const initialInvoices: StudentInvoice[] = [
  { id: 'di1', invoiceNumber: 'INV-2026-001', studentId: '1', date: '2026-01-15', dueDate: '2026-02-15', description: 'Term 1 Tuition + Boarding', amount: 2000, paid: 1600, balance: 400, term: 'Term 1 2026', status: 'Partially Paid' },
  { id: 'di2', invoiceNumber: 'INV-2026-002', studentId: '2', date: '2026-01-15', dueDate: '2026-02-15', description: 'Term 1 Tuition Fees', amount: 900, paid: 750, balance: 150, term: 'Term 1 2026', status: 'Partially Paid' },
  { id: 'di3', invoiceNumber: 'INV-2026-003', studentId: '3', date: '2026-01-15', dueDate: '2026-02-15', description: 'Term 1 Tuition + Boarding', amount: 2000, paid: 2000, balance: 0, term: 'Term 1 2026', status: 'Paid' },
  { id: 'di4', invoiceNumber: 'INV-2026-004', studentId: '4', date: '2026-01-15', dueDate: '2026-02-15', description: 'Term 1 Tuition Fees', amount: 900, paid: 300, balance: 600, term: 'Term 1 2026', status: 'Partially Paid' },
  { id: 'di5', invoiceNumber: 'INV-2026-005', studentId: '5', date: '2026-01-15', dueDate: '2026-02-15', description: 'Term 1 Tuition + Boarding', amount: 2000, paid: 1750, balance: 250, term: 'Term 1 2026', status: 'Partially Paid' },
  { id: 'di6', invoiceNumber: 'INV-2026-006', studentId: '6', date: '2026-01-15', dueDate: '2026-02-15', description: 'Term 1 Tuition Fees', amount: 900, paid: 580, balance: 320, term: 'Term 1 2026', status: 'Partially Paid' },
];

const initialPayments: StudentPayment[] = [
  { id: 'dp1', studentId: '1', invoiceId: 'di1', receiptNumber: 'REC-001', date: '2026-02-01', amount: 800, paymentMode: 'Bank Transfer', currency: 'USD', description: 'Tuition payment', status: 'Processed' },
  { id: 'dp2', studentId: '1', invoiceId: 'di1', receiptNumber: 'REC-002', date: '2026-02-05', amount: 800, paymentMode: 'Bank Transfer', currency: 'USD', description: 'Boarding fees payment', status: 'Processed' },
  { id: 'dp3', studentId: '2', invoiceId: 'di2', receiptNumber: 'REC-003', date: '2026-02-10', amount: 750, paymentMode: 'EcoCash', currency: 'USD', description: 'Tuition payment', status: 'Processed' },
  { id: 'dp4', studentId: '3', invoiceId: 'di3', receiptNumber: 'REC-005', date: '2026-01-20', amount: 2000, paymentMode: 'Bank Transfer', currency: 'USD', description: 'Full fees payment', status: 'Processed' },
  { id: 'dp5', studentId: '4', invoiceId: 'di4', receiptNumber: 'REC-004', date: '2026-02-20', amount: 300, paymentMode: 'Cash', currency: 'USD', description: 'Partial tuition', status: 'Processed' },
  { id: 'dp6', studentId: '5', invoiceId: 'di5', receiptNumber: 'REC-006', date: '2026-03-01', amount: 1750, paymentMode: 'Bank Transfer', currency: 'USD', description: 'Tuition & boarding', status: 'Processed' },
  { id: 'dp7', studentId: '6', invoiceId: 'di6', receiptNumber: 'REC-007', date: '2026-02-28', amount: 580, paymentMode: 'Cash', currency: 'USD', description: 'Tuition payment', status: 'Processed' },
];

export default function Debtors() {
  const [invoices] = useState(initialInvoices);
  const [pmts] = useState(initialPayments);
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-03-31');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [viewStatement, setViewStatement] = useState<string | null>(null);

  const levels = [...new Set(students.map(s => s.level))].sort();
  const filteredStudents = students.filter(s => selectedLevel === 'all' || s.level === selectedLevel);

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.paid, 0);
  const totalOutstanding = invoices.reduce((s, i) => s + i.balance, 0);
  const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

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

  // Filtered invoices
  const filteredInvoices = invoices.filter(inv => {
    if (selectedStudent !== 'all' && inv.studentId !== selectedStudent) return false;
    if (selectedLevel !== 'all') {
      const st = students.find(s => s.id === inv.studentId);
      if (st && st.level !== selectedLevel) return false;
    }
    if (searchTerm && !inv.description.toLowerCase().includes(searchTerm.toLowerCase()) && !inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Statement data
  const getStatementData = (studentId: string) => {
    const stInvoices = invoices.filter(i => i.studentId === studentId);
    const stPayments = pmts.filter(p => p.studentId === studentId);
    const all = [
      ...stInvoices.map(i => ({ date: i.date, ref: i.invoiceNumber, description: i.description, debit: i.amount, credit: 0 })),
      ...stPayments.map(p => ({ date: p.date, ref: p.receiptNumber, description: p.description, debit: 0, credit: p.amount })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    return all.map(item => {
      running += item.debit - item.credit;
      return { ...item, balance: running };
    });
  };

  const selectClass = "px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const btnOutline = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Debtors (Accounts Receivable)</h1>
          <p className="text-sm text-muted-foreground">Student billing, fee tracking, statements & collections</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => window.print()} className={btnOutline}><Printer size={18} /> Print</button>
          <button className={btnOutline}><Download size={18} /> Export</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="light-card-blue"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Students</p><p className="text-lg font-bold font-display">{students.filter(s => s.status === 'Active').length}</p></CardContent></Card>
        <Card className="light-card-purple"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Invoiced</p><p className="text-lg font-bold font-display">${fmt(totalInvoiced)}</p></CardContent></Card>
        <Card className="light-card-green"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Collected</p><p className="text-lg font-bold font-display">${fmt(totalPaid)}</p></CardContent></Card>
        <Card className="light-card-red"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-lg font-bold font-display">${fmt(totalOutstanding)}</p></CardContent></Card>
        <Card className="light-card-orange"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Collection Rate</p><p className="text-lg font-bold font-display">{collectionRate.toFixed(1)}%</p></CardContent></Card>
      </div>

      <Tabs defaultValue="balances">
        <TabsList>
          <TabsTrigger value="balances">Student Balances</TabsTrigger>
          <TabsTrigger value="fees">Fee Structure</TabsTrigger>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
          <TabsTrigger value="statement">Student Statement</TabsTrigger>
        </TabsList>

        {/* BALANCES TAB */}
        <TabsContent value="balances" className="space-y-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Level</label>
              <select value={selectedLevel} onChange={e => { setSelectedLevel(e.target.value); setSelectedStudent('all'); }} className={selectClass}>
                <option value="all">All Levels</option>
                {levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search students..." className={`${inputClass} pl-9`} />
            </div>
          </div>

          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Reg #</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Student Name</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Class</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Invoiced</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Paid</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Balance</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Statement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.filter(s => !searchTerm || `${s.firstName} ${s.lastName} ${s.regNumber}`.toLowerCase().includes(searchTerm.toLowerCase())).map(st => {
                      const stInvs = invoices.filter(i => i.studentId === st.id);
                      const invoiced = stInvs.reduce((s, i) => s + i.amount, 0);
                      const paid = stInvs.reduce((s, i) => s + i.paid, 0);
                      const balance = stInvs.reduce((s, i) => s + i.balance, 0);
                      return (
                        <tr key={st.id} className="border-b border-border hover:bg-muted/50">
                          <td className="px-3 py-2 font-mono text-xs text-primary">{st.regNumber}</td>
                          <td className="px-3 py-2 font-medium">{st.firstName} {st.lastName}</td>
                          <td className="px-3 py-2">{st.className}</td>
                          <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${st.boardingStatus === 'Boarding' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{st.boardingStatus}</span></td>
                          <td className="px-3 py-2 text-right">${fmt(invoiced)}</td>
                          <td className="px-3 py-2 text-right text-success">${fmt(paid)}</td>
                          <td className="px-3 py-2 text-right font-medium text-destructive">${fmt(balance)}</td>
                          <td className="px-3 py-2 text-center">
                            {balance === 0 ? <span className="text-xs text-success flex items-center justify-center gap-1"><Check size={14} /> Paid</span>
                              : <span className="text-xs text-warning flex items-center justify-center gap-1"><AlertTriangle size={14} /> Owing</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => setViewStatement(st.id)} className="text-primary hover:text-primary/80"><Eye size={14} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted font-semibold">
                      <td colSpan={4} className="px-3 py-2">Totals</td>
                      <td className="px-3 py-2 text-right">${fmt(totalInvoiced)}</td>
                      <td className="px-3 py-2 text-right text-success">${fmt(totalPaid)}</td>
                      <td className="px-3 py-2 text-right text-destructive">${fmt(totalOutstanding)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FEE STRUCTURE TAB */}
        <TabsContent value="fees" className="space-y-4">
          <div className="print-area">
            <ReportHeader reportTitle="Fee Structure" subtitle="Term 1 2026" />
            <Card>
              <CardContent className="pt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Level</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount (USD)</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Term</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeStructures.map(f => (
                      <tr key={f.id} className="border-b border-border hover:bg-muted/50">
                        <td className="px-3 py-2 font-medium">{f.level}</td>
                        <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${f.boardingStatus === 'Boarding' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{f.boardingStatus}</span></td>
                        <td className="px-3 py-2">{f.description}</td>
                        <td className="px-3 py-2 text-right font-bold">${fmt(f.amount)}</td>
                        <td className="px-3 py-2">{f.term}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AGING TAB */}
        <TabsContent value="aging" className="space-y-4">
          <div className="print-area">
            <ReportHeader reportTitle="Debtors Aging Report" subtitle={`As at ${new Date().toLocaleDateString()}`} />
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
              <Card><CardContent className="pt-3 pb-2 text-center"><p className="text-xs text-muted-foreground">Current</p><p className="text-lg font-bold font-display text-success">${fmt(aging.current)}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-2 text-center"><p className="text-xs text-muted-foreground">1-30 Days</p><p className="text-lg font-bold font-display text-warning">${fmt(aging.days30)}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-2 text-center"><p className="text-xs text-muted-foreground">31-60 Days</p><p className="text-lg font-bold font-display text-warning">${fmt(aging.days60)}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-2 text-center"><p className="text-xs text-muted-foreground">61-90 Days</p><p className="text-lg font-bold font-display text-destructive">${fmt(aging.days90)}</p></CardContent></Card>
              <Card><CardContent className="pt-3 pb-2 text-center"><p className="text-xs text-muted-foreground">90+ Days</p><p className="text-lg font-bold font-display text-destructive">${fmt(aging.over90)}</p></CardContent></Card>
              <Card className="light-card-red"><CardContent className="pt-3 pb-2 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold font-display">${fmt(aging.total)}</p></CardContent></Card>
            </div>

            <Card>
              <CardContent className="pt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Student</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Class</th>
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
                      const today = new Date('2026-03-27');
                      const sb = { current: 0, d30: 0, d60: 0, d90: 0, o90: 0, total: 0 };
                      invoices.filter(i => i.studentId === st.id && i.balance > 0).forEach(inv => {
                        const days = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                        if (days <= 0) sb.current += inv.balance;
                        else if (days <= 30) sb.d30 += inv.balance;
                        else if (days <= 60) sb.d60 += inv.balance;
                        else if (days <= 90) sb.d90 += inv.balance;
                        else sb.o90 += inv.balance;
                        sb.total += inv.balance;
                      });
                      if (sb.total === 0) return null;
                      return (
                        <tr key={st.id} className="border-b border-border hover:bg-muted/50">
                          <td className="px-3 py-2 font-medium">{st.firstName} {st.lastName}</td>
                          <td className="px-3 py-2">{st.className}</td>
                          <td className="px-3 py-2 text-right">{sb.current > 0 ? `$${fmt(sb.current)}` : '-'}</td>
                          <td className="px-3 py-2 text-right">{sb.d30 > 0 ? `$${fmt(sb.d30)}` : '-'}</td>
                          <td className="px-3 py-2 text-right">{sb.d60 > 0 ? `$${fmt(sb.d60)}` : '-'}</td>
                          <td className="px-3 py-2 text-right">{sb.d90 > 0 ? `$${fmt(sb.d90)}` : '-'}</td>
                          <td className="px-3 py-2 text-right">{sb.o90 > 0 ? `$${fmt(sb.o90)}` : '-'}</td>
                          <td className="px-3 py-2 text-right font-bold">${fmt(sb.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted font-semibold">
                      <td colSpan={2} className="px-3 py-2">Totals</td>
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
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Level</label>
              <select value={selectedLevel} onChange={e => { setSelectedLevel(e.target.value); setViewStatement(null); }} className={selectClass}>
                <option value="all">All Levels</option>
                {levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Student</label>
              <select value={viewStatement || ''} onChange={e => setViewStatement(e.target.value || null)} className={selectClass}>
                <option value="">Select student...</option>
                {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.regNumber})</option>)}
              </select>
            </div>
            <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
          </div>

          {viewStatement && (() => {
            const st = students.find(s => s.id === viewStatement);
            if (!st) return null;
            const lines = getStatementData(viewStatement).filter(l => l.date >= dateFrom && l.date <= dateTo);
            return (
              <div className="print-area">
                <ReportHeader reportTitle="Student Fee Statement" subtitle={`${st.firstName} ${st.lastName} (${st.regNumber}) | ${st.className} | ${dateFrom} to ${dateTo}`} />
                <Card>
                  <CardContent className="pt-4">
                    <div className="mb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Parent:</span> {st.parentName}</div>
                      <div><span className="text-muted-foreground">Phone:</span> {st.parentPhone}</div>
                      <div><span className="text-muted-foreground">Status:</span> {st.boardingStatus}</div>
                      <div><span className="text-muted-foreground">Level:</span> {st.level}</div>
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
                        {lines.map((line, i) => (
                          <tr key={i} className="border-b border-border hover:bg-muted/50">
                            <td className="px-3 py-2">{line.date}</td>
                            <td className="px-3 py-2 font-mono text-xs">{line.ref}</td>
                            <td className="px-3 py-2">{line.description}</td>
                            <td className="px-3 py-2 text-right">{line.debit > 0 ? `$${fmt(line.debit)}` : ''}</td>
                            <td className="px-3 py-2 text-right text-success">{line.credit > 0 ? `$${fmt(line.credit)}` : ''}</td>
                            <td className="px-3 py-2 text-right font-medium">${fmt(line.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {lines.length > 0 && (
                      <div className="mt-3 text-right font-bold text-lg">
                        Balance Due: <span className="text-destructive">${fmt(lines[lines.length - 1].balance)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
