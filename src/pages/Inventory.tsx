import React from 'react';
import { inventory } from '@/lib/dummy-data';
import { Plus, AlertTriangle, Warehouse } from 'lucide-react';

export default function Inventory() {
  const lowStock = inventory.filter(i => i.quantity <= i.reorderLevel);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-sm text-muted-foreground">{inventory.length} items in stock</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
          <Plus size={18} /> Add Item
        </button>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-warning mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Low Stock Alert</p>
            <p className="text-xs text-muted-foreground">{lowStock.map(i => i.name).join(', ')} are below reorder level</p>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Item Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Warehouse</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Quantity</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Unit Cost ($)</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total Value ($)</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Reorder Level</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map(item => (
              <tr key={item.id} className="border-b border-border hover:bg-muted/50">
                <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                <td className="px-4 py-3 text-muted-foreground flex items-center gap-1.5"><Warehouse size={14} /> {item.warehouse}</td>
                <td className={`px-4 py-3 text-right font-medium ${item.quantity <= item.reorderLevel ? 'text-destructive' : 'text-foreground'}`}>{item.quantity}</td>
                <td className="px-4 py-3 text-right text-foreground">${item.unitCost.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-medium text-foreground">${(item.quantity * item.unitCost).toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{item.reorderLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
