import React, { useState } from 'react';
import { transactions } from '@/lib/dummy-data';
import { Plus, Download } from 'lucide-react';

export default function Journals() {
  const [showForm, setShowForm] = useState(false);

  const journals = transactions.filter(t => t.reference.startsWith('JNL'));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Journals</h1>
          <p className="text-sm text-muted-foreground">Journal entries for accounting adjustments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
            <Plus size={18} /> New Journal
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
          <h3 className="font-display font-semibold text-card-foreground">New Journal Entry</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-foreground mb-1">Date</label><input type="date" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
            <div><label className="block text-sm font-medium text-foreground mb-1">Reference</label><input type="text" placeholder="JNL-002" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
            <div><label className="block text-sm font-medium text-foreground mb-1">Description</label><input type="text" placeholder="Journal description" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label className="block text-sm font-medium text-foreground mb-1">Account Code</label><input type="text" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
            <div><label className="block text-sm font-medium text-foreground mb-1">Debit</label><input type="number" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
            <div><label className="block text-sm font-medium text-foreground mb-1">Credit</label><input type="number" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
            <div className="flex items-end"><button className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">Add Line</button></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-input text-foreground text-sm">Cancel</button>
            <button className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">Post Journal</button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reference</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Debit</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Credit</th>
              </tr>
            </thead>
            <tbody>
              {journals.map(t => (
                <tr key={t.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-foreground">{t.date}</td>
                  <td className="px-4 py-3 font-mono text-xs text-primary">{t.reference}</td>
                  <td className="px-4 py-3 text-foreground">{t.description}</td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{t.accountCode}</td>
                  <td className="px-4 py-3 text-right text-foreground">{t.debit > 0 ? `$${t.debit.toLocaleString()}` : '-'}</td>
                  <td className="px-4 py-3 text-right text-foreground">{t.credit > 0 ? `$${t.credit.toLocaleString()}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
