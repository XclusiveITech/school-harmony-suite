import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { CheckCircle2, Link2, Unlink, Printer, Download, Search, AlertTriangle, FileText, ArrowRightLeft } from 'lucide-react';
import {
  listBankStatementLines, matchBankStatementLine, autoMatchBankStatementLines,
  listCashbookEntries, listLedgerAccounts, num,
  type BankStatementLine, type CashbookEntry, type LedgerGLAccount,
} from '@/lib/ledger-api';

export default function BankReconciliation() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [bankLines, setBankLines] = useState<BankStatementLine[]>([]);
  const [cashbookEntries, setCashbookEntries] = useState<CashbookEntry[]>([]);
  const [accounts, setAccounts] = useState<LedgerGLAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);
  const [selectedBankLine, setSelectedBankLine] = useState<number | null>(null);
  const [selectedCashbookEntry, setSelectedCashbookEntry] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyUnmatched, setShowOnlyUnmatched] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bl, cb, accs] = await Promise.all([
        listBankStatementLines(), listCashbookEntries(), listLedgerAccounts(),
      ]);
      setBankLines(bl);
      setCashbookEntries(cb.filter(e => e.status === 'Processed'));
      setAccounts(accs);
    } catch (e: any) {
      setError(e?.message || 'Could not load bank reconciliation data from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const bankAccounts = useMemo(
    () => accounts.filter(a => /bank|cash|petty|mobile/i.test(a.type || a.name || '')),
    [accounts],
  );

  const scopedCashbook = useMemo(
    () => selectedBank ? cashbookEntries.filter(e => String(e.account) === selectedBank) : cashbookEntries,
    [cashbookEntries, selectedBank],
  );

  const cashbookBalance = useMemo(
    () => scopedCashbook.reduce((sum, e) => sum + (e.type === 'Receipt' ? num(e.amount) : -num(e.amount)), 0),
    [scopedCashbook],
  );

  const matchedBankCount = bankLines.filter(e => e.matched_entry).length;
  const unmatchedBankTotal = bankLines.filter(e => !e.matched_entry).reduce((s, e) => s + num(e.amount), 0);
  const bankClosingBalance = bankLines.reduce((s, e) => s + num(e.amount), 0);

  const cashbookMatchedIds = new Set(bankLines.filter(b => b.matched_entry).map(b => b.matched_entry));

  // Client-side auto-match preview (amount equal, +/-3 days), persisted via backend action.
  const handleAutoMatch = async () => {
    setMatching(true);
    try {
      await autoMatchBankStatementLines();
      toast.success('Auto-match complete');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not auto-match bank lines.');
    } finally {
      setMatching(false);
    }
  };

  const handleManualMatch = async () => {
    if (!selectedBankLine || !selectedCashbookEntry) return;
    setMatching(true);
    try {
      await matchBankStatementLine(selectedBankLine, selectedCashbookEntry);
      toast.success('Entries matched');
      setSelectedBankLine(null);
      setSelectedCashbookEntry(null);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not match the selected entries.');
    } finally {
      setMatching(false);
    }
  };

  const handleUnmatch = async (bankId: number) => {
    setMatching(true);
    try {
      await matchBankStatementLine(bankId, null);
      toast.success('Entries unmatched');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not unmatch the entries.');
    } finally {
      setMatching(false);
    }
  };

  const filteredBank = bankLines.filter(e => {
    if (showOnlyUnmatched && e.matched_entry) return false;
    if (searchTerm && !e.description.toLowerCase().includes(searchTerm.toLowerCase()) && !(e.reference || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredCashbook = scopedCashbook.filter(e => {
    const matched = cashbookMatchedIds.has(e.id);
    if (showOnlyUnmatched && matched) return false;
    if (searchTerm && !(e.description || '').toLowerCase().includes(searchTerm.toLowerCase()) && !(e.reference || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const cashbookLabel = (e: CashbookEntry) => e.description || e.counterparty || e.type;

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const inputClass = "w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const selectClass = "px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const btnPrimary = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-60";
  const btnOutline = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors";
  const btnSuccess = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-success text-white font-medium text-sm hover:bg-success/90 transition-colors disabled:opacity-60";
  const btnWarning = "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-warning text-white font-medium text-sm hover:bg-warning/90 transition-colors disabled:opacity-60";

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

      {(loading || error) && (
        <div className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between ${error ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
          <span>{error || 'Loading bank reconciliation…'}</span>
          {error && <button onClick={load} className="underline font-medium">Retry</button>}
        </div>
      )}

      <Tabs defaultValue="reconcile">
        <TabsList>
          <TabsTrigger value="reconcile">Reconciliation</TabsTrigger>
          <TabsTrigger value="statement">Reconciliation Statement</TabsTrigger>
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
                    <option value="">All accounts</option>
                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}
                  </select>
                </div>
                <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
                <button disabled={matching} onClick={handleAutoMatch} className={btnSuccess}>
                  <Link2 size={16} /> Auto-Match
                </button>
                {selectedBankLine && selectedCashbookEntry && (
                  <button disabled={matching} onClick={handleManualMatch} className={btnWarning}>
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
                <p className="text-lg font-bold font-display text-foreground">{matchedBankCount} / {bankLines.length}</p>
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
                        <th className="text-right px-2 py-2 font-medium text-muted-foreground">Amount</th>
                        <th className="text-center px-2 py-2 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBank.map(e => (
                        <tr
                          key={e.id}
                          onClick={() => !e.matched_entry && setSelectedBankLine(e.id === selectedBankLine ? null : e.id)}
                          className={`border-b border-border cursor-pointer transition-colors ${
                            e.matched_entry ? 'bg-success/5' : selectedBankLine === e.id ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'
                          } ${!e.matched_entry ? 'text-warning' : ''}`}
                        >
                          <td className="px-2 py-2">{e.date}</td>
                          <td className="px-2 py-2 font-mono text-xs">{e.reference}</td>
                          <td className="px-2 py-2">{e.description}</td>
                          <td className="px-2 py-2 text-right">{fmt(num(e.amount))}</td>
                          <td className="px-2 py-2 text-center">
                            {e.matched_entry ? (
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
                      {!loading && filteredBank.length === 0 && (
                        <tr><td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">No bank statement lines yet.</td></tr>
                      )}
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
                        <th className="text-right px-2 py-2 font-medium text-muted-foreground">Amount</th>
                        <th className="text-center px-2 py-2 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCashbook.map(e => {
                        const matched = cashbookMatchedIds.has(e.id);
                        return (
                          <tr
                            key={e.id}
                            onClick={() => !matched && setSelectedCashbookEntry(e.id === selectedCashbookEntry ? null : e.id)}
                            className={`border-b border-border cursor-pointer transition-colors ${
                              matched ? 'bg-success/5' : selectedCashbookEntry === e.id ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'
                            } ${!matched ? 'text-warning' : ''}`}
                          >
                            <td className="px-2 py-2">{e.date}</td>
                            <td className="px-2 py-2 font-mono text-xs">{e.reference}</td>
                            <td className="px-2 py-2">{cashbookLabel(e)}</td>
                            <td className="px-2 py-2 text-right">{fmt(e.type === 'Receipt' ? num(e.amount) : -num(e.amount))}</td>
                            <td className="px-2 py-2 text-center">
                              {matched ? (
                                <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 size={14} /> Matched</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-warning"><AlertTriangle size={14} /> Unmatched</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {!loading && filteredCashbook.length === 0 && (
                        <tr><td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">No cashbook entries yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status summary */}
          <Card className="light-card-green">
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">
                  Reconciliation Status: <span className={bankLines.every(e => e.matched_entry) && bankLines.length > 0 ? 'text-success' : 'text-warning'}>
                    {bankLines.length > 0 && bankLines.every(e => e.matched_entry) ? 'Fully Matched' : 'In Progress'}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {bankLines.filter(e => !e.matched_entry).length} unmatched bank items
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== RECONCILIATION STATEMENT TAB ===== */}
        <TabsContent value="statement" className="space-y-4">
          <div className="print-area">
            <ReportHeader reportTitle="Bank Reconciliation Statement" subtitle={`${bankAccounts.find(b => String(b.id) === selectedBank)?.name || 'All accounts'} | ${dateFrom || '...'} to ${dateTo || '...'}`} />

            <Card>
              <CardContent className="pt-6 space-y-4">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="py-2 font-medium">Balance as per Bank Statement</td>
                      <td className="py-2 text-right font-bold">${fmt(bankClosingBalance)}</td>
                    </tr>
                    <tr><td colSpan={2} className="py-2 font-medium text-muted-foreground">Unmatched cashbook entries</td></tr>
                    {scopedCashbook.filter(e => !cashbookMatchedIds.has(e.id)).map(e => (
                      <tr key={e.id} className="text-muted-foreground">
                        <td className="py-1 pl-6">{e.date} - {cashbookLabel(e)}</td>
                        <td className="py-1 text-right">${fmt(e.type === 'Receipt' ? num(e.amount) : -num(e.amount))}</td>
                      </tr>
                    ))}
                    <tr><td colSpan={2} className="py-2 font-medium text-muted-foreground">Unmatched bank items</td></tr>
                    {bankLines.filter(e => !e.matched_entry).map(e => (
                      <tr key={e.id} className="text-muted-foreground">
                        <td className="py-1 pl-6">{e.date} - {e.description} ({e.reference})</td>
                        <td className="py-1 text-right">${fmt(num(e.amount))}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-primary bg-muted">
                      <td className="py-3 font-bold text-foreground">Adjusted Bank Balance</td>
                      <td className="py-3 text-right font-bold text-foreground text-lg">${fmt(bankClosingBalance)}</td>
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
      </Tabs>
    </div>
  );
}
