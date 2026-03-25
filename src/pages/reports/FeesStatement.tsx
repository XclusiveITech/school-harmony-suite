import React, { useState } from 'react';
import { students } from '@/lib/dummy-data';
import { Printer, Search } from 'lucide-react';

export default function FeesStatement() {
  const [selectedStudent, setSelectedStudent] = useState(students[0].id);
  const student = students.find(s => s.id === selectedStudent)!;

  const feeItems = [
    { date: '2026-01-15', desc: 'Tuition Fees - Term 1', type: 'Invoice', ref: 'INV-001', amount: 1200 },
    { date: '2026-02-01', desc: 'Payment Received - Cash', type: 'Receipt', ref: 'REC-001', amount: -800 },
    { date: '2026-02-15', desc: 'Boarding Fees - Term 1', type: 'Invoice', ref: 'INV-005', amount: 500 },
    { date: '2026-03-01', desc: 'Payment Received - Bank Transfer', type: 'Receipt', ref: 'REC-004', amount: -500 },
  ];

  let running = 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Fees Statement</h1>
          <p className="text-sm text-muted-foreground">Individual student fees statement</p>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors">
          <Printer size={18} /> Print
        </button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.regNumber})</option>)}
        </select>
        <input type="date" className="px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm" />
        <input type="date" className="px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm" />
      </div>

      <div className="bg-card rounded-xl p-6 shadow-card max-w-3xl">
        <div className="mb-4 pb-4 border-b border-border">
          <h2 className="font-display font-bold text-card-foreground">{student.firstName} {student.lastName}</h2>
          <p className="text-sm text-muted-foreground">Reg: {student.regNumber} | {student.level} - {student.className}</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 font-medium text-muted-foreground">Date</th>
              <th className="text-left py-2 font-medium text-muted-foreground">Description</th>
              <th className="text-left py-2 font-medium text-muted-foreground">Ref</th>
              <th className="text-right py-2 font-medium text-muted-foreground">Debit</th>
              <th className="text-right py-2 font-medium text-muted-foreground">Credit</th>
              <th className="text-right py-2 font-medium text-muted-foreground">Balance</th>
            </tr>
          </thead>
          <tbody>
            {feeItems.map((item, i) => {
              running += item.amount;
              return (
                <tr key={i} className="border-b border-border">
                  <td className="py-2 text-foreground">{item.date}</td>
                  <td className="py-2 text-foreground">{item.desc}</td>
                  <td className="py-2 font-mono text-xs text-primary">{item.ref}</td>
                  <td className="py-2 text-right text-foreground">{item.amount > 0 ? `$${item.amount}` : '-'}</td>
                  <td className="py-2 text-right text-foreground">{item.amount < 0 ? `$${Math.abs(item.amount)}` : '-'}</td>
                  <td className="py-2 text-right font-medium text-foreground">${running}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-4 pt-3 border-t-2 border-primary flex justify-between font-bold">
          <span className="text-foreground">Outstanding Balance</span>
          <span className={running > 0 ? 'text-destructive' : 'text-success'}>${running}</span>
        </div>
      </div>
    </div>
  );
}
