import React, { useState } from 'react';
import { glAccounts } from '@/lib/dummy-data';
import { Printer } from 'lucide-react';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { Card, CardContent } from '@/components/ui/card';

export default function BalanceSheet() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const assets = glAccounts.filter(a => a.type === 'Asset');
  const liabilities = glAccounts.filter(a => a.type === 'Liability');
  const equity = glAccounts.filter(a => a.type === 'Equity');

  const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
  const totalEquity = equity.reduce((s, a) => s + a.balance, 0);

  const subtitle = dateTo ? `As at ${dateTo}` : `As at ${new Date().toLocaleDateString()}`;

  const Section = ({ title, accounts, total }: { title: string; accounts: typeof glAccounts; total: number }) => (
    <div className="mb-6">
      <h3 className="font-display font-semibold text-card-foreground mb-3 text-base">{title}</h3>
      {accounts.map(acc => (
        <div key={acc.code} className="flex justify-between py-1.5 px-2 text-sm hover:bg-muted/50 rounded">
          <span className="text-foreground">{acc.name}</span>
          <span className={`font-medium ${acc.balance < 0 ? 'text-destructive' : 'text-foreground'}`}>${Math.abs(acc.balance).toLocaleString()}</span>
        </div>
      ))}
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

      <div className="bg-card rounded-xl p-6 shadow-card max-w-2xl">
        <ReportHeader reportTitle="Balance Sheet" subtitle={subtitle} />
        <Section title="Assets" accounts={assets} total={totalAssets} />
        <Section title="Liabilities" accounts={liabilities} total={totalLiabilities} />
        <Section title="Equity" accounts={equity} total={totalEquity} />

        <div className="flex justify-between py-3 px-2 border-t-2 border-primary font-bold text-base mt-4">
          <span className="text-foreground">Total Liabilities & Equity</span>
          <span className="text-primary">${(totalLiabilities + totalEquity).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
