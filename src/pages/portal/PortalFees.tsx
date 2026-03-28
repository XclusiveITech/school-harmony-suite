import React from 'react';
import { usePortalStudent } from './StudentPortalLayout';
import { useSchoolSettings } from '@/contexts/SchoolSettingsContext';
import ReportHeader from '@/components/ReportHeader';
import { Printer } from 'lucide-react';

export default function PortalFees() {
  const student = usePortalStudent();
  const { settings } = useSchoolSettings();

  const totalFees = student.boardingStatus === 'Boarding' ? 2400 : 1500;
  const paid = totalFees - student.feesBalance;

  const feeItems = [
    { desc: 'Tuition Fees - Term 1', amount: 1200, date: '2026-01-15' },
    ...(student.boardingStatus === 'Boarding' ? [{ desc: 'Boarding Fees - Term 1', amount: 800, date: '2026-01-15' }] : []),
    { desc: 'Development Levy', amount: 200, date: '2026-01-15' },
    { desc: 'Sports Levy', amount: 100, date: '2026-01-15' },
    ...(student.boardingStatus === 'Boarding' ? [{ desc: 'Meals', amount: 100, date: '2026-01-15' }] : []),
  ];

  const payments = [
    { desc: 'Payment - EcoCash', amount: paid > 1000 ? 1000 : paid, date: '2026-01-20', ref: 'REC-001' },
    ...(paid > 1000 ? [{ desc: 'Payment - Bank Transfer', amount: paid - 1000, date: '2026-02-15', ref: 'REC-002' }] : []),
  ];

  let runBal = 0;
  const lines: { date: string; desc: string; ref: string; debit: number; credit: number; balance: number }[] = [];
  feeItems.forEach(f => {
    runBal += f.amount;
    lines.push({ date: f.date, desc: f.desc, ref: 'INV-001', debit: f.amount, credit: 0, balance: runBal });
  });
  payments.forEach(p => {
    runBal -= p.amount;
    lines.push({ date: p.date, desc: p.desc, ref: p.ref, debit: 0, credit: p.amount, balance: runBal });
  });
  lines.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between no-print">
        <h1 className="font-display text-2xl font-bold text-foreground">Fees Statement</h1>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm">
          <Printer size={16} /> Print Statement
        </button>
      </div>

      <div className="bg-card rounded-xl shadow-card p-6">
        <ReportHeader title="Student Fees Statement" />
        <div className="mt-4 mb-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Student: <span className="font-medium text-foreground">{student.firstName} {student.lastName}</span></p>
            <p className="text-muted-foreground">Reg No: <span className="font-medium text-foreground">{student.regNumber}</span></p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Class: <span className="font-medium text-foreground">{student.className}</span></p>
            <p className="text-muted-foreground">Status: <span className="font-medium text-foreground">{student.boardingStatus}</span></p>
          </div>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Ref</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Debit</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Credit</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Balance</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-border">
                <td className="px-3 py-2 text-foreground">{l.date}</td>
                <td className="px-3 py-2 text-foreground">{l.desc}</td>
                <td className="px-3 py-2 text-muted-foreground">{l.ref}</td>
                <td className="px-3 py-2 text-right text-foreground">{l.debit > 0 ? `$${l.debit.toFixed(2)}` : ''}</td>
                <td className="px-3 py-2 text-right text-success">{l.credit > 0 ? `$${l.credit.toFixed(2)}` : ''}</td>
                <td className="px-3 py-2 text-right font-semibold text-foreground">${l.balance.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted font-semibold">
              <td colSpan={3} className="px-3 py-2 text-foreground">Outstanding Balance</td>
              <td className="px-3 py-2 text-right text-foreground">${totalFees.toFixed(2)}</td>
              <td className="px-3 py-2 text-right text-success">${paid.toFixed(2)}</td>
              <td className="px-3 py-2 text-right text-destructive">${student.feesBalance.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-6 no-print">
          <a href="#" className="inline-block px-6 py-2.5 rounded-lg bg-success text-success-foreground font-medium text-sm hover:opacity-90">
            💳 Pay Outstanding Balance Online
          </a>
        </div>
      </div>
    </div>
  );
}
