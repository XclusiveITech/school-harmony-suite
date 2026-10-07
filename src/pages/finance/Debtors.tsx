import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { AlertTriangle, RefreshCw, Search, Printer, Download, Eye, Check, ExternalLink } from 'lucide-react';
import {
  listInvoices, listReceipts, num,
  type BackendInvoice, type BackendReceipt,
} from '@/lib/finance-api';
import { listStudents, type BackendStudent } from '@/lib/students-api';
import { safeList } from '@/lib/finance-api';

interface BackendFeeItem {
  id: number;
  name: string;
  gl_account_code?: string;
  cycle?: string;
  applies_to?: string;
  mandatory?: boolean;
  amount: number | string;
}
interface BackendFeeStructure {
  id: number;
  code: string;
  name: string;
  version?: number;
  academic_year?: string;
  level?: string;
  status: string;
  currency: string;
  items?: BackendFeeItem[];
}

export default function Debtors() {
  const [students, setStudents] = useState<BackendStudent[]>([]);
  const [invoices, setInvoices] = useState<BackendInvoice[]>([]);
  const [receipts, setReceipts] = useState<BackendReceipt[]>([]);
  const [feeStructures, setFeeStructures] = useState<BackendFeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState('2000-01-01');
  const [dateTo, setDateTo] = useState('2100-12-31');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [viewStatement, setViewStatement] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [st, inv, rec, fs] = await Promise.all([
        listStudents(), listInvoices(), listReceipts(), safeList<BackendFeeStructure>('/api/finance/feestructure/?limit=200'),
      ]);
      setStudents(st);
      setInvoices(inv);
      setReceipts(rec);
      setFeeStructures(fs);
    } catch (e: any) {
      setError(e?.message || 'Could not load debtors data from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const studentName = (s: BackendStudent) => `${s.first_name} ${s.last_name}`;
  const levels = [...new Set(students.map(s => s.level))].sort();
  const filteredStudents = students.filter(s => selectedLevel === 'all' || s.level === selectedLevel);

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const processedInvoices = invoices.filter(i => i.status === 'Processed');
  const processedReceipts = receipts.filter(r => r.status === 'Processed');

  const totalInvoiced = processedInvoices.reduce((s, i) => s + num(i.total), 0);
  const totalPaid = processedReceipts.reduce((s, r) => s + num(r.amount), 0);
  const totalOutstanding = totalInvoiced - totalPaid;
  const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

  const invoiceDueDate = (inv: BackendInvoice) => inv.date; // backend has no separate due_date on invoices
  const studentOf = (studentId: number) => students.find(s => s.id === studentId);

  // Aging (based on invoice date since no explicit due date field)
  const aging = useMemo(() => {
    const today = new Date();
    const b = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };
    processedInvoices.forEach(inv => {
      const paidForInv = 0; // receipts aren't linked to a specific invoice in this backend
      const balance = num(inv.total);
      if (balance <= 0) return;
      const days = Math.floor((today.getTime() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 0) b.current += balance;
      else if (days <= 30) b.days30 += balance;
      else if (days <= 60) b.days60 += balance;
      else if (days <= 90) b.days90 += balance;
      else b.over90 += balance;
      b.total += balance;
    });
    return b;
  }, [processedInvoices]);

  const filteredInvoices = processedInvoices.filter(inv => {
    if (selectedStudent !== 'all' && String(inv.student) !== selectedStudent) return false;
    if (selectedLevel !== 'all') {
      const st = studentOf(inv.student);
      if (st && st.level !== selectedLevel) return false;
    }
    if (searchTerm && !inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getStatementData = (studentId: string) => {
    const stInvoices = processedInvoices.filter(i => String(i.student) === studentId);
    const stReceipts = processedReceipts.filter(r => String(r.student) === studentId);
    const all = [
      ...stInvoices.map(i => ({ date: i.date, ref: i.invoice_number, description: i.lines?.map(l => l.description).join(', ') || 'Invoice', debit: num(i.total), credit: 0 })),
      ...stReceipts.map(r => ({ date: r.date, ref: r.receipt_number, description: r.description || 'Payment', debit: 0, credit: num(r.amount) })),
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

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-muted-foreground">Loading debtors…</div>;
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertTriangle className="text-destructive" size={32} />
        <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        <button onClick={load} className={btnOutline}><RefreshCw size={16} /> Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Debtors (Accounts Receivable)</h1>
          <p className="text-sm text-muted-foreground">Student billing, fee tracking, statements & collections</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className={btnOutline}><RefreshCw size={18} /> Refresh</button>
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
                    {filteredStudents.filter(s => !searchTerm || `${s.first_name} ${s.last_name} ${s.student_no}`.toLowerCase().includes(searchTerm.toLowerCase())).map(st => {
                      const stInvs = processedInvoices.filter(i => i.student === st.id);
                      const stRecs = processedReceipts.filter(r => r.student === st.id);
                      const invoiced = stInvs.reduce((s, i) => s + num(i.total), 0);
                      const paid = stRecs.reduce((s, r) => s + num(r.amount), 0);
                      const balance = invoiced - paid;
                      return (
                        <tr key={st.id} className="border-b border-border hover:bg-muted/50">
                          <td className="px-3 py-2 font-mono text-xs text-primary">{st.student_no}</td>
                          <td className="px-3 py-2 font-medium">{studentName(st)}</td>
                          <td className="px-3 py-2">{st.class_name}</td>
                          <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${st.residence === 'Boarding' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{st.residence}</span></td>
                          <td className="px-3 py-2 text-right">${fmt(invoiced)}</td>
                          <td className="px-3 py-2 text-right text-success">${fmt(paid)}</td>
                          <td className="px-3 py-2 text-right font-medium text-destructive">${fmt(balance)}</td>
                          <td className="px-3 py-2 text-center">
                            {balance <= 0 ? <span className="text-xs text-success flex items-center justify-center gap-1"><Check size={14} /> Paid</span>
                              : <span className="text-xs text-warning flex items-center justify-center gap-1"><AlertTriangle size={14} /> Owing</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => setViewStatement(String(st.id))} className="text-primary hover:text-primary/80"><Eye size={14} /></button>
                          </td>
                        </tr>
                      );
                    })}
                    {students.length === 0 && (
                      <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No students found.</td></tr>
                    )}
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
          <div className="flex justify-between items-center print:hidden">
            <p className="text-sm text-muted-foreground">
              Showing fee structures from the Fees Structure &amp; Billing module.
            </p>
            <Link to="/finance/fees-structure" className={btnOutline}>
              <ExternalLink size={16} /> Open Fees Structure &amp; Billing
            </Link>
          </div>
          <div className="print-area space-y-4">
            <ReportHeader reportTitle="Fee Structures" subtitle="From Fees Structure & Billing Engine" />
            {feeStructures.length === 0 && (
              <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">
                No fee structures defined. Create them in Fees Structure &amp; Billing.
              </CardContent></Card>
            )}
            {feeStructures.map(s => (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{s.name}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">
                        {s.code}{s.version ? ` · v${s.version}` : ''}{s.academic_year ? ` · ${s.academic_year}` : ''}
                        {s.level ? ` · ${s.level}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.status === 'Approved' ? 'default' : 'secondary'}>{s.status}</Badge>
                      <span className="text-sm font-semibold">
                        Total: {s.currency} ${fmt((s.items || []).reduce((sum, it) => sum + num(it.amount), 0))}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Fee Item</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">GL Account</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Cycle</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Applies To</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">Mandatory</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount ({s.currency})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(s.items || []).map(it => (
                        <tr key={it.id} className="border-b border-border hover:bg-muted/50">
                          <td className="px-3 py-2 font-medium">{it.name}</td>
                          <td className="px-3 py-2 font-mono text-xs">{it.gl_account_code}</td>
                          <td className="px-3 py-2">{it.cycle}</td>
                          <td className="px-3 py-2">{it.applies_to || 'All'}</td>
                          <td className="px-3 py-2 text-center">
                            {it.mandatory
                              ? <Check size={14} className="inline text-success" />
                              : <span className="text-xs text-muted-foreground">Optional</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">${fmt(num(it.amount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
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
                      const today = new Date();
                      const stInvs = processedInvoices.filter(i => i.student === st.id);
                      if (stInvs.length === 0) return null;
                      const sb = { current: 0, d30: 0, d60: 0, d90: 0, o90: 0, total: 0 };
                      stInvs.forEach(inv => {
                        const balance = num(inv.total);
                        const days = Math.floor((today.getTime() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24));
                        if (days <= 0) sb.current += balance;
                        else if (days <= 30) sb.d30 += balance;
                        else if (days <= 60) sb.d60 += balance;
                        else if (days <= 90) sb.d90 += balance;
                        else sb.o90 += balance;
                        sb.total += balance;
                      });
                      if (sb.total === 0) return null;
                      return (
                        <tr key={st.id} className="border-b border-border hover:bg-muted/50">
                          <td className="px-3 py-2 font-medium">{studentName(st)}</td>
                          <td className="px-3 py-2">{st.class_name}</td>
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
                {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_no})</option>)}
              </select>
            </div>
            <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
          </div>

          {viewStatement && (() => {
            const st = students.find(s => String(s.id) === viewStatement);
            if (!st) return null;
            const lines = getStatementData(viewStatement).filter(l => l.date >= dateFrom && l.date <= dateTo);
            return (
              <div className="print-area">
                <ReportHeader reportTitle="Student Fee Statement" subtitle={`${st.first_name} ${st.last_name} (${st.student_no}) | ${st.class_name} | ${dateFrom} to ${dateTo}`} />
                <Card>
                  <CardContent className="pt-4">
                    <div className="mb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Guardian:</span> {st.guardian_name}</div>
                      <div><span className="text-muted-foreground">Phone:</span> {st.guardian_phone}</div>
                      <div><span className="text-muted-foreground">Residence:</span> {st.residence}</div>
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
