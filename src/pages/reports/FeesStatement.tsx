import React, { useState, useMemo } from 'react';
import { students, classes } from '@/lib/dummy-data';
import { Printer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';

interface FeeItem {
  date: string;
  desc: string;
  type: string;
  ref: string;
  amount: number;
}

const allFeeItems: Record<string, FeeItem[]> = {
  '1': [
    { date: '2026-01-15', desc: 'Tuition Fees - Term 1', type: 'Invoice', ref: 'INV-001', amount: 1200 },
    { date: '2026-02-01', desc: 'Payment Received - Cash', type: 'Receipt', ref: 'REC-001', amount: -800 },
    { date: '2026-02-15', desc: 'Boarding Fees - Term 1', type: 'Invoice', ref: 'INV-005', amount: 500 },
    { date: '2026-03-01', desc: 'Payment Received - Bank Transfer', type: 'Receipt', ref: 'REC-004', amount: -500 },
  ],
  '2': [
    { date: '2026-01-15', desc: 'Tuition Fees - Term 1', type: 'Invoice', ref: 'INV-002', amount: 900 },
    { date: '2026-02-10', desc: 'Payment Received - EcoCash', type: 'Receipt', ref: 'REC-002', amount: -750 },
  ],
  '3': [
    { date: '2026-01-15', desc: 'Tuition Fees - Term 1', type: 'Invoice', ref: 'INV-003', amount: 1200 },
    { date: '2026-01-20', desc: 'Boarding Fees - Term 1', type: 'Invoice', ref: 'INV-006', amount: 500 },
    { date: '2026-02-05', desc: 'Payment Received - Bank Transfer', type: 'Receipt', ref: 'REC-003', amount: -1700 },
  ],
  '4': [
    { date: '2026-01-15', desc: 'Tuition Fees - Term 1', type: 'Invoice', ref: 'INV-004', amount: 900 },
    { date: '2026-02-20', desc: 'Payment Received - Cash', type: 'Receipt', ref: 'REC-005', amount: -300 },
  ],
  '5': [
    { date: '2026-01-15', desc: 'Tuition Fees - Term 1', type: 'Invoice', ref: 'INV-007', amount: 1200 },
    { date: '2026-01-20', desc: 'Boarding Fees - Term 1', type: 'Invoice', ref: 'INV-008', amount: 500 },
    { date: '2026-02-15', desc: 'Payment Received - Bank Transfer', type: 'Receipt', ref: 'REC-006', amount: -1450 },
  ],
  '6': [
    { date: '2026-01-15', desc: 'Tuition Fees - Term 1', type: 'Invoice', ref: 'INV-009', amount: 900 },
    { date: '2026-02-28', desc: 'Payment Received - EcoCash', type: 'Receipt', ref: 'REC-007', amount: -580 },
  ],
};

function StudentStatement({ student, feeItems, dateFrom, dateTo }: { student: typeof students[0]; feeItems: FeeItem[]; dateFrom: string; dateTo: string }) {
  const filtered = feeItems.filter(item => {
    if (dateFrom && item.date < dateFrom) return false;
    if (dateTo && item.date > dateTo) return false;
    return true;
  });

  let running = 0;

  return (
    <div className="bg-card rounded-xl p-6 shadow-card print-page">
      <ReportHeader reportTitle="Fees Statement" subtitle={`${student.firstName} ${student.lastName} | Reg: ${student.regNumber} | ${student.level} - ${student.className}`} />
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
          {filtered.map((item, i) => {
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
  );
}

export default function FeesStatement() {
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const levels = [...new Set(classes.map(c => c.level))];
  const filteredClasses = filterLevel ? classes.filter(c => c.level === filterLevel) : classes;
  
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (filterLevel && s.level !== filterLevel) return false;
      if (filterClass && s.className !== filterClass) return false;
      return true;
    });
  }, [filterLevel, filterClass]);

  const studentsToShow = selectedStudent === 'all' ? filteredStudents : filteredStudents.filter(s => s.id === selectedStudent);

  const selectClass = "px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Fees Statement</h1>
          <p className="text-sm text-muted-foreground">Individual or bulk student fees statements</p>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors">
          <Printer size={18} /> Print {selectedStudent === 'all' ? 'All Statements' : 'Statement'}
        </button>
      </div>

      <Card className="light-card-blue print:hidden">
        <CardContent className="pt-4">
          <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo}>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Level</label>
              <select value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setFilterClass(''); setSelectedStudent('all'); }} className={selectClass}>
                <option value="">All Levels</option>
                {levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Class</label>
              <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setSelectedStudent('all'); }} className={selectClass}>
                <option value="">All Classes</option>
                {filteredClasses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Student</label>
              <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className={selectClass}>
                <option value="all">All Students ({filteredStudents.length})</option>
                {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.regNumber})</option>)}
              </select>
            </div>
          </ReportFilters>
        </CardContent>
      </Card>

      <div className="space-y-6 max-w-3xl">
        {studentsToShow.map(student => (
          <StudentStatement
            key={student.id}
            student={student}
            feeItems={allFeeItems[student.id] || []}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        ))}
        {studentsToShow.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No students found for the selected filters.</div>
        )}
      </div>
    </div>
  );
}
