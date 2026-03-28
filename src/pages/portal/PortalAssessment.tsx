import React from 'react';
import { usePortalStudent } from './StudentPortalLayout';
import { subjects, homeworks } from '@/lib/dummy-data';

export default function PortalAssessment() {
  const student = usePortalStudent();
  const mySubjects = subjects.filter(s => s.classes.includes(student.className));

  const subjectAssessments = mySubjects.map(sub => {
    const subHomeworks = homeworks.filter(h => h.subjectId === sub.id && h.className === student.className);
    const hwMarks = subHomeworks.map((h, i) => ({
      name: `HW${i + 1}: ${h.title}`,
      mark: Math.floor(Math.random() * h.totalMarks * 0.4 + h.totalMarks * 0.5),
      total: h.totalMarks,
      status: h.status,
    }));
    const inclassMarks = [
      { name: 'Test 1', mark: Math.floor(Math.random() * 30 + 50), total: 100 },
      { name: 'Test 2', mark: Math.floor(Math.random() * 30 + 55), total: 100 },
    ];
    const projectMarks = sub.type === 'Practical' ? [{ name: 'Project 1', mark: Math.floor(Math.random() * 20 + 60), total: 100 }] : [];
    const allMarks = [...hwMarks, ...inclassMarks, ...projectMarks];
    const avg = allMarks.reduce((s, m) => s + (m.mark / m.total) * 100, 0) / allMarks.length;
    const finalMark = avg * (sub.caPercent / 100);

    return { subject: sub, hwMarks, inclassMarks, projectMarks, finalMark: finalMark.toFixed(1), rawPercent: avg.toFixed(1) };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Continuous Assessment</h1>
        <p className="text-sm text-muted-foreground">{student.firstName} {student.lastName} - {student.className}</p>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Subject</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Homeworks</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Tests</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Projects</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Average %</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">CA Mark (%)</th>
              </tr>
            </thead>
            <tbody>
              {subjectAssessments.map(sa => (
                <tr key={sa.subject.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-3 py-3 font-medium text-foreground">{sa.subject.name}</td>
                  <td className="px-3 py-3">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${sa.subject.type === 'Theory' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'}`}>{sa.subject.type}</span>
                  </td>
                  <td className="px-3 py-3 text-foreground">
                    {sa.hwMarks.map((h, i) => (
                      <span key={i} className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-muted text-foreground">{h.mark}/{h.total}</span>
                    ))}
                    {sa.hwMarks.length === 0 && <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-3 text-foreground">
                    {sa.inclassMarks.map((t, i) => (
                      <span key={i} className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-muted text-foreground">{t.mark}/{t.total}</span>
                    ))}
                  </td>
                  <td className="px-3 py-3 text-foreground">
                    {sa.projectMarks.length > 0 ? sa.projectMarks.map((p, i) => (
                      <span key={i} className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-muted text-foreground">{p.mark}/{p.total}</span>
                    )) : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-3 text-right text-foreground">{sa.rawPercent}%</td>
                  <td className="px-3 py-3 text-right font-bold text-primary">{sa.finalMark}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
