import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { Card, CardContent } from '@/components/ui/card';
import { getFeesBalances, FeesBalanceRow } from '@/lib/reports-api';

export default function FeesBalances() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rows, setRows] = useState<FeesBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFeesBalances({ dateFrom, dateTo });
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load fees balances');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const withBalances = useMemo(() => rows.filter(r => r.balance > 0), [rows]);
  const total = withBalances.reduce((s, st) => s + st.balance, 0);

  const subtitle = dateFrom || dateTo
    ? `${dateFrom ? `From ${dateFrom}` : ''}${dateFrom && dateTo ? ' ' : ''}${dateTo ? `To ${dateTo}` : ''}`
    : `As at ${new Date().toLocaleDateString()}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Outstanding Fees Balances</h1>
          <p className="text-sm text-muted-foreground">{withBalances.length} students with outstanding balances</p>
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
          <ReportHeader reportTitle="Outstanding Fees Balances" subtitle={subtitle} />
        </div>
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading fees balances…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reg No.</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Class</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance ($)</th>
              </tr>
            </thead>
            <tbody>
              {withBalances.map(s => (
                <tr key={s.student} className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{s.student_no}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.class_name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-destructive">${s.balance.toLocaleString()}</td>
                </tr>
              ))}
              {withBalances.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No outstanding balances found.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-muted font-bold">
                <td colSpan={3} className="px-4 py-3 text-foreground">Grand Total</td>
                <td className="px-4 py-3 text-right text-destructive">${total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
