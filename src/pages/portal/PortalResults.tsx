import React, { useState } from 'react';
import { usePortalStudent } from './StudentPortalLayout';
import { subjects, examResults, homeworks } from '@/lib/dummy-data';
import ReportHeader from '@/components/ReportHeader';
import { Printer } from 'lucide-react';

export default function PortalResults() {
  const student = usePortalStudent();

  const examTypes = [...new Set(examResults.filter(r => r.studentId === student.id).map(r => r.examType))];
  const allExamTypes = examTypes.length > 0 ? examTypes : ['End of Term 1'];
  const [selectedExam, setSelectedExam] = useState(allExamTypes[0] || 'End of Term 1');

  const mySubjects = subjects.filter(s => s.classes.includes(student.className));
  const myResults = examResults.filter(r => r.studentId === student.id && r.examType === selectedExam);

  // Build full report card
  const reportLines = mySubjects.map(sub => {
    const result = myResults.find(r => r.subjectId === sub.id);
    // CA mark
    const subHomeworks = homeworks.filter(h => h.subjectId === sub.id && h.className === student.className);
    const hwMarks = subHomeworks.map(h => Math.floor(Math.random() * h.totalMarks * 0.4 + h.totalMarks * 0.5) / h.totalMarks * 100);
    const testMarks = [Math.floor(Math.random() * 30 + 50), Math.floor(Math.random() * 30 + 55)];
    const allCA = [...hwMarks, ...testMarks];
    const caAvg = allCA.length > 0 ? allCA.reduce((a, b) => a + b, 0) / allCA.length : 0;
    const caMark = caAvg * (sub.caPercent / 100);

    const examMark = result ? result.percentage * ((100 - sub.caPercent) / 100) : 0;
    const total = caMark + examMark;
    const grade = total >= 75 ? 'A' : total >= 60 ? 'B' : total >= 50 ? 'C' : total >= 40 ? 'D' : 'F';

    return {
      subject: sub.name,
      type: sub.type,
      caWeight: sub.caPercent,
      caMark: caMark.toFixed(1),
      examWeight: 100 - sub.caPercent,
      examMark: examMark.toFixed(1),
      total: total.toFixed(1),
      grade,
      comment: result?.comment || (total >= 50 ? 'Satisfactory' : 'Needs improvement'),
    };
  });

  const overallAvg = reportLines.reduce((s, l) => s + parseFloat(l.total), 0) / reportLines.length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between no-print">
        <h1 className="font-display text-2xl font-bold text-foreground">Academic Results</h1>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm">
          <Printer size={16} /> Print Report
        </button>
      </div>

      <div className="no-print flex items-center gap-3">
        <label className="text-sm text-muted-foreground">Exam:</label>
        <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm">
          {allExamTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-xl shadow-card p-6">
        <ReportHeader reportTitle={`Academic Report - ${selectedExam}`} />

        <div className="mt-4 mb-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Student: <span className="font-medium text-foreground">{student.firstName} {student.lastName}</span></p>
            <p className="text-muted-foreground">Reg No: <span className="font-medium text-foreground">{student.regNumber}</span></p>
            <p className="text-muted-foreground">Class: <span className="font-medium text-foreground">{student.className}</span></p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Level: <span className="font-medium text-foreground">{student.level}</span></p>
            <p className="text-muted-foreground">Status: <span className="font-medium text-foreground">{student.boardingStatus}</span></p>
            <p className="text-muted-foreground">Overall: <span className="font-bold text-primary">{overallAvg.toFixed(1)}%</span></p>
          </div>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Subject</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">CA ({`%`})</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Exam ({`%`})</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total (%)</th>
              <th className="text-center px-3 py-2 font-medium text-muted-foreground">Grade</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Comment</th>
            </tr>
          </thead>
          <tbody>
            {reportLines.map((l, i) => (
              <tr key={i} className="border-b border-border hover:bg-muted/50">
                <td className="px-3 py-2.5 font-medium text-foreground">{l.subject}</td>
                <td className="px-3 py-2.5">
                  <span className={`px-1.5 py-0.5 rounded text-xs ${l.type === 'Theory' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'}`}>{l.type}</span>
                </td>
                <td className="px-3 py-2.5 text-right text-foreground">{l.caMark}</td>
                <td className="px-3 py-2.5 text-right text-foreground">{l.examMark}</td>
                <td className="px-3 py-2.5 text-right font-bold text-primary">{l.total}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${l.grade === 'A' ? 'bg-success/10 text-success' : l.grade === 'B' ? 'bg-primary/10 text-primary' : l.grade === 'C' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>{l.grade}</span>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground text-xs">{l.comment}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted font-semibold">
              <td colSpan={4} className="px-3 py-2 text-foreground">Overall Average</td>
              <td className="px-3 py-2 text-right text-primary">{overallAvg.toFixed(1)}%</td>
              <td className="px-3 py-2 text-center">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${overallAvg >= 75 ? 'bg-success/10 text-success' : overallAvg >= 60 ? 'bg-primary/10 text-primary' : overallAvg >= 50 ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
                  {overallAvg >= 75 ? 'A' : overallAvg >= 60 ? 'B' : overallAvg >= 50 ? 'C' : overallAvg >= 40 ? 'D' : 'F'}
                </span>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
