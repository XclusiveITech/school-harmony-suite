import React, { useEffect, useState, useCallback } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { Card, CardContent } from '@/components/ui/card';
import { getTrialBalance, TrialBalanceRow } from '@/lib/reports-api';

export default function TrialBalance() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTrialBalance({ dateFrom, dateTo });
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trial balance');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const totalDebit = rows.reduce((s, a) => s + a.debit, 0);
  const totalCredit = rows.reduce((s, a) => s + a.credit, 0);

  const subtitle = dateFrom || dateTo
    ? `${dateFrom ? `From ${dateFrom}` : ''}${dateFrom && dateTo ? ' ' : ''}${dateTo ? `To ${dateTo}` : ''}`
    : `As at ${new Date().toLocaleDateString()}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Trial Balance</h1>
          <p className="text-sm text-muted-foreground">As at {new Date().toLocaleDateString()}</p>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors">
          <Printer size={18} /> Print
        </button>
      </div>

      <Card className="light-card-blue print:hidden">
        <CardContent className="pt-4">
          <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 flex items-center justify-between print:hidden">
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={load} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-sm hover:bg-destructive/10">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="p-6">
          <ReportHeader reportTitle="Trial Balance" subtitle={subtitle} />
        </div>
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading trial balance…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account Name</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Debit ($)</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Credit ($)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(acc => (
                  <tr key={acc.code} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{acc.code}</td>
                    <td className="px-4 py-3 text-foreground">{acc.name}</td>
                    <td className="px-4 py-3 text-right text-foreground">{acc.debit ? acc.debit.toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-right text-foreground">{acc.credit ? acc.credit.toLocaleString() : '-'}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No account activity for the selected period.</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-muted font-bold">
                  <td colSpan={2} className="px-4 py-3 text-foreground">Totals</td>
                  <td className="px-4 py-3 text-right text-foreground">${totalDebit.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-foreground">${totalCredit.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
