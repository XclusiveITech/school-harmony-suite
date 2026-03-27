import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Upload, CheckCircle2, XCircle, Link2, Unlink, Printer, Download, Search, AlertTriangle, FileText, Eye, Check, X, ArrowRightLeft } from 'lucide-react';

// Types
interface BankStatementEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  matched: boolean;
  matchedWith?: string;
}

interface CashbookEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  matched: boolean;
  matchedWith?: string;
}

interface ReconciliationRecord {
  id: string;
  date: string;
  bankAccount: string;
  periodFrom: string;
  periodTo: string;
  bankBalance: number;
  cashbookBalance: number;
  adjustedBankBalance: number;
  adjustedCashbookBalance: number;
  status: 'Draft' | 'Completed' | 'Approved';
  reconciledBy: string;
  approvedBy?: string;
  unmatchedBank: number;
  unmatchedCashbook: number;
}

// Dummy bank statement entries (simulating uploaded statement)
const dummyBankStatement: BankStatementEntry[] = [
  { id: 'bs1', date: '2026-03-02', reference: 'TRF-9921', description: 'HENRY MURINDA TUITION', debit: 0, credit: 800, balance: 45800, matched: false },
  { id: 'bs2', date: '2026-03-03', reference: 'CHQ-0045', description: 'STATIONERY SUPPLIES', debit: 450, credit: 0, balance: 45350, matched: false },
  { id: 'bs3', date: '2026-03-05', reference: 'SAL-MAR', description: 'SALARY PAYMENT MARCH', debit: 6500, credit: 0, balance: 38850, matched: false },
  { id: 'bs4', date: '2026-03-07', reference: 'TRF-9935', description: 'TINASHE CHIKARA FEES', debit: 0, credit: 500, balance: 39350, matched: false },
  { id: 'bs5', date: '2026-03-10', reference: 'DD-UTIL', description: 'ZESA ELECTRICITY', debit: 1500, credit: 0, balance: 37850, matched: false },
  { id: 'bs6', date: '2026-03-12', reference: 'TRF-9948', description: 'RUDO NYATHI BOARDING', debit: 0, credit: 1200, balance: 39050, matched: false },
  { id: 'bs7', date: '2026-03-15', reference: 'BANK-CHG', description: 'BANK CHARGES MARCH', debit: 35, credit: 0, balance: 39015, matched: false },
  { id: 'bs8', date: '2026-03-18', reference: 'TRF-9960', description: 'PTA DONATION', debit: 0, credit: 2000, balance: 41015, matched: false },
  { id: 'bs9', date: '2026-03-20', reference: 'CHQ-0048', description: 'MEGA OFFICE FURNITURE', debit: 3500, credit: 0, balance: 37515, matched: false },
  { id: 'bs10', date: '2026-03-25', reference: 'INT-CR', description: 'INTEREST EARNED', debit: 0, credit: 125, balance: 37640, matched: false },
];

// Dummy cashbook entries
const dummyCashbookEntries: CashbookEntry[] = [
  { id: 'cb1', date: '2026-03-02', reference: 'REC-001', description: 'Payment received - Henry Murinda', debit: 800, credit: 0, matched: false },
  { id: 'cb2', date: '2026-03-05', reference: 'PAY-001', description: 'Salary payment - March', debit: 0, credit: 6500, matched: false },
  { id: 'cb3', date: '2026-03-07', reference: 'REC-002', description: 'Payment received - Tinashe Chikara', debit: 500, credit: 0, matched: false },
  { id: 'cb4', date: '2026-03-10', reference: 'PAY-002', description: 'Utilities bill - ZESA', debit: 0, credit: 1500, matched: false },
  { id: 'cb5', date: '2026-03-12', reference: 'REC-003', description: 'Boarding fees - Rudo Nyathi', debit: 1200, credit: 0, matched: false },
  { id: 'cb6', date: '2026-03-18', reference: 'REC-004', description: 'PTA Donation received', debit: 2000, credit: 0, matched: false },
  { id: 'cb7', date: '2026-03-20', reference: 'PAY-003', description: 'Mega Office Furniture payment', debit: 0, credit: 3500, matched: false },
  { id: 'cb8', date: '2026-03-22', reference: 'PAY-004', description: 'National Foods - catering supplies', debit: 0, credit: 2200, matched: false },
];

