import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, Search, Printer, Download, Link2, Unlink, ArrowRightLeft, FileText } from 'lucide-react';
import { listStudents, type BackendStudent } from '@/lib/students-api';
import { listInvoices, listReceipts, num, type BackendInvoice, type BackendReceipt } from '@/lib/finance-api';
import {
  listDebtorStatementLines, matchDebtorStatementLine,
  type BackendDebtorStatementLine,
} from '@/lib/debtors-recon-api';

const MATCH_WINDOW_DAYS = 3;

function daysApart(a: string, b: string): number {
  return Math.abs(Math.floor((new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24)));
}

export default function DebtorsReconciliation() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyUnmatched, setShowOnlyUnmatched] = useState(false);

  const [students, setStudents] = useState<BackendStudent[]>([]);
  const [invoices, setInvoices] = useState<BackendInvoice[]>([]);
  const [receipts, setReceipts] = useState<BackendReceipt[]>([]);
  const [statementLines, setStatementLines] = useState<BackendDebtorStatementLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);

  const [selectedReceipt, setSelectedReceipt] = useState<number | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [st, inv, rec, sl] = await Promise.all([
        listStudents(), listInvoices(), listReceipts(), listDebtorStatementLines(),
      ]);
      setStudents(st);
      setInvoices(inv);
      setReceipts(rec);
      setStatementLines(sl);
    } catch (e: any) {
      setError(e?.message || 'Could not load debtors reconciliation data from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const studentLabel = (id: number) => {
    const s = students.find(x => x.id === id);
    return s ? `${s.first_name} ${s.last_name}` : `Student #${id}`;
  };

  const levels = useMemo(() => [...new Set(students.map(s => s.level))].sort(), [students]);

  const filteredStudents = students.filter(s => selectedLevel === 'all' || s.level === selectedLevel);

  const studentMatchesFilters = (studentId: number) => {
    if (selectedStudent !== 'all' && String(studentId) !== selectedStudent) return false;
    if (selectedLevel !== 'all') {
      const st = students.find(s => s.id === studentId);
      if (st && st.level !== selectedLevel) return false;
    }
    return true;
  };

  const processedInvoices = useMemo(() => invoices.filter(i => i.status === 'Processed'), [invoices]);
  const processedReceipts = useMemo(() => receipts.filter(r => r.status === 'Processed'), [receipts]);

  const filteredInvoices = processedInvoices.filter(inv => {
    if (!studentMatchesFilters(inv.student)) return false;
    if (dateFrom && inv.date < dateFrom) return false;
    if (dateTo && inv.date > dateTo) return false;
    if (searchTerm && !(inv.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredReceipts = processedReceipts.filter(r => {
    if (!studentMatchesFilters(r.student)) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    if (searchTerm && !(r.description || '').toLowerCase().includes(searchTerm.toLowerCase()) && !(r.reference || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredLines = statementLines.filter(l => {
    if (!studentMatchesFilters(l.student)) return false;
    if (showOnlyUnmatched && l.matched) return false;
    if (dateFrom && l.date < dateFrom) return false;
    if (dateTo && l.date > dateTo) return false;
    if (searchTerm && !(l.description || '').toLowerCase().includes(searchTerm.toLowerCase()) && !(l.reference || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const totalInvoiced = useMemo(() => processedInvoices.reduce((s, i) => s + num(i.total), 0), [processedInvoices]);
  const totalCollected = useMemo(() => processedReceipts.reduce((s, r) => s + num(r.amount), 0), [processedReceipts]);
  const totalOutstanding = Math.max(0, totalInvoiced - totalCollected);

  // Aging — approximated from invoice date (invoices carry no due date in this schema).
  const aging = useMemo(() => {
    const today = new Date();
    const b = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };
    processedInvoices.forEach(inv => {
      const days = Math.floor((today.getTime() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24));
      const amt = num(inv.total);
      if (days <= 0) b.current += amt;
      else if (days <= 30) b.days30 += amt;
      else if (days <= 60) b.days60 += amt;
      else if (days <= 90) b.days90 += amt;
      else b.over90 += amt;
      b.total += amt;
    });
    return b;
  }, [processedInvoices]);

  const handleAutoMatch = async () => {
    setMatching(true);
    try {
      const usedReceipts = new Set<number>(statementLines.filter(l => l.matched_receipt).map(l => l.matched_receipt as number));
      let count = 0;
      for (const line of statementLines) {
        if (line.matched) continue;
        const match = processedReceipts.find(r =>
          !usedReceipts.has(r.id) &&
          r.student === line.student &&
          Math.abs(num(r.amount) - num(line.amount)) < 0.01 &&
          daysApart(r.date, line.date) <= MATCH_WINDOW_DAYS,
        );
        if (match) {
          usedReceipts.add(match.id);
          await matchDebtorStatementLine(line.id, match.id);
          count += 1;
        }
      }
      if (count > 0) toast.success(`Auto-matched ${count} statement line${count === 1 ? '' : 's'}`);
      else toast.message('No new matches found');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not auto-match statement lines.');
    } finally {
      setMatching(false);
    }
  };

  const handleManualMatch = async () => {
    if (!selectedReceipt || !selectedLine) return;
    setMatching(true);
    try {
      await matchDebtorStatementLine(selectedLine, selectedReceipt);
      toast.success('Statement line matched to receipt');
      setSelectedReceipt(null);
      setSelectedLine(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not match the selected items.');
    } finally {
      setMatching(false);
    }
  };

  const handleUnmatch = async (lineId: number) => {
    setMatching(true);
    try {
      await matchDebtorStatementLine(lineId, null);
      toast.success('Statement line unmatched');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not unmatch the statement line.');
    } finally {
      setMatching(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const selectClass = "px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const btnSuccess = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-success text-white font-medium text-sm hover:bg-success/90 transition-colors disabled:opacity-60";
  const btnWarning = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-warning text-white font-medium text-sm hover:bg-warning/90 transition-colors disabled:opacity-60";
  const btnOutline = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Debtors Reconciliation</h1>
          <p className="text-sm text-muted-foreground">Reconcile student statement lines with receipts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => window.print()} className={btnOutline}><Printer size={18} /> Print</button>
          <button className={btnOutline}><Download size={18} /> Export</button>
        </div>
      </div>

      {(loading || error) && (
        <div className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between ${error ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
          <span>{error || 'Loading debtors reconciliation…'}</span>
          {error && <button onClick={load} className="underline font-medium">Retry</button>}
        </div>
      )}

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
                    {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_no})</option>)}
                  </select>
                </div>
                <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
                <button disabled={matching} onClick={handleAutoMatch} className={btnSuccess}><Link2 size={16} /> Auto-Match</button>
                {selectedReceipt && selectedLine && (
                  <button disabled={matching} onClick={handleManualMatch} className={btnWarning}><ArrowRightLeft size={16} /> Match Selected</button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Card className="light-card-blue"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Invoiced</p><p className="text-lg font-bold font-display">${fmt(totalInvoiced)}</p></CardContent></Card>
            <Card className="light-card-green"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Collected</p><p className="text-lg font-bold font-display">${fmt(totalCollected)}</p></CardContent></Card>
            <Card className="light-card-red"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Outstanding</p><p className="text-lg font-bold font-display">${fmt(totalOutstanding)}</p></CardContent></Card>
            <Card className="light-card-orange"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Unmatched Lines</p><p className="text-lg font-bold font-display">{statementLines.filter(l => !l.matched).length}</p></CardContent></Card>
            <Card className="light-card-purple"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Collection Rate</p><p className="text-lg font-bold font-display">{totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(1) : '0.0'}%</p></CardContent></Card>
          </div>

          {/* Search */}
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search receipts & statement lines..." className={`${inputClass} pl-9`} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={showOnlyUnmatched} onChange={e => setShowOnlyUnmatched(e.target.checked)} className="rounded" />
              Unmatched only
            </label>
          </div>

          {/* Side by Side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText size={18} className="text-success" /> Receipts</CardTitle></CardHeader>
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
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReceipts.map(r => (
                        <tr key={r.id} onClick={() => setSelectedReceipt(r.id === selectedReceipt ? null : r.id)}
                          className={`border-b border-border cursor-pointer transition-colors ${selectedReceipt === r.id ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'}`}>
                          <td className="px-2 py-2">{r.date}</td>
                          <td className="px-2 py-2 font-mono text-xs">{r.receipt_number}</td>
                          <td className="px-2 py-2">{r.student_name || studentLabel(r.student)}</td>
                          <td className="px-2 py-2 text-right">${fmt(num(r.amount))}</td>
                          <td className="px-2 py-2">{r.payment_mode}</td>
                        </tr>
                      ))}
                      {!loading && filteredReceipts.length === 0 && (
                        <tr><td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">No receipts yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText size={18} className="text-destructive" /> Debtor Statement Lines</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="border-b border-border">
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Reference</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Student</th>
                        <th className="text-right px-2 py-2 font-medium text-muted-foreground">Amount</th>
                        <th className="text-center px-2 py-2 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLines.map(l => (
                        <tr key={l.id} onClick={() => !l.matched && setSelectedLine(l.id === selectedLine ? null : l.id)}
                          className={`border-b border-border cursor-pointer transition-colors ${l.matched ? 'bg-success/5' : selectedLine === l.id ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'}`}>
                          <td className="px-2 py-2">{l.date}</td>
                          <td className="px-2 py-2 font-mono text-xs">{l.reference}</td>
                          <td className="px-2 py-2">{studentLabel(l.student)}</td>
                          <td className="px-2 py-2 text-right">${fmt(num(l.amount))}</td>
                          <td className="px-2 py-2 text-center">
                            {l.matched ? (
                              <span className="inline-flex items-center gap-1 text-xs text-success">
                                <CheckCircle2 size={14} /> Matched
                                <button onClick={(ev) => { ev.stopPropagation(); handleUnmatch(l.id); }} className="ml-1 text-destructive hover:text-destructive/80"><Unlink size={12} /></button>
                              </span>
                            ) : <span className="text-xs text-warning flex items-center justify-center gap-1"><AlertTriangle size={14} /> Unmatched</span>}
                          </td>
                        </tr>
                      ))}
                      {!loading && filteredLines.length === 0 && (
                        <tr><td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">No debtor statement lines yet.</td></tr>
                      )}
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
            <ReportHeader reportTitle="Debtors Aging Report" subtitle={`As at ${dateTo || new Date().toISOString().slice(0, 10)}`} />
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
                      const stInvs = processedInvoices.filter(i => i.student === st.id);
                      if (stInvs.length === 0) return null;
                      const today = new Date();
                      const b = { current: 0, d30: 0, d60: 0, d90: 0, over: 0, total: 0 };
                      stInvs.forEach(inv => {
                        const days = Math.floor((today.getTime() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24));
                        const amt = num(inv.total);
                        if (days <= 0) b.current += amt;
                        else if (days <= 30) b.d30 += amt;
                        else if (days <= 60) b.d60 += amt;
                        else if (days <= 90) b.d90 += amt;
                        else b.over += amt;
                        b.total += amt;
                      });
                      return (
                        <tr key={st.id} className="border-b border-border hover:bg-muted/50">
                          <td className="px-3 py-2 font-medium">{st.first_name} {st.last_name}</td>
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
            <ReportHeader reportTitle="Debtor Statement" subtitle={selectedStudent !== 'all' ? (() => { const s = students.find(st => String(st.id) === selectedStudent); return s ? `${s.first_name} ${s.last_name} (${s.student_no})` : ''; })() : 'All Students'} />
            <Card>
              <CardContent className="pt-4">
                <div className="mb-4 flex gap-3 print:hidden">
                  <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className={selectClass}>
                    <option value="all">All Students</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_no})</option>)}
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
                      const items: { date: string; ref: string; desc: string; charge: number; payment: number }[] = [];
                      processedInvoices.filter(i => sId === 'all' || String(i.student) === sId).forEach(i => {
                        items.push({ date: i.date, ref: i.invoice_number, desc: `${studentLabel(i.student)} - Fee Invoice`, charge: num(i.total), payment: 0 });
                      });
                      processedReceipts.filter(r => sId === 'all' || String(r.student) === sId).forEach(r => {
                        items.push({ date: r.date, ref: r.receipt_number, desc: `${studentLabel(r.student)} - ${r.description || 'Payment'}`, charge: 0, payment: num(r.amount) });
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
