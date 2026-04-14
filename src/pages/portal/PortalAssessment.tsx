import React, { useState } from 'react';
import { usePortalStudent } from './StudentPortalLayout';
import { subjects, caTasks, caSubmissions, type CATask, type CASubmission } from '@/lib/dummy-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, FileText, CheckCircle2, Clock, AlertCircle, Upload, Download, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function PortalAssessment() {
  const student = usePortalStudent();
  const [activeTab, setActiveTab] = useState('dashboard');
  const mySubjects = subjects.filter(s => s.classes.includes(student.className));
  const mySubjectIds = mySubjects.map(s => s.id);

  // Only tasks for student's class and registered subjects
  const myTasks = caTasks.filter(t => t.className === student.className && mySubjectIds.includes(t.subjectId) && t.status === 'Published');
  const mySubmissions = caSubmissions.filter(s => s.studentId === student.id);

  const getSubmission = (taskId: string) => mySubmissions.find(s => s.taskId === taskId);
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || 'Unknown';

  // Stats
  const homeworks = myTasks.filter(t => t.type === 'Homework');
  const tests = myTasks.filter(t => t.type === 'In-Class Test');
  const projects = myTasks.filter(t => t.type === 'Project');

  const countByStatus = (taskList: CATask[]) => {
    const completed = taskList.filter(t => { const s = getSubmission(t.id); return s?.status === 'Graded'; }).length;
    const submitted = taskList.filter(t => { const s = getSubmission(t.id); return s?.status === 'Submitted'; }).length;
    const pending = taskList.filter(t => { const s = getSubmission(t.id); return !s || s.status === 'Pending'; }).length;
    return { completed, submitted, pending, total: taskList.length };
  };

  const hwStats = countByStatus(homeworks);
  const testStats = countByStatus(tests);
  const projStats = countByStatus(projects);
  const allStats = countByStatus(myTasks);

  // CA summary by subject
  const subjectSummary = mySubjects.map(sub => {
    const subTasks = myTasks.filter(t => t.subjectId === sub.id);
    const gradedTasks = subTasks.filter(t => {
      const s = getSubmission(t.id);
      return s?.status === 'Graded' && s.mark !== undefined;
    });
    const marks = gradedTasks.map(t => {
      const s = getSubmission(t.id)!;
      return { mark: s.mark!, total: t.totalMarks, type: t.type };
    });
    const avg = marks.length > 0 ? marks.reduce((a, m) => a + (m.mark / m.total) * 100, 0) / marks.length : 0;
    const caFinal = avg * (sub.caPercent / 100);
    return { subject: sub, tasks: subTasks.length, graded: gradedTasks.length, avg, caFinal, marks };
  });

  const handleUpload = (taskId: string) => {
    toast.success('Work submitted successfully! (Demo)');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Continuous Assessment</h1>
        <p className="text-sm text-muted-foreground">{student.firstName} {student.lastName} - {student.className}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="homework">Homeworks ({homeworks.length})</TabsTrigger>
          <TabsTrigger value="test">Tests ({tests.length})</TabsTrigger>
          <TabsTrigger value="project">Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="summary">CA Summary</TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Tasks" value={allStats.total} color="text-primary" />
            <StatCard label="Completed" value={allStats.completed} color="text-green-600" icon={<CheckCircle2 className="w-4 h-4" />} />
            <StatCard label="Submitted" value={allStats.submitted} color="text-blue-600" icon={<AlertCircle className="w-4 h-4" />} />
            <StatCard label="Pending" value={allStats.pending} color="text-orange-600" icon={<Clock className="w-4 h-4" />} />
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <CategoryCard title="Homeworks" stats={hwStats} />
            <CategoryCard title="In-Class Tests" stats={testStats} />
            <CategoryCard title="Projects" stats={projStats} />
          </div>

          {/* Recent tasks */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Recent Tasks</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {myTasks.slice(0, 5).map(t => {
                  const sub = getSubmission(t.id);
                  return (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <div className="text-xs font-medium text-foreground">{t.title}</div>
                        <div className="text-xs text-muted-foreground">{getSubjectName(t.subjectId)} · {t.type} · Due: {t.dueDate}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {sub?.status === 'Graded' ? (
                          <Badge variant="default" className="text-xs">{sub.mark}/{t.totalMarks}</Badge>
                        ) : (
                          <Badge variant={sub?.status === 'Submitted' ? 'secondary' : 'outline'} className="text-xs">
                            {sub?.status || 'Pending'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Task list tabs */}
        {[
          { tab: 'homework', taskList: homeworks, label: 'Homework' },
          { tab: 'test', taskList: tests, label: 'In-Class Test' },
          { tab: 'project', taskList: projects, label: 'Project' },
        ].map(({ tab, taskList, label }) => (
          <TabsContent key={tab} value={tab}>
            <div className="space-y-3">
              {taskList.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground bg-card rounded-xl">No {label.toLowerCase()}s assigned yet.</div>
              ) : taskList.map(t => {
                const sub = getSubmission(t.id);
                return <TaskCard key={t.id} task={t} submission={sub} onUpload={handleUpload} />;
              })}
            </div>
          </TabsContent>
        ))}

        {/* CA Summary */}
        <TabsContent value="summary">
          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Subject</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Tasks</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Graded</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Average %</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">CA Weight</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">CA Mark (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectSummary.map(s => (
                    <tr key={s.subject.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-3 py-3 font-medium text-foreground">{s.subject.name}</td>
                      <td className="px-3 py-3 text-center text-foreground">{s.tasks}</td>
                      <td className="px-3 py-3 text-center text-foreground">{s.graded}/{s.tasks}</td>
                      <td className="px-3 py-3 text-center text-foreground">{s.avg > 0 ? `${s.avg.toFixed(1)}%` : '-'}</td>
                      <td className="px-3 py-3 text-center text-muted-foreground">{s.subject.caPercent}%</td>
                      <td className="px-3 py-3 text-right font-bold text-primary">{s.graded > 0 ? `${s.caFinal.toFixed(1)}%` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 text-center">
        <div className={`text-2xl font-bold ${color} flex items-center justify-center gap-1`}>
          {icon} {value}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function CategoryCard({ title, stats }: { title: string; stats: { completed: number; submitted: number; pending: number; total: number } }) {
  const progress = stats.total > 0 ? ((stats.completed / stats.total) * 100) : 0;
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="text-sm font-medium text-foreground mb-2">{title}</div>
        <Progress value={progress} className="h-2 mb-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="text-green-600">{stats.completed} graded</span>
          <span className="text-blue-600">{stats.submitted} submitted</span>
          <span className="text-orange-600">{stats.pending} pending</span>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskCard({ task, submission, onUpload }: { task: CATask; submission?: CASubmission; onUpload: (id: string) => void }) {
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || 'Unknown';
  const isPastDue = new Date(task.dueDate) < new Date();

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-foreground">{task.title}</span>
              <Badge variant={task.type === 'Homework' ? 'default' : task.type === 'In-Class Test' ? 'secondary' : 'outline'} className="text-xs">
                {task.type}
              </Badge>
              {submission?.status === 'Graded' && (
                <Badge variant="default" className="bg-green-600 text-xs">{submission.mark}/{task.totalMarks}</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground space-x-3">
              <span>{getSubjectName(task.subjectId)}</span>
              <span>Due: {task.dueDate}</span>
              <span>Marks: {task.totalMarks}</span>
            </div>
            {task.description && <p className="text-xs text-muted-foreground mt-1">{task.description}</p>}
            {submission?.feedback && (
              <p className="text-xs text-primary mt-1 italic">Feedback: {submission.feedback}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {submission?.status === 'Graded' ? (
              <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Graded</span>
            ) : submission?.status === 'Submitted' ? (
              <span className="text-xs text-blue-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Awaiting Marks</span>
            ) : (
              <>
                {!isPastDue && (
                  <Button size="sm" variant="outline" onClick={() => onUpload(task.id)} className="text-xs h-7">
                    <Upload className="w-3 h-3 mr-1" /> Submit Work
                  </Button>
                )}
                {isPastDue && <span className="text-xs text-destructive">Overdue</span>}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
