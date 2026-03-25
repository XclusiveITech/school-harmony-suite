import React from 'react';
import { staff } from '@/lib/dummy-data';
import { Download, Printer, DollarSign } from 'lucide-react';

export default function Payroll() {
  const activeStaff = staff.filter(s => s.status === 'Active');
  const totalSalaries = activeStaff.reduce((s, st) => s + st.salary, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Payroll</h1>
          <p className="text-sm text-muted-foreground">March 2026 payroll</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
            <DollarSign size={18} /> Generate Payslips
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors">
            <Printer size={18} /> Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Total Gross Salary</p>
          <p className="text-2xl font-display font-bold text-card-foreground mt-1">${totalSalaries.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Deductions</p>
          <p className="text-2xl font-display font-bold text-destructive mt-1">${(totalSalaries * 0.12).toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Net Pay</p>
          <p className="text-2xl font-display font-bold text-success mt-1">${(totalSalaries * 0.88).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Basic Salary</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tax (8%)</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Pension (4%)</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net Pay</th>
            </tr>
          </thead>
          <tbody>
            {activeStaff.map(s => {
              const tax = s.salary * 0.08;
              const pension = s.salary * 0.04;
              const net = s.salary - tax - pension;
              return (
                <tr key={s.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-foreground">{s.firstName} {s.lastName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.department}</td>
                  <td className="px-4 py-3 text-right text-foreground">${s.salary.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-destructive">${tax.toFixed(0)}</td>
                  <td className="px-4 py-3 text-right text-destructive">${pension.toFixed(0)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">${net.toFixed(0)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted font-bold">
              <td colSpan={2} className="px-4 py-3 text-foreground">Totals</td>
              <td className="px-4 py-3 text-right text-foreground">${totalSalaries.toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-destructive">${(totalSalaries * 0.08).toFixed(0)}</td>
              <td className="px-4 py-3 text-right text-destructive">${(totalSalaries * 0.04).toFixed(0)}</td>
              <td className="px-4 py-3 text-right text-foreground">${(totalSalaries * 0.88).toFixed(0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
