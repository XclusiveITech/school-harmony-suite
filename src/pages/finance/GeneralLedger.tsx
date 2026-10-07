import React, { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { Card, CardContent } from '@/components/ui/card';
import { listLedgerAccounts, num, type LedgerGLAccount } from '@/lib/ledger-api';

export default function GeneralLedger() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [accounts, setAccounts] = useState<LedgerGLAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setAccounts(await listLedgerAccounts());
    } catch (e: any) {
      setError(e?.message || 'Could not load the general ledger from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">General Ledger</h1>
          <p className="text-sm text-muted-foreground">Chart of accounts and balances</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors">
            <Download size={18} /> Export
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors">
            <Printer size={18} /> Print
          </button>
        </div>
      </div>

      {(loading || error) && (
        <div className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between print:hidden ${error ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
          <span>{error || 'Loading general ledger…'}</span>
          {error && <button onClick={load} className="underline font-medium">Retry</button>}
        </div>
      )}

      <Card className="light-card-blue print:hidden">
        <CardContent className="pt-4">
          <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
        </CardContent>
      </Card>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="p-6">
          <ReportHeader reportTitle="General Ledger" subtitle={dateFrom || dateTo ? `${dateFrom || '...'} to ${dateTo || '...'}` : `As at ${new Date().toLocaleDateString()}`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account Code</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => {
                const bal = num(acc.balance);
                return (
                  <tr key={acc.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{acc.code}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{acc.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        acc.type === 'Asset' ? 'bg-primary/10 text-primary' :
                        acc.type === 'Liability' ? 'bg-warning/10 text-warning' :
                        acc.type === 'Equity' ? 'bg-info/10 text-info' :
                        acc.type === 'Revenue' ? 'bg-success/10 text-success' :
                        'bg-destructive/10 text-destructive'
                      }`}>{acc.type}</span>
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${bal < 0 ? 'text-destructive' : 'text-foreground'}`}>
                      ${Math.abs(bal).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {!loading && accounts.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No GL accounts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
