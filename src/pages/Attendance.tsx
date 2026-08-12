import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, Check, Printer, RefreshCw, Save } from 'lucide-react';
import { listStudents, type BackendStudent } from '@/lib/students-api';
import {
  listAttendance,
  saveAttendance,
  type AttendanceStatus,
  type BackendAttendance,
} from '@/lib/attendance-api';
import { useToast } from '@/hooks/use-toast';

const STATUSES: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'Excused'];

const statusStyles: Record<AttendanceStatus, string> = {
  Present: 'bg-success text-success-foreground border-success',
  Absent: 'bg-destructive text-destructive-foreground border-destructive',
  Late: 'bg-warning text-warning-foreground border-warning',
  Excused: 'bg-info text-info-foreground border-info',
};

export default function Attendance() {
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [classFilter, setClassFilter] = useState('');
  const [students, setStudents] = useState<BackendStudent[]>([]);
  const [marks, setMarks] = useState<Record<number, AttendanceStatus>>({});
  const [remarks, setRemarks] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState<BackendAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (forDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const [studentRows, attendanceRows] = await Promise.all([
        listStudents(),
        listAttendance(forDate),
      ]);
      setStudents(studentRows);
      setSaved(attendanceRows);
      const nextMarks: Record<number, AttendanceStatus> = {};
      const nextRemarks: Record<number, string> = {};
      attendanceRows.forEach(r => {
        nextMarks[r.student] = r.status;
        if (r.remarks) nextRemarks[r.student] = r.remarks;
      });
      setMarks(nextMarks);
      setRemarks(nextRemarks);
    } catch (e: any) {
      setError(e?.message || 'Failed to load attendance from the backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(date); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [date]);

  const classes = useMemo(
    () => [...new Set(students.map(s => s.class_name).filter(Boolean))],
    [students],
  );

  const visible = useMemo(
    () => students.filter(s => !classFilter || s.class_name === classFilter),
    [students, classFilter],
  );

  const counts = useMemo(() => {
    const base: Record<string, number> = { Present: 0, Absent: 0, Late: 0, Excused: 0, Unmarked: 0 };
    visible.forEach(s => {
      const m = marks[s.id];
      base[m || 'Unmarked'] += 1;
    });
    return base;
  }, [visible, marks]);

  const rate = visible.length
    ? Math.round(((counts.Present + counts.Late) / visible.length) * 100)
    : 0;

  const markAll = (status: AttendanceStatus) => {
    setMarks(prev => {
      const next = { ...prev };
      visible.forEach(s => { next[s.id] = status; });
      return next;
    });
  };

  const handleSave = async () => {
    const rows = visible
      .filter(s => marks[s.id])
      .map(s => ({
        student: s.id,
        date,
        status: marks[s.id],
        remarks: remarks[s.id] || '',
        class_name: s.class_name,
      }));
    if (!rows.length) {
      toast({ title: 'Nothing to save', description: 'Mark at least one student first.' });
      return;
    }
    setSaving(true);
    try {
      const n = await saveAttendance(rows);
      toast({ title: 'Attendance saved', description: `${n} record(s) written to the database.` });
      await load(date);
    } catch (e: any) {
      toast({
        title: 'Save failed',
        description: e?.message || 'The backend rejected the attendance register.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Attendance Register</h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? 'Loading from database…'
              : `${visible.length} student(s) · ${saved.length} record(s) already saved for ${date}`}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={() => load(date)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors">
            <Printer size={16} /> Print
          </button>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-60">
            <Save size={16} /> {saving ? 'Saving…' : 'Save Register'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {(['Present', 'Absent', 'Late', 'Excused'] as const).map(s => (
          <div key={s} className="bg-card rounded-xl p-4 shadow-card">
            <p className="text-sm text-muted-foreground">{s}</p>
            <p className="text-2xl font-display font-bold text-card-foreground">{counts[s]}</p>
          </div>
        ))}
        <div className="bg-card rounded-xl p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Attendance Rate</p>
          <p className="text-2xl font-display font-bold text-card-foreground">{rate}%</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <div className="relative">
          <CalendarDays size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex gap-2 sm:ml-auto">
          {STATUSES.map(s => (
            <button key={s} onClick={() => markAll(s)} className="px-3 py-2 rounded-lg border border-input text-xs font-medium hover:bg-muted transition-colors">
              All {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reg No.</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Class</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-card-foreground">{s.student_no}</td>
                  <td className="px-4 py-3 text-card-foreground">{s.first_name} {s.last_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.class_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {STATUSES.map(st => {
                        const active = marks[s.id] === st;
                        return (
                          <button
                            key={st}
                            aria-label={`${st} ${s.student_no}`}
                            onClick={() => setMarks(prev => ({ ...prev, [s.id]: st }))}
                            className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${active ? statusStyles[st] : 'border-input text-muted-foreground hover:bg-muted'}`}
                          >
                            {active && <Check size={11} className="inline mr-1" />}{st}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={remarks[s.id] || ''}
                      onChange={e => setRemarks(prev => ({ ...prev, [s.id]: e.target.value }))}
                      placeholder="Optional note"
                      className="w-full px-3 py-1.5 rounded-md border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </td>
                </tr>
              ))}
              {!loading && !visible.length && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No students found in the database for this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
