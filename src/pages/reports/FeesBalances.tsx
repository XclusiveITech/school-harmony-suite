import React from 'react';
import { students } from '@/lib/dummy-data';
import { Printer } from 'lucide-react';

export default function FeesBalances() {
  const withBalances = students.filter(s => s.feesBalance > 0);
  const total = withBalances.reduce((s, st) => s + st.feesBalance, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Outstanding Fees Balances</h1>
          <p className="text-sm text-muted-foreground">{withBalances.length} students with outstanding balances</p>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors">
          <Printer size={18} /> Print
        </button>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reg No.</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Level</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Class</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance ($)</th>
            </tr>
          </thead>
          <tbody>
            {withBalances.map(s => (
              <tr key={s.id} className="border-b border-border hover:bg-muted/50">
                <td className="px-4 py-3 font-mono text-xs text-foreground">{s.regNumber}</td>
                <td className="px-4 py-3 font-medium text-foreground">{s.firstName} {s.lastName}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.level}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.className}</td>
                <td className="px-4 py-3 text-right font-semibold text-destructive">${s.feesBalance.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted font-bold">
              <td colSpan={4} className="px-4 py-3 text-foreground">Grand Total</td>
              <td className="px-4 py-3 text-right text-destructive">${total.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
