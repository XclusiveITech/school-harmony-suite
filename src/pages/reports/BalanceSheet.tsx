import React, { useEffect, useState, useCallback } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { Card, CardContent } from '@/components/ui/card';
import { getBalanceSheet, BalanceSheetReport, BalanceSheetLine } from '@/lib/reports-api';

const emptyReport: BalanceSheetReport = { assets: [], liabilities: [], equity: [] };

export default function BalanceSheet() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [report, setReport] = useState<BalanceSheetReport>(emptyReport);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBalanceSheet({ dateFrom, dateTo });
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load balance sheet');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const totalAssets = report.assets.reduce((s, a) => s + a.amount, 0);
  const totalLiabilities = report.liabilities.reduce((s, a) => s + a.amount, 0);
  const totalEquity = report.equity.reduce((s, a) => s + a.amount, 0);

  const subtitle = dateTo ? `As at ${dateTo}` : `As at ${new Date().toLocaleDateString()}`;

  const Section = ({ title, accounts, total }: { title: string; accounts: BalanceSheetLine[]; total: number }) => (
    <div className="mb-6">
      <h3 className="font-display font-semibold text-card-foreground mb-3 text-base">{title}</h3>
      {accounts.map(acc => (
        <div key={acc.code} className="flex justify-between py-1.5 px-2 text-sm hover:bg-muted/50 rounded">
          <span className="text-foreground">{acc.name}</span>
          <span className={`font-medium ${acc.amount < 0 ? 'text-destructive' : 'text-foreground'}`}>${Math.abs(acc.amount).toLocaleString()}</span>
        </div>
      ))}
      {accounts.length === 0 && (
        <div className="py-1.5 px-2 text-sm text-muted-foreground">No {title.toLowerCase()} recorded.</div>
      )}
      <div className="flex justify-between py-2 px-2 mt-1 border-t border-border font-semibold text-sm">
        <span className="text-foreground">Total {title}</span>
        <span className="text-foreground">${Math.abs(total).toLocaleString()}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Balance Sheet</h1>
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
        <ReportHeader reportTitle="Balance Sheet" subtitle={subtitle} />
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading balance sheet…</div>
        ) : (
          <>
            <Section title="Assets" accounts={report.assets} total={totalAssets} />
            <Section title="Liabilities" accounts={report.liabilities} total={totalLiabilities} />
            <Section title="Equity" accounts={report.equity} total={totalEquity} />

            <div className="flex justify-between py-3 px-2 border-t-2 border-primary font-bold text-base mt-4">
              <span className="text-foreground">Total Liabilities & Equity</span>
              <span className="text-primary">${(totalLiabilities + totalEquity).toLocaleString()}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
