import React, { useState } from 'react';
import { staff, leaveRequests, leaveAllocations } from '@/lib/dummy-data';
import { Printer, DollarSign, AlertTriangle, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function Payroll() {
  const [showPayslip, setShowPayslip] = useState<string | null>(null);
  const activeStaff = staff.filter(s => s.status === 'Active' || s.status === 'On Leave');

  const dailyRate = (salary: number) => salary / 22;

  const getLeaveDeductions = (staffId: string) => {
    const approvedReqs = leaveRequests.filter(r => r.staffId === staffId && r.status === 'Approved');
    const unpaidDays = approvedReqs.filter(r => !r.paid).reduce((sum, r) => sum + r.days, 0);

    // Check if paid leave exceeds allocation
    const alloc = leaveAllocations.find(a => a.staffId === staffId);
    let excessDays = 0;
    if (alloc) {
      const totalAlloc = alloc.annual + alloc.sick + alloc.personal + alloc.compassionate;
      const totalUsed = alloc.annualUsed + alloc.sickUsed + alloc.personalUsed + alloc.compassionateUsed;
      if (totalUsed > totalAlloc) excessDays = totalUsed - totalAlloc;
    }

    const paidDays = approvedReqs.filter(r => r.paid).reduce((sum, r) => sum + r.days, 0);
    return { unpaidDays, excessDays, paidDays, totalDeductionDays: unpaidDays + excessDays };
  };

  const computePayslip = (s: typeof staff[0]) => {
    const leave = getLeaveDeductions(s.id);
    const dr = dailyRate(s.salary);
    const tax = s.salary * 0.08;
    const pension = s.salary * 0.04;
    const leaveDeduction = leave.totalDeductionDays * dr;
    const totalDeductions = tax + pension + leaveDeduction;
    const net = s.salary - totalDeductions;
    return { tax, pension, leaveDeduction, totalDeductions, net, leave, dr };
  };

  const totals = activeStaff.reduce((acc, s) => {
    const p = computePayslip(s);
    return {
      gross: acc.gross + s.salary,
      tax: acc.tax + p.tax,
      pension: acc.pension + p.pension,
      leave: acc.leave + p.leaveDeduction,
      net: acc.net + p.net,
    };
  }, { gross: 0, tax: 0, pension: 0, leave: 0, net: 0 });

  const handleGeneratePayslips = () => {
    toast.success(`Payslips generated for ${activeStaff.length} staff members`);
  };

  const payslipStaff = showPayslip ? activeStaff.find(s => s.id === showPayslip) : null;
  const payslipData = payslipStaff ? computePayslip(payslipStaff) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Payroll</h1>
          <p className="text-sm text-muted-foreground">March 2026 payroll — Leave deductions applied automatically</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleGeneratePayslips} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
            <DollarSign size={18} /> Generate Payslips
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors">
            <Printer size={18} /> Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Total Gross Salary</p>
          <p className="text-2xl font-display font-bold text-card-foreground mt-1">${totals.gross.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Tax + Pension</p>
          <p className="text-2xl font-display font-bold text-destructive mt-1">${(totals.tax + totals.pension).toFixed(0)}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Leave Deductions</p>
          <p className="text-2xl font-display font-bold text-destructive mt-1">
            ${totals.leave.toFixed(0)}
            {totals.leave > 0 && <AlertTriangle size={14} className="inline ml-1 mb-1" />}
          </p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Total Net Pay</p>
          <p className="text-2xl font-display font-bold text-success mt-1">${totals.net.toFixed(0)}</p>
        </div>
      </div>

      {/* Payslip Modal */}
      {payslipStaff && payslipData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPayslip(null)}>
          <div className="bg-card rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="text-center border-b border-border pb-3">
              <h2 className="font-display text-lg font-bold text-foreground">PAYSLIP — March 2026</h2>
              <p className="text-xs text-muted-foreground">Brainstar Academy</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Name:</span> <span className="font-medium text-foreground">{payslipStaff.firstName} {payslipStaff.lastName}</span></div>
              <div><span className="text-muted-foreground">ID:</span> <span className="font-medium text-foreground">{payslipStaff.employeeId}</span></div>
              <div><span className="text-muted-foreground">Department:</span> <span className="font-medium text-foreground">{payslipStaff.department}</span></div>
              <div><span className="text-muted-foreground">Role:</span> <span className="font-medium text-foreground">{payslipStaff.role}</span></div>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-2 text-foreground font-medium">Basic Salary</td>
                  <td className="py-2 text-right text-foreground">${payslipStaff.salary.toLocaleString()}</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 text-muted-foreground">Tax (8%)</td>
                  <td className="py-2 text-right text-destructive">-${payslipData.tax.toFixed(0)}</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 text-muted-foreground">Pension (4%)</td>
                  <td className="py-2 text-right text-destructive">-${payslipData.pension.toFixed(0)}</td>
                </tr>
                {payslipData.leaveDeduction > 0 && (
                  <tr className="border-b border-border bg-destructive/5">
                    <td className="py-2 text-destructive flex items-center gap-1">
                      <AlertTriangle size={14} /> Leave Deduction ({payslipData.leave.totalDeductionDays} days × ${payslipData.dr.toFixed(2)})
                    </td>
                    <td className="py-2 text-right text-destructive">-${payslipData.leaveDeduction.toFixed(0)}</td>
                  </tr>
                )}
                {payslipData.leave.unpaidDays > 0 && (
                  <tr>
                    <td className="py-1 pl-4 text-xs text-muted-foreground">└ Unpaid leave: {payslipData.leave.unpaidDays} days</td>
                    <td></td>
                  </tr>
                )}
                {payslipData.leave.excessDays > 0 && (
                  <tr>
                    <td className="py-1 pl-4 text-xs text-muted-foreground">└ Excess over allocation: {payslipData.leave.excessDays} days</td>
                    <td></td>
                  </tr>
                )}
                <tr className="font-bold">
                  <td className="py-2 text-foreground">Net Pay</td>
                  <td className="py-2 text-right text-success">${payslipData.net.toFixed(0)}</td>
                </tr>
              </tbody>
            </table>
            <div className="text-xs text-muted-foreground border-t border-border pt-2">
              Paid leave: {payslipData.leave.paidDays} days (no deduction) | Daily rate: ${payslipData.dr.toFixed(2)}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => window.print()} className="px-3 py-1.5 rounded-lg border border-input text-foreground text-sm hover:bg-muted"><Printer size={14} className="inline mr-1" />Print</button>
              <button onClick={() => setShowPayslip(null)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90">Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Basic Salary</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tax (8%)</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Pension (4%)</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Leave Ded.</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net Pay</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Payslip</th>
              </tr>
            </thead>
            <tbody>
              {activeStaff.map(s => {
                const p = computePayslip(s);
                return (
                  <tr key={s.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium text-foreground">{s.firstName} {s.lastName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.department}</td>
                    <td className="px-4 py-3 text-right text-foreground">${s.salary.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-destructive">${p.tax.toFixed(0)}</td>
                    <td className="px-4 py-3 text-right text-destructive">${p.pension.toFixed(0)}</td>
                    <td className="px-4 py-3 text-right">
                      {p.leaveDeduction > 0 ? (
                        <span className="text-destructive flex items-center justify-end gap-1">
                          <AlertTriangle size={12} /> ${p.leaveDeduction.toFixed(0)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">${p.net.toFixed(0)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setShowPayslip(s.id)} className="px-2 py-1 rounded text-xs bg-primary/10 text-primary hover:bg-primary/20">
                        <FileText size={14} className="inline mr-1" />View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted font-bold">
                <td colSpan={2} className="px-4 py-3 text-foreground">Totals</td>
                <td className="px-4 py-3 text-right text-foreground">${totals.gross.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-destructive">${totals.tax.toFixed(0)}</td>
                <td className="px-4 py-3 text-right text-destructive">${totals.pension.toFixed(0)}</td>
                <td className="px-4 py-3 text-right text-destructive">{totals.leave > 0 ? `$${totals.leave.toFixed(0)}` : '-'}</td>
                <td className="px-4 py-3 text-right text-foreground">${totals.net.toFixed(0)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
