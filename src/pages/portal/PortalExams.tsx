import React, { useState } from 'react';
import { usePortalStudent } from './StudentPortalLayout';
import { subjects, examResults } from '@/lib/dummy-data';
import { Calendar, ClipboardList } from 'lucide-react';

export default function PortalExams() {
  const student = usePortalStudent();
  const [activeTab, setActiveTab] = useState<'schedule' | 'marks'>('schedule');

  const mySubjects = subjects.filter(s => s.classes.includes(student.className));

  const examSchedule = mySubjects.map((s, i) => ({
    subject: s.name,
    date: `2026-04-${String(7 + i).padStart(2, '0')}`,
    time: i % 2 === 0 ? '08:00 - 11:00' : '13:00 - 16:00',
    venue: i % 3 === 0 ? 'Hall A' : i % 3 === 1 ? 'Hall B' : 'Lab 1',
    papers: s.type === 'Practical' ? 'Paper 1, Paper 2, Practical' : 'Paper 1, Paper 2',
    type: 'End of Term 1',
  }));

  const myResults = examResults.filter(r => r.studentId === student.id);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-display text-2xl font-bold text-foreground">Examinations</h1>

      <div className="flex gap-2 no-print">
        {(['schedule', 'marks'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {tab === 'schedule' ? '📅 Exam Schedule' : '📝 My Marks'}
          </button>
        ))}
      </div>

      {activeTab === 'schedule' && (
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-display font-semibold text-foreground text-sm">End of Term 1 Examination Schedule</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Subject</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Time</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Venue</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Papers</th>
                </tr>
              </thead>
              <tbody>
                {examSchedule.map((e, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/50">
                    <td className="px-3 py-2.5 text-foreground">{e.date}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground">{e.subject}</td>
                    <td className="px-3 py-2.5 text-foreground">{e.time}</td>
                    <td className="px-3 py-2.5 text-foreground">{e.venue}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{e.papers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'marks' && (
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-display font-semibold text-foreground text-sm">Examination Marks</h3>
          </div>
          {myResults.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No exam results available yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Subject</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Exam</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Papers</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">%</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Grade</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {myResults.map((r, i) => {
                    const sub = subjects.find(s => s.id === r.subjectId);
                    const grade = r.percentage >= 75 ? 'A' : r.percentage >= 60 ? 'B' : r.percentage >= 50 ? 'C' : r.percentage >= 40 ? 'D' : 'F';
                    return (
                      <tr key={i} className="border-b border-border hover:bg-muted/50">
                        <td className="px-3 py-2.5 font-medium text-foreground">{sub?.name}</td>
                        <td className="px-3 py-2.5 text-foreground">{r.examType}</td>
                        <td className="px-3 py-2.5">
                          {r.papers.map((p, j) => (
                            <span key={j} className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-muted text-foreground">{p.name}: {p.mark}/{p.possible}</span>
                          ))}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-primary">{r.percentage}%</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${grade === 'A' ? 'bg-success/10 text-success' : grade === 'B' ? 'bg-primary/10 text-primary' : grade === 'C' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>{grade}</span>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground max-w-[200px] truncate">{r.comment}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
