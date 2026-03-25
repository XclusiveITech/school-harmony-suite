import React from 'react';
import { glAccounts } from '@/lib/dummy-data';
import { Printer } from 'lucide-react';

export default function IncomeStatement() {
  const revenue = glAccounts.filter(a => a.type === 'Revenue');
  const expenses = glAccounts.filter(a => a.type === 'Expense');
  const totalRevenue = revenue.reduce((s, a) => s + a.balance, 0);
  const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0);
  const netIncome = totalRevenue - totalExpenses;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Income Statement</h1>
          <p className="text-sm text-muted-foreground">For the period ending March 25, 2026</p>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors">
          <Printer size={18} /> Print
        </button>
      </div>

      <div className="bg-card rounded-xl p-6 shadow-card max-w-2xl">
        <div className="text-center mb-6">
          <h2 className="font-display text-lg font-bold text-card-foreground">Brainstar School</h2>
          <p className="text-sm text-muted-foreground">Income Statement for Period Ending March 25, 2026</p>
        </div>

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
