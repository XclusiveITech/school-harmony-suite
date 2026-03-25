import React from 'react';
import { assets } from '@/lib/dummy-data';
import { Plus, Download } from 'lucide-react';

export default function Assets() {
  const totalCost = assets.reduce((s, a) => s + a.cost, 0);
  const totalCurrent = assets.reduce((s, a) => s + a.currentValue, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Asset Management</h1>
          <p className="text-sm text-muted-foreground">{assets.length} registered assets</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
          <Plus size={18} /> Register Asset
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <p className="text-2xl font-display font-bold text-card-foreground mt-1">${totalCost.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Current Book Value</p>
          <p className="text-2xl font-display font-bold text-success mt-1">${totalCurrent.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Accumulated Depreciation</p>
          <p className="text-2xl font-display font-bold text-warning mt-1">${(totalCost - totalCurrent).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Asset Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Purchase Date</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Cost ($)</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Depr. Rate</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Book Value ($)</th>
            </tr>
          </thead>
          <tbody>
            {assets.map(a => (
              <tr key={a.id} className="border-b border-border hover:bg-muted/50">
                <td className="px-4 py-3 font-medium text-foreground">{a.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.category}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.location}</td>
                <td className="px-4 py-3 text-foreground">{a.purchaseDate}</td>
                <td className="px-4 py-3 text-right text-foreground">${a.cost.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-foreground">{a.depreciationRate}%</td>
                <td className="px-4 py-3 text-right font-semibold text-foreground">${a.currentValue.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
