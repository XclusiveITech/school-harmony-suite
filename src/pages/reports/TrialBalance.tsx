import React, { useState } from 'react';
import { glAccounts } from '@/lib/dummy-data';
import { Printer } from 'lucide-react';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { Card, CardContent } from '@/components/ui/card';

export default function TrialBalance() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const totalDebit = glAccounts.reduce((s, a) => {
    if ((a.type === 'Asset' && a.balance > 0) || a.type === 'Expense') return s + Math.abs(a.balance);
    return s;
  }, 0);

  const totalCredit = glAccounts.reduce((s, a) => {
    if (a.type === 'Liability' || a.type === 'Equity' || a.type === 'Revenue' || (a.type === 'Asset' && a.balance < 0)) return s + Math.abs(a.balance);
    return s;
  }, 0);

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

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="p-6">
          <ReportHeader reportTitle="Trial Balance" subtitle={subtitle} />
        </div>
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
              {glAccounts.map(acc => {
                const isDebit = (acc.type === 'Asset' && acc.balance > 0) || acc.type === 'Expense';
                const isCredit = acc.type === 'Liability' || acc.type === 'Equity' || acc.type === 'Revenue' || (acc.type === 'Asset' && acc.balance < 0);
                return (
                  <tr key={acc.code} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{acc.code}</td>
                    <td className="px-4 py-3 text-foreground">{acc.name}</td>
                    <td className="px-4 py-3 text-right text-foreground">{isDebit ? Math.abs(acc.balance).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-right text-foreground">{isCredit ? Math.abs(acc.balance).toLocaleString() : '-'}</td>
                  </tr>
                );
              })}
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
      </div>
    </div>
  );
}
