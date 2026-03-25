import React from 'react';
import { glAccounts, transactions } from '@/lib/dummy-data';
import { Search, Download, Filter } from 'lucide-react';

export default function GeneralLedger() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">General Ledger</h1>
          <p className="text-sm text-muted-foreground">Chart of accounts and balances</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors">
          <Download size={18} /> Export
        </button>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
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
              {glAccounts.map(acc => (
                <tr key={acc.code} className="border-b border-border hover:bg-muted/50 transition-colors">
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
                  <td className={`px-4 py-3 text-right font-medium ${acc.balance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                    ${Math.abs(acc.balance).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
