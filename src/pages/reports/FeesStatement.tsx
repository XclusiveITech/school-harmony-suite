import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { listStudents, BackendStudent } from '@/lib/students-api';
import { getFeesStatement, FeesStatementLine } from '@/lib/reports-api';
import { Printer, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';

function StudentStatement({ student, dateFrom, dateTo }: { student: BackendStudent; dateFrom: string; dateTo: string }) {
  const [lines, setLines] = useState<FeesStatementLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFeesStatement(student.id, { dateFrom, dateTo });
      setLines(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load statement');
    } finally {
      setLoading(false);
    }
  }, [student.id, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const balance = lines.length ? lines[lines.length - 1].balance : 0;
  const className = (student as any).class_name ?? (student as any).level ?? '';

  return (
    <div className="bg-card rounded-xl p-6 shadow-card print-page">
      <ReportHeader
        reportTitle="Fees Statement"
        subtitle={`${student.first_name} ${student.last_name} | Reg: ${student.student_no} | ${className}`}
      />
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 flex items-center justify-between print:hidden mb-3">
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={load} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-sm hover:bg-destructive/10">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading statement…</div>
      ) : (
        <>
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
              {lines.map((item, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-2 text-foreground">{item.date}</td>
                  <td className="py-2 text-foreground">{item.description}</td>
                  <td className="py-2 font-mono text-xs text-primary">{item.reference}</td>
                  <td className="py-2 text-right text-foreground">{item.debit ? `$${item.debit}` : '-'}</td>
                  <td className="py-2 text-right text-foreground">{item.credit ? `$${item.credit}` : '-'}</td>
                  <td className="py-2 text-right font-medium text-foreground">${item.balance}</td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No transactions for the selected period.</td></tr>
              )}
            </tbody>
          </table>
          <div className="mt-4 pt-3 border-t-2 border-primary flex justify-between font-bold">
            <span className="text-foreground">Outstanding Balance</span>
            <span className={balance > 0 ? 'text-destructive' : 'text-success'}>${balance}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function FeesStatement() {
  const [students, setStudents] = useState<BackendStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listStudents();
      setStudents(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const studentsToShow = useMemo(() => {
    return selectedStudent === 'all' ? students : students.filter(s => String(s.id) === selectedStudent);
  }, [students, selectedStudent]);

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
              <label className="block text-xs font-medium text-muted-foreground mb-1">Student</label>
              <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className={selectClass}>
                <option value="all">All Students ({students.length})</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_no})</option>)}
              </select>
            </div>
          </ReportFilters>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 flex items-center justify-between print:hidden">
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={loadStudents} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-sm hover:bg-destructive/10">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      <div className="space-y-6 max-w-3xl">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading students…</div>
        ) : (
          <>
            {studentsToShow.map(student => (
              <StudentStatement key={student.id} student={student} dateFrom={dateFrom} dateTo={dateTo} />
            ))}
            {studentsToShow.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">No students found for the selected filters.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
