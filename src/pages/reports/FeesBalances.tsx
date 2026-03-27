import React, { useState, useMemo } from 'react';
import { students, classes } from '@/lib/dummy-data';
import { Printer } from 'lucide-react';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';
import { Card, CardContent } from '@/components/ui/card';

export default function FeesBalances() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterClass, setFilterClass] = useState('');

  const levels = [...new Set(classes.map(c => c.level))];
  const filteredClasses = filterLevel ? classes.filter(c => c.level === filterLevel) : classes;

  const withBalances = useMemo(() => {
    return students.filter(s => {
      if (s.feesBalance <= 0) return false;
      if (filterLevel && s.level !== filterLevel) return false;
      if (filterClass && s.className !== filterClass) return false;
      return true;
    });
  }, [filterLevel, filterClass]);

  const total = withBalances.reduce((s, st) => s + st.feesBalance, 0);
  const selectClass = "px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  const subtitle = dateFrom || dateTo
    ? `${dateFrom ? `From ${dateFrom}` : ''}${dateFrom && dateTo ? ' ' : ''}${dateTo ? `To ${dateTo}` : ''}`
    : `As at ${new Date().toLocaleDateString()}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Outstanding Fees Balances</h1>
          <p className="text-sm text-muted-foreground">{withBalances.length} students with outstanding balances</p>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors">
          <Printer size={18} /> Print
        </button>
      </div>

      <Card className="light-card-blue print:hidden">
        <CardContent className="pt-4">
          <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo}>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Level</label>
              <select value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setFilterClass(''); }} className={selectClass}>
                <option value="">All Levels</option>
                {levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Class</label>
              <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className={selectClass}>
                <option value="">All Classes</option>
                {filteredClasses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </ReportFilters>
        </CardContent>
      </Card>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="p-6">
          <ReportHeader reportTitle="Outstanding Fees Balances" subtitle={subtitle} />
        </div>
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
