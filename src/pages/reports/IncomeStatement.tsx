import React, { useEffect, useState, useCallback } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { Card, CardContent } from '@/components/ui/card';
import { getIncomeStatement, IncomeStatementReport } from '@/lib/reports-api';

const emptyReport: IncomeStatementReport = { revenue: [], expenses: [], net: 0 };

export default function IncomeStatement() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [report, setReport] = useState<IncomeStatementReport>(emptyReport);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIncomeStatement({ dateFrom, dateTo });
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load income statement');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const totalRevenue = report.revenue.reduce((s, a) => s + a.amount, 0);
  const totalExpenses = report.expenses.reduce((s, a) => s + a.amount, 0);
  const netIncome = report.net || (totalRevenue - totalExpenses);

  const subtitle = dateFrom || dateTo
    ? `For the period ${dateFrom || '...'} to ${dateTo || '...'}`
    : `For the period ending ${new Date().toLocaleDateString()}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Income Statement</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
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

      <div className="bg-card rounded-xl p-6 shadow-card max-w-2xl">
        <ReportHeader reportTitle="Income Statement" subtitle={subtitle} />

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading income statement…</div>
        ) : (
          <>
            <h3 className="font-display font-semibold text-card-foreground mb-3">Revenue</h3>
            {report.revenue.map(acc => (
              <div key={acc.code} className="flex justify-between py-1.5 px-2 text-sm hover:bg-muted/50 rounded">
                <span className="text-foreground">{acc.name}</span>
                <span className="font-medium text-foreground">${acc.amount.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 px-2 mt-1 border-t border-border font-semibold text-sm">
              <span className="text-foreground">Total Revenue</span>
              <span className="text-success">${totalRevenue.toLocaleString()}</span>
            </div>

            <h3 className="font-display font-semibold text-card-foreground mb-3 mt-6">Expenses</h3>
            {report.expenses.map(acc => (
              <div key={acc.code} className="flex justify-between py-1.5 px-2 text-sm hover:bg-muted/50 rounded">
                <span className="text-foreground">{acc.name}</span>
                <span className="font-medium text-foreground">${acc.amount.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 px-2 mt-1 border-t border-border font-semibold text-sm">
              <span className="text-foreground">Total Expenses</span>
              <span className="text-destructive">${totalExpenses.toLocaleString()}</span>
            </div>

            <div className="flex justify-between py-3 px-2 border-t-2 border-primary font-bold text-base mt-6">
              <span className="text-foreground">Net Income</span>
              <span className={netIncome >= 0 ? 'text-success' : 'text-destructive'}>${netIncome.toLocaleString()}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
