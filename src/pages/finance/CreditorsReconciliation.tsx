import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, Search, Printer, Download, Link2, Unlink, ArrowRightLeft, FileText } from 'lucide-react';
import {
  listSuppliers, listSupplierBills, listSupplierPayments,
  listSupplierStatementLines, matchSupplierStatementLine, billBalance, num,
  type BackendSupplier, type BackendSupplierBill, type BackendSupplierPayment,
  type BackendSupplierStatementLine,
} from '@/lib/payables-api';

interface AgingBucket {
  current: number; days30: number; days60: number; days90: number; over90: number; total: number;
}

const MATCH_WINDOW_DAYS = 3;

function daysApart(a: string, b: string): number {
  return Math.abs(Math.floor((new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24)));
}

export default function CreditorsReconciliation() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyUnmatched, setShowOnlyUnmatched] = useState(false);

  const [suppliers, setSuppliers] = useState<BackendSupplier[]>([]);
  const [bills, setBills] = useState<BackendSupplierBill[]>([]);
  const [payments, setPayments] = useState<BackendSupplierPayment[]>([]);
  const [statementLines, setStatementLines] = useState<BackendSupplierStatementLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);

  const [selectedBill, setSelectedBill] = useState<number | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sup, b, p, sl] = await Promise.all([
        listSuppliers(), listSupplierBills(), listSupplierPayments(), listSupplierStatementLines(),
      ]);
      setSuppliers(sup);
      setBills(b);
      setPayments(p);
      setStatementLines(sl);
    } catch (e: any) {
      setError(e?.message || 'Could not load creditors reconciliation data from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const supplierName = (id: number) => suppliers.find(s => s.id === id)?.name || `Supplier #${id}`;

  const filteredBills = bills.filter(b => {
    if (selectedSupplier !== 'all' && String(b.supplier) !== selectedSupplier) return false;
    if (dateFrom && b.date < dateFrom) return false;
    if (dateTo && b.date > dateTo) return false;
    if (searchTerm && !b.description?.toLowerCase().includes(searchTerm.toLowerCase()) && !b.bill_no.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredLines = statementLines.filter(l => {
    if (selectedSupplier !== 'all' && String(l.supplier) !== selectedSupplier) return false;
    if (showOnlyUnmatched && l.matched) return false;
    if (dateFrom && l.date < dateFrom) return false;
    if (dateTo && l.date > dateTo) return false;
    if (searchTerm && !(l.description || '').toLowerCase().includes(searchTerm.toLowerCase()) && !(l.reference || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const totalOutstanding = useMemo(() => bills.reduce((s, b) => s + billBalance(b), 0), [bills]);

  const aging = useMemo((): AgingBucket => {
    const today = new Date();
    const bucket: AgingBucket = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };
    bills.filter(b => billBalance(b) > 0).forEach(b => {
      const due = new Date(b.due_date);
      const days = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      const bal = billBalance(b);
      if (days <= 0) bucket.current += bal;
      else if (days <= 30) bucket.days30 += bal;
      else if (days <= 60) bucket.days60 += bal;
      else if (days <= 90) bucket.days90 += bal;
      else bucket.over90 += bal;
      bucket.total += bal;
    });
    return bucket;
  }, [bills]);

  const handleAutoMatch = async () => {
    setMatching(true);
    try {
      const billsById = new Map(bills.map(b => [b.id, b]));
      const usedBills = new Set<number>(statementLines.filter(l => l.matched_bill).map(l => l.matched_bill as number));
      let count = 0;
      for (const line of statementLines) {
        if (line.matched) continue;
        const match = bills.find(b =>
          !usedBills.has(b.id) &&
          b.supplier === line.supplier &&
          Math.abs(num(b.amount) - num(line.amount)) < 0.01 &&
          daysApart(b.date, line.date) <= MATCH_WINDOW_DAYS,
        );
        if (match) {
          usedBills.add(match.id);
          await matchSupplierStatementLine(line.id, match.id);
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
    if (!selectedBill || !selectedLine) return;
    setMatching(true);
    try {
      await matchSupplierStatementLine(selectedLine, selectedBill);
      toast.success('Statement line matched to bill');
      setSelectedBill(null);
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
      await matchSupplierStatementLine(lineId, null);
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
          <h1 className="font-display text-2xl font-bold text-foreground">Creditors Reconciliation</h1>
          <p className="text-sm text-muted-foreground">Reconcile supplier statement lines with bills</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => window.print()} className={btnOutline}><Printer size={18} /> Print</button>
          <button className={btnOutline}><Download size={18} /> Export</button>
        </div>
      </div>

      {(loading || error) && (
        <div className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between ${error ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
          <span>{error || 'Loading creditors reconciliation…'}</span>
          {error && <button onClick={load} className="underline font-medium">Retry</button>}
        </div>
      )}

      <Tabs defaultValue="reconcile">
        <TabsList>
          <TabsTrigger value="reconcile">Reconciliation</TabsTrigger>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
          <TabsTrigger value="statement">Creditor Statement</TabsTrigger>
        </TabsList>

        <TabsContent value="reconcile" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-3 flex-wrap items-end">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Supplier</label>
                  <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className={selectClass}>
                    <option value="all">All Suppliers</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
                <button disabled={matching} onClick={handleAutoMatch} className={btnSuccess}><Link2 size={16} /> Auto-Match</button>
                {selectedBill && selectedLine && (
                  <button disabled={matching} onClick={handleManualMatch} className={btnWarning}><ArrowRightLeft size={16} /> Match Selected</button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="light-card-blue"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Suppliers</p><p className="text-lg font-bold font-display">{suppliers.length}</p></CardContent></Card>
            <Card className="light-card-red"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Outstanding</p><p className="text-lg font-bold font-display">${fmt(totalOutstanding)}</p></CardContent></Card>
            <Card className="light-card-orange"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Unmatched Lines</p><p className="text-lg font-bold font-display">{statementLines.filter(l => !l.matched).length}</p></CardContent></Card>
            <Card className="light-card-green"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Fully Matched</p><p className="text-lg font-bold font-display">{statementLines.filter(l => l.matched).length}</p></CardContent></Card>
          </div>

          {/* Search */}
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search bills & statement lines..." className={`${inputClass} pl-9`} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={showOnlyUnmatched} onChange={e => setShowOnlyUnmatched(e.target.checked)} className="rounded" />
              Unmatched only
            </label>
          </div>

          {/* Side by Side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText size={18} className="text-destructive" /> Supplier Bills</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="border-b border-border">
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Bill #</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Supplier</th>
                        <th className="text-right px-2 py-2 font-medium text-muted-foreground">Amount</th>
                        <th className="text-right px-2 py-2 font-medium text-muted-foreground">Balance</th>
                        <th className="text-center px-2 py-2 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBills.map(b => (
                        <tr key={b.id} onClick={() => setSelectedBill(b.id === selectedBill ? null : b.id)}
                          className={`border-b border-border cursor-pointer transition-colors ${selectedBill === b.id ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'}`}>
                          <td className="px-2 py-2">{b.date}</td>
                          <td className="px-2 py-2 font-mono text-xs">{b.bill_no}</td>
                          <td className="px-2 py-2">{b.supplier_name || supplierName(b.supplier)}</td>
                          <td className="px-2 py-2 text-right">${fmt(num(b.amount))}</td>
                          <td className="px-2 py-2 text-right font-medium">${fmt(billBalance(b))}</td>
                          <td className="px-2 py-2 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${b.status === 'Paid' ? 'bg-success/10 text-success' : b.status === 'Partial' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>{b.status}</span>
                          </td>
                        </tr>
                      ))}
                      {!loading && filteredBills.length === 0 && (
                        <tr><td colSpan={6} className="px-2 py-6 text-center text-muted-foreground">No supplier bills yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText size={18} className="text-success" /> Supplier Statement Lines</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="border-b border-border">
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Reference</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Supplier</th>
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
                          <td className="px-2 py-2">{supplierName(l.supplier)}</td>
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
                        <tr><td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">No supplier statement lines yet.</td></tr>
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
            <ReportHeader reportTitle="Creditors Aging Report" subtitle={`As at ${dateTo || new Date().toISOString().slice(0, 10)}`} />
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
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Supplier</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Current</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">1-30</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">31-60</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">61-90</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">90+</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map(sup => {
                      const supBills = bills.filter(b => b.supplier === sup.id && billBalance(b) > 0);
                      const today = new Date();
                      const b = { current: 0, d30: 0, d60: 0, d90: 0, over: 0, total: 0 };
                      supBills.forEach(bill => {
                        const days = Math.floor((today.getTime() - new Date(bill.due_date).getTime()) / (1000 * 60 * 60 * 24));
                        const bal = billBalance(bill);
                        if (days <= 0) b.current += bal;
                        else if (days <= 30) b.d30 += bal;
                        else if (days <= 60) b.d60 += bal;
                        else if (days <= 90) b.d90 += bal;
                        else b.over += bal;
                        b.total += bal;
                      });
                      if (b.total === 0) return null;
                      return (
                        <tr key={sup.id} className="border-b border-border hover:bg-muted/50">
                          <td className="px-3 py-2 font-medium">{sup.name}</td>
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
                      <td className="px-3 py-2">TOTAL</td>
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
            <ReportHeader reportTitle="Creditor Statement" subtitle={selectedSupplier !== 'all' ? suppliers.find(s => String(s.id) === selectedSupplier)?.name : 'All Suppliers'} />
            <Card>
              <CardContent className="pt-4">
                <div className="mb-4">
                  <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className={selectClass + ' print:hidden'}>
                    <option value="all">All Suppliers</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                      const sId = selectedSupplier;
                      const allItems: { date: string; ref: string; desc: string; charge: number; payment: number }[] = [];
                      bills.filter(b => sId === 'all' || String(b.supplier) === sId).forEach(b => {
                        allItems.push({ date: b.date, ref: b.bill_no, desc: b.description, charge: num(b.amount), payment: 0 });
                      });
                      payments.filter(p => sId === 'all' || String(p.supplier) === sId).forEach(p => {
                        allItems.push({ date: p.date, ref: p.reference || '', desc: p.description || '', charge: 0, payment: num(p.amount) });
                      });
                      allItems.sort((a, b) => a.date.localeCompare(b.date));
                      let running = 0;
                      return allItems.map((item, idx) => {
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