// Past reconciliation records
const dummyReconRecords: ReconciliationRecord[] = [
  { id: 'r1', date: '2026-02-28', bankAccount: 'Cash at Bank - FBC', periodFrom: '2026-02-01', periodTo: '2026-02-28', bankBalance: 45000, cashbookBalance: 44800, adjustedBankBalance: 44800, adjustedCashbookBalance: 44800, status: 'Approved', reconciledBy: 'Linda Zuze', approvedBy: 'David Phiri', unmatchedBank: 0, unmatchedCashbook: 0 },
  { id: 'r2', date: '2026-01-31', bankAccount: 'Cash at Bank - FBC', periodFrom: '2026-01-01', periodTo: '2026-01-31', bankBalance: 42500, cashbookBalance: 42100, adjustedBankBalance: 42100, adjustedCashbookBalance: 42100, status: 'Approved', reconciledBy: 'Linda Zuze', approvedBy: 'David Phiri', unmatchedBank: 0, unmatchedCashbook: 0 },
];

const bankAccounts = [
  { id: 'ba1', name: 'Cash at Bank - FBC', code: '1000' },
  { id: 'ba2', name: 'Cash at Bank - CBZ', code: '1001' },
];

export default function BankReconciliation() {
  const [dateFrom, setDateFrom] = useState('2026-03-01');
  const [dateTo, setDateTo] = useState('2026-03-31');
  const [selectedBank, setSelectedBank] = useState('ba1');
  const [bankEntries, setBankEntries] = useState<BankStatementEntry[]>(dummyBankStatement);
  const [cashbookEntries, setCashbookEntries] = useState<CashbookEntry[]>(dummyCashbookEntries);
  const [reconRecords] = useState<ReconciliationRecord[]>(dummyReconRecords);
  const [statementUploaded, setStatementUploaded] = useState(true);
  const [selectedBankEntry, setSelectedBankEntry] = useState<string | null>(null);
  const [selectedCashbookEntry, setSelectedCashbookEntry] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyUnmatched, setShowOnlyUnmatched] = useState(false);
  const [reconStatus, setReconStatus] = useState<'draft' | 'completed'>('draft');

  const bankClosingBalance = 37640;
  const cashbookBalance = useMemo(() => {
    return cashbookEntries.reduce((sum, e) => sum + e.debit - e.credit, 0) + 45000;
  }, [cashbookEntries]);

  const matchedBankCount = bankEntries.filter(e => e.matched).length;
  const matchedCashbookCount = cashbookEntries.filter(e => e.matched).length;
  const unmatchedBankTotal = bankEntries.filter(e => !e.matched).reduce((s, e) => s + (e.credit - e.debit), 0);
  const unmatchedCashbookTotal = cashbookEntries.filter(e => !e.matched).reduce((s, e) => s + (e.debit - e.credit), 0);

  // Auto-match logic: match by amount and approximate date
  const handleAutoMatch = () => {
    const newBank = [...bankEntries];
    const newCb = [...cashbookEntries];

    for (let bi = 0; bi < newBank.length; bi++) {
      if (newBank[bi].matched) continue;
      const bAmt = newBank[bi].credit - newBank[bi].debit;
      for (let ci = 0; ci < newCb.length; ci++) {
        if (newCb[ci].matched) continue;
        const cAmt = newCb[ci].debit - newCb[ci].credit;
        // Match if amounts are equal and dates within 3 days
        if (Math.abs(bAmt - cAmt) < 0.01) {
          const bDate = new Date(newBank[bi].date);
          const cDate = new Date(newCb[ci].date);
          const dayDiff = Math.abs((bDate.getTime() - cDate.getTime()) / (1000 * 60 * 60 * 24));
          if (dayDiff <= 3) {
            newBank[bi] = { ...newBank[bi], matched: true, matchedWith: newCb[ci].id };
            newCb[ci] = { ...newCb[ci], matched: true, matchedWith: newBank[bi].id };
            break;
          }
        }
      }
    }
    setBankEntries(newBank);
    setCashbookEntries(newCb);
  };

  // Manual match
  const handleManualMatch = () => {
    if (!selectedBankEntry || !selectedCashbookEntry) return;
    setBankEntries(prev => prev.map(e => e.id === selectedBankEntry ? { ...e, matched: true, matchedWith: selectedCashbookEntry } : e));
    setCashbookEntries(prev => prev.map(e => e.id === selectedCashbookEntry ? { ...e, matched: true, matchedWith: selectedBankEntry } : e));
    setSelectedBankEntry(null);
    setSelectedCashbookEntry(null);
  };

  // Unmatch
  const handleUnmatch = (bankId: string) => {
    const be = bankEntries.find(e => e.id === bankId);
    if (!be?.matchedWith) return;
    const cbId = be.matchedWith;
    setBankEntries(prev => prev.map(e => e.id === bankId ? { ...e, matched: false, matchedWith: undefined } : e));
    setCashbookEntries(prev => prev.map(e => e.id === cbId ? { ...e, matched: false, matchedWith: undefined } : e));
  };

  const handleUploadStatement = () => {
    setStatementUploaded(true);
    setBankEntries(dummyBankStatement);
  };

  const handleCompleteRecon = () => {
    setReconStatus('completed');
  };

  const filteredBank = bankEntries.filter(e => {
    if (showOnlyUnmatched && e.matched) return false;
    if (searchTerm && !e.description.toLowerCase().includes(searchTerm.toLowerCase()) && !e.reference.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredCashbook = cashbookEntries.filter(e => {
    if (showOnlyUnmatched && e.matched) return false;
    if (searchTerm && !e.description.toLowerCase().includes(searchTerm.toLowerCase()) && !e.reference.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const selectClass = "px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const btnPrimary = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors";
  const btnOutline = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors";
  const btnSuccess = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-success text-white font-medium text-sm hover:bg-success/90 transition-colors";
  const btnWarning = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-warning text-white font-medium text-sm hover:bg-warning/90 transition-colors";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Bank Reconciliation</h1>
          <p className="text-sm text-muted-foreground">Reconcile bank statements with cashbook entries</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => window.print()} className={btnOutline}>
            <Printer size={18} /> Print
          </button>
          <button className={btnOutline}>
            <Download size={18} /> Export
          </button>
        </div>
      </div>

      <Tabs defaultValue="reconcile">
        <TabsList>
          <TabsTrigger value="reconcile">Reconciliation</TabsTrigger>
          <TabsTrigger value="statement">Reconciliation Statement</TabsTrigger>
          <TabsTrigger value="history">History & Audit</TabsTrigger>
        </TabsList>

        {/* ===== RECONCILIATION TAB ===== */}
        <TabsContent value="reconcile" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-3 flex-wrap items-end">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Bank Account</label>
                  <select value={selectedBank} onChange={e => setSelectedBank(e.target.value)} className={selectClass}>
                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
                <button onClick={handleUploadStatement} className={btnPrimary}>
                  <Upload size={16} /> Upload Bank Statement
                </button>
                <button onClick={handleAutoMatch} className={btnSuccess}>
                  <Link2 size={16} /> Auto-Match
                </button>
                {selectedBankEntry && selectedCashbookEntry && (
                  <button onClick={handleManualMatch} className={btnWarning}>
                    <ArrowRightLeft size={16} /> Match Selected
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Card className="light-card-blue">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Bank Closing Balance</p>
                <p className="text-lg font-bold font-display text-foreground">${fmt(bankClosingBalance)}</p>
              </CardContent>
            </Card>
            <Card className="light-card-green">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Cashbook Balance</p>
                <p className="text-lg font-bold font-display text-foreground">${fmt(cashbookBalance)}</p>
              </CardContent>
            </Card>
            <Card className="light-card-purple">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Matched (Bank)</p>
                <p className="text-lg font-bold font-display text-foreground">{matchedBankCount} / {bankEntries.length}</p>
              </CardContent>
            </Card>
            <Card className="light-card-orange">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Unmatched Bank Items</p>
                <p className="text-lg font-bold font-display text-foreground">${fmt(Math.abs(unmatchedBankTotal))}</p>
              </CardContent>
            </Card>
            <Card className="light-card-red">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Difference</p>
                <p className="text-lg font-bold font-display text-foreground">${fmt(Math.abs(bankClosingBalance - cashbookBalance))}</p>
              </CardContent>
            </Card>
          </div>

          {/* Search & Filter */}
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search transactions..." className={`${inputClass} pl-9`} />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input type="checkbox" checked={showOnlyUnmatched} onChange={e => setShowOnlyUnmatched(e.target.checked)} className="rounded" />
              Show unmatched only
            </label>
          </div>

          {/* Side by Side Tables */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Bank Statement */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText size={18} className="text-primary" /> Bank Statement
                  <span className="text-xs font-normal text-muted-foreground ml-auto">{filteredBank.length} entries</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="border-b border-border">
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Ref</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Description</th>
                        <th className="text-right px-2 py-2 font-medium text-muted-foreground">Debit</th>
                        <th className="text-right px-2 py-2 font-medium text-muted-foreground">Credit</th>
                        <th className="text-center px-2 py-2 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBank.map(e => (
                        <tr
                          key={e.id}
                          onClick={() => !e.matched && setSelectedBankEntry(e.id === selectedBankEntry ? null : e.id)}
                          className={`border-b border-border cursor-pointer transition-colors ${
                            e.matched ? 'bg-success/5' : selectedBankEntry === e.id ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'
                          } ${!e.matched ? 'text-warning' : ''}`}
                        >
                          <td className="px-2 py-2">{e.date}</td>
                          <td className="px-2 py-2 font-mono text-xs">{e.reference}</td>
                          <td className="px-2 py-2">{e.description}</td>
                          <td className="px-2 py-2 text-right">{e.debit > 0 ? fmt(e.debit) : ''}</td>
                          <td className="px-2 py-2 text-right">{e.credit > 0 ? fmt(e.credit) : ''}</td>
                          <td className="px-2 py-2 text-center">
                            {e.matched ? (
                              <span className="inline-flex items-center gap-1 text-xs text-success">
                                <CheckCircle2 size={14} /> Matched
                                <button onClick={(ev) => { ev.stopPropagation(); handleUnmatch(e.id); }} className="ml-1 text-destructive hover:text-destructive/80"><Unlink size={12} /></button>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-warning"><AlertTriangle size={14} /> Unmatched</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Cashbook */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText size={18} className="text-info" /> Cashbook Entries
                  <span className="text-xs font-normal text-muted-foreground ml-auto">{filteredCashbook.length} entries</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="border-b border-border">
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Ref</th>
                        <th className="text-left px-2 py-2 font-medium text-muted-foreground">Description</th>
                        <th className="text-right px-2 py-2 font-medium text-muted-foreground">Debit</th>
                        <th className="text-right px-2 py-2 font-medium text-muted-foreground">Credit</th>
                        <th className="text-center px-2 py-2 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCashbook.map(e => (
                        <tr
                          key={e.id}
                          onClick={() => !e.matched && setSelectedCashbookEntry(e.id === selectedCashbookEntry ? null : e.id)}
                          className={`border-b border-border cursor-pointer transition-colors ${
                            e.matched ? 'bg-success/5' : selectedCashbookEntry === e.id ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'
                          } ${!e.matched ? 'text-warning' : ''}`}
                        >
                          <td className="px-2 py-2">{e.date}</td>
                          <td className="px-2 py-2 font-mono text-xs">{e.reference}</td>
                          <td className="px-2 py-2">{e.description}</td>
                          <td className="px-2 py-2 text-right">{e.debit > 0 ? fmt(e.debit) : ''}</td>
                          <td className="px-2 py-2 text-right">{e.credit > 0 ? fmt(e.credit) : ''}</td>
                          <td className="px-2 py-2 text-center">
                            {e.matched ? (
                              <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 size={14} /> Matched</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-warning"><AlertTriangle size={14} /> Unmatched</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Complete Reconciliation */}
          <Card className="light-card-green">
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Reconciliation Status: <span className={reconStatus === 'completed' ? 'text-success' : 'text-warning'}>{reconStatus === 'completed' ? 'Completed' : 'Draft'}</span></p>
                <p className="text-sm text-muted-foreground">
                  {bankEntries.filter(e => !e.matched).length} unmatched bank items, {cashbookEntries.filter(e => !e.matched).length} unmatched cashbook items
                </p>
              </div>
              <button onClick={handleCompleteRecon} className={btnSuccess} disabled={reconStatus === 'completed'}>
                <CheckCircle2 size={16} /> {reconStatus === 'completed' ? 'Completed' : 'Complete Reconciliation'}
              </button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== RECONCILIATION STATEMENT TAB ===== */}
        <TabsContent value="statement" className="space-y-4">
          <div className="print-area">
            <ReportHeader reportTitle="Bank Reconciliation Statement" subtitle={`${bankAccounts.find(b => b.id === selectedBank)?.name} | ${dateFrom} to ${dateTo}`} />

            <Card>
              <CardContent className="pt-6 space-y-4">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="py-2 font-medium">Balance as per Bank Statement</td>
                      <td className="py-2 text-right font-bold">${fmt(bankClosingBalance)}</td>
                    </tr>
                    <tr><td colSpan={2} className="py-2 font-medium text-muted-foreground">Add: Deposits not yet credited by bank</td></tr>
                    {cashbookEntries.filter(e => !e.matched && e.debit > 0).map(e => (
                      <tr key={e.id} className="text-muted-foreground">
                        <td className="py-1 pl-6">{e.date} - {e.description}</td>
                        <td className="py-1 text-right">${fmt(e.debit)}</td>
                      </tr>
                    ))}
                    <tr className="border-b border-border">
                      <td className="py-2 font-medium pl-6">Subtotal</td>
                      <td className="py-2 text-right font-semibold">${fmt(cashbookEntries.filter(e => !e.matched && e.debit > 0).reduce((s, e) => s + e.debit, 0))}</td>
                    </tr>
                    <tr><td colSpan={2} className="py-2 font-medium text-muted-foreground">Less: Outstanding cheques / payments</td></tr>
                    {cashbookEntries.filter(e => !e.matched && e.credit > 0).map(e => (
                      <tr key={e.id} className="text-muted-foreground">
                        <td className="py-1 pl-6">{e.date} - {e.description}</td>
                        <td className="py-1 text-right">({fmt(e.credit)})</td>
                      </tr>
                    ))}
                    <tr className="border-b border-border">
                      <td className="py-2 font-medium pl-6">Subtotal</td>
                      <td className="py-2 text-right font-semibold">({fmt(cashbookEntries.filter(e => !e.matched && e.credit > 0).reduce((s, e) => s + e.credit, 0))})</td>
                    </tr>
                    <tr><td colSpan={2} className="py-2 font-medium text-muted-foreground">Add/Less: Bank items not in cashbook</td></tr>
                    {bankEntries.filter(e => !e.matched).map(e => (
                      <tr key={e.id} className="text-muted-foreground">
                        <td className="py-1 pl-6">{e.date} - {e.description} ({e.reference})</td>
                        <td className="py-1 text-right">{e.credit > 0 ? `$${fmt(e.credit)}` : `($${fmt(e.debit)})`}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-primary bg-muted">
                      <td className="py-3 font-bold text-foreground">Adjusted Bank Balance</td>
                      <td className="py-3 text-right font-bold text-foreground text-lg">${fmt(bankClosingBalance + unmatchedCashbookTotal + unmatchedBankTotal)}</td>
                    </tr>
                    <tr className="bg-muted">
                      <td className="py-3 font-bold text-foreground">Cashbook Balance</td>
                      <td className="py-3 text-right font-bold text-foreground text-lg">${fmt(cashbookBalance)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== HISTORY TAB ===== */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reconciliation History & Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Bank Account</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Period</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Bank Bal</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Cashbook Bal</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Reconciled By</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Approved By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconRecords.map(r => (
                      <tr key={r.id} className="border-b border-border hover:bg-muted/50">
                        <td className="px-3 py-2">{r.date}</td>
                        <td className="px-3 py-2">{r.bankAccount}</td>
                        <td className="px-3 py-2">{r.periodFrom} to {r.periodTo}</td>
                        <td className="px-3 py-2 text-right">${fmt(r.bankBalance)}</td>
                        <td className="px-3 py-2 text-right">${fmt(r.cashbookBalance)}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'Approved' ? 'bg-success/10 text-success' : r.status === 'Completed' ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'}`}>{r.status}</span>
                        </td>
                        <td className="px-3 py-2">{r.reconciledBy}</td>
                        <td className="px-3 py-2">{r.approvedBy || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DollarSignIcon() {
  return <span className="text-lg font-bold">$</span>;
}
