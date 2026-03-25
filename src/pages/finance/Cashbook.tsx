import React from 'react';
import { transactions } from '@/lib/dummy-data';
import { Download } from 'lucide-react';

export default function Cashbook() {
  const cashTxns = transactions.filter(t => t.accountCode === '1000' || t.accountCode === '1100');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Cashbook</h1>
          <p className="text-sm text-muted-foreground">All cash and bank transactions</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors">
          <Download size={18} /> Print
        </button>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reference</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Debit</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Credit</th>
              </tr>
            </thead>
            <tbody>
              {cashTxns.map(t => (
                <tr key={t.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-foreground">{t.date}</td>
                  <td className="px-4 py-3 font-mono text-xs text-primary">{t.reference}</td>
                  <td className="px-4 py-3 text-foreground">{t.description}</td>
                  <td className="px-4 py-3 text-right text-foreground">{t.debit > 0 ? `$${t.debit.toLocaleString()}` : '-'}</td>
                  <td className="px-4 py-3 text-right text-foreground">{t.credit > 0 ? `$${t.credit.toLocaleString()}` : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted font-semibold">
                <td colSpan={3} className="px-4 py-3 text-foreground">Totals</td>
                <td className="px-4 py-3 text-right text-foreground">${cashTxns.reduce((s, t) => s + t.debit, 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-foreground">${cashTxns.reduce((s, t) => s + t.credit, 0).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
