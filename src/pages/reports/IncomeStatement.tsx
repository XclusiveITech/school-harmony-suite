import React, { useState } from 'react';
import { glAccounts } from '@/lib/dummy-data';
import { Printer } from 'lucide-react';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { Card, CardContent } from '@/components/ui/card';

export default function IncomeStatement() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const revenue = glAccounts.filter(a => a.type === 'Revenue');
  const expenses = glAccounts.filter(a => a.type === 'Expense');
  const totalRevenue = revenue.reduce((s, a) => s + a.balance, 0);
  const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0);
  const netIncome = totalRevenue - totalExpenses;

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

      <div className="bg-card rounded-xl p-6 shadow-card max-w-2xl">
        <ReportHeader reportTitle="Income Statement" subtitle={subtitle} />

        <h3 className="font-display font-semibold text-card-foreground mb-3">Revenue</h3>
        {revenue.map(acc => (
          <div key={acc.code} className="flex justify-between py-1.5 px-2 text-sm hover:bg-muted/50 rounded">
            <span className="text-foreground">{acc.name}</span>
            <span className="font-medium text-foreground">${acc.balance.toLocaleString()}</span>
          </div>
        ))}
        <div className="flex justify-between py-2 px-2 mt-1 border-t border-border font-semibold text-sm">
          <span className="text-foreground">Total Revenue</span>
          <span className="text-success">${totalRevenue.toLocaleString()}</span>
        </div>

        <h3 className="font-display font-semibold text-card-foreground mb-3 mt-6">Expenses</h3>
        {expenses.map(acc => (
          <div key={acc.code} className="flex justify-between py-1.5 px-2 text-sm hover:bg-muted/50 rounded">
            <span className="text-foreground">{acc.name}</span>
            <span className="font-medium text-foreground">${acc.balance.toLocaleString()}</span>
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
      </div>
    </div>
  );
}
