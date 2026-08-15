import React, { useEffect, useMemo, useState } from 'react';
import {
  listSubjects, listClasses, listCATasks, createCATask, deleteCATask,
  listCASubmissions, seedSubmissions, gradeSubmission, createGradedSubmission,
  subjectClasses,
  type BackendSubject, type BackendClass, type BackendCATask, type BackendCASubmission, type CATaskType,
} from '@/lib/academics-api';
import { listStudents, type BackendStudent } from '@/lib/students-api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { BookCheck, Plus, Edit2, Trash2, Loader2, RefreshCw, AlertCircle, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ContinuousAssessment() {
  const [subjects, setSubjects] = useState<BackendSubject[]>([]);
  const [classes, setClasses] = useState<BackendClass[]>([]);
  const [students, setStudents] = useState<BackendStudent[]>([]);
  const [tasks, setTasks] = useState<BackendCATask[]>([]);
  const [submissions, setSubmissions] = useState<BackendCASubmission[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState('overview');
  const [filterClass, setFilterClass] = useState<string>('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTask, setNewTask] = useState<{ type: CATaskType; status: 'Published' | 'Draft'; total_marks: number; title: string; description: string; due_date: string; subject: string }>({
    type: 'Homework', status: 'Published', total_marks: 50, title: '', description: '', due_date: '', subject: '',
  });
  const [drafts, setDrafts] = useState<Record<number, { mark: string; feedback: string }>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [subs, cls, sts, tks, sbs] = await Promise.all([
        listSubjects(), listClasses(), listStudents(), listCATasks(), listCASubmissions(),
      ]);
      setSubjects(subs);
      setClasses(cls);
      setStudents(sts);
      setTasks(tks);
      setSubmissions(sbs);
      setFilterClass(prev => prev || cls[0]?.name || '');
    } catch (e: any) {
      setError(e?.message || 'Failed to load assessment data from the backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const classSubjects = useMemo(
    () => subjects.filter(s => !filterClass || subjectClasses(s).length === 0 || subjectClasses(s).includes(filterClass)),
    [subjects, filterClass],
  );

  const filteredTasks = useMemo(() => tasks.filter(t => {
    if (filterClass && t.class_name !== filterClass) return false;
    if (filterSubject !== 'all' && String(t.subject) !== filterSubject) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    return true;
  }), [tasks, filterClass, filterSubject, filterType]);

  const classStudents = useMemo(
    () => students.filter(s => !filterClass || s.class_name === filterClass),
    [students, filterClass],
  );

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

  const subjectName = (id: number) => subjects.find(s => s.id === id)?.name || `Subject #${id}`;

  const statsFor = (taskId: number) => {
    const subs = submissions.filter(s => s.task === taskId);
    const graded = subs.filter(s => s.status === 'Graded');
    const marks = graded.map(s => Number(s.mark || 0));
    return {
      graded: graded.length,
      submitted: subs.filter(s => s.status === 'Submitted').length,
      pending: subs.filter(s => s.status === 'Pending').length,
      avgMark: marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0,
    };
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.subject || !newTask.due_date || !filterClass) {
      toast.error('Class, subject, title and due date are required');
      return;
    }
    setSaving(true);
    try {
      const created = await createCATask({
        subject: Number(newTask.subject),
        class_name: filterClass,
        title: newTask.title,
        description: newTask.description,
        type: newTask.type,
        due_date: newTask.due_date,
        total_marks: newTask.total_marks,
        status: newTask.status,
      });
      setTasks(prev => [...prev, created]);
      await seedSubmissions(created.id, classStudents.map(s => s.id));
      setSubmissions(await listCASubmissions());
      setNewTask({ type: 'Homework', status: 'Published', total_marks: 50, title: '', description: '', due_date: '', subject: '' });
      setShowCreateDialog(false);
      toast.success(`${created.type} "${created.title}" saved to the database`);
    } catch (e: any) {
      toast.error(e?.message || 'Could not create task');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (task: BackendCATask) => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    try {
      await deleteCATask(task.id);
      setTasks(prev => prev.filter(t => t.id !== task.id));
      setSubmissions(prev => prev.filter(s => s.task !== task.id));
      if (selectedTaskId === task.id) setSelectedTaskId(null);
      toast.success('Task deleted');
    } catch (e: any) {
      toast.error(e?.message || 'Could not delete task');
    }
  };

  const saveMarks = async () => {
    if (!selectedTask) return;
    setSaving(true);
    try {
      let saved = 0;
      for (const st of classStudents) {
        const existing = submissions.find(s => s.task === selectedTask.id && s.student === st.id);
        const draft = drafts[st.id];
        if (!draft || draft.mark === '' || draft.mark === undefined) continue;
        const mark = Number(draft.mark);
        if (Number.isNaN(mark)) continue;
        if (existing) await gradeSubmission(existing.id, mark, draft.feedback || '');
        else await createGradedSubmission(selectedTask.id, st.id, mark, draft.feedback || '');
        saved += 1;
      }
      setSubmissions(await listCASubmissions());
      setDrafts({});
      toast.success(`${saved} mark${saved === 1 ? '' : 's'} saved to the database`);
    } catch (e: any) {
      toast.error(e?.message || 'Could not save marks');
    } finally {
      setSaving(false);
    }
  };

  const counts = {
    hw: filteredTasks.filter(t => t.type === 'Homework').length,
    test: filteredTasks.filter(t => t.type === 'In-Class Test').length,
    project: filteredTasks.filter(t => t.type === 'Project').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Continuous Assessment</h1>
          <p className="text-sm text-muted-foreground">Homeworks, tests, projects and marks — stored in the database</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}><Plus className="w-4 h-4 mr-2" /> New Task</Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle size={16} className="mt-0.5" /> <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            {classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {classSubjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Homework">Homework</SelectItem>
            <SelectItem value="In-Class Test">In-Class Test</SelectItem>
            <SelectItem value="Project">Project</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[['Homeworks', counts.hw], ['In-Class Tests', counts.test], ['Projects', counts.project], ['Total Tasks', filteredTasks.length]].map(([label, value]) => (
          <Card key={label as string}><CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-primary">{value as number}</div>
            <div className="text-xs text-muted-foreground">{label as string}</div>
          </CardContent></Card>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading assessment data…
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">All Tasks</TabsTrigger>
            <TabsTrigger value="homework">Homeworks</TabsTrigger>
            <TabsTrigger value="test">In-Class Tests</TabsTrigger>
            <TabsTrigger value="project">Projects</TabsTrigger>
            <TabsTrigger value="marks">Record Marks</TabsTrigger>
          </TabsList>

          {['overview', 'homework', 'test', 'project'].map(tab => {
            const rows = filteredTasks.filter(t =>
              tab === 'overview' ? true : tab === 'homework' ? t.type === 'Homework' : tab === 'test' ? t.type === 'In-Class Test' : t.type === 'Project');
            return (
              <TabsContent key={tab} value={tab}>
                <div className="bg-card rounded-xl shadow-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted">
                          {['Title', 'Subject', 'Type', 'Total Marks', 'Due Date', 'Graded', 'Submitted', 'Pending', 'Avg %', 'Actions'].map(h => (
                            <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(t => {
                          const s = statsFor(t.id);
                          return (
                            <tr key={t.id} className="border-b border-border hover:bg-muted/50">
                              <td className="px-3 py-3 font-medium text-foreground">{t.title}</td>
                              <td className="px-3 py-3 text-foreground">{t.subject_name || subjectName(t.subject)}</td>
                              <td className="px-3 py-3">
                                <Badge variant={t.type === 'Homework' ? 'default' : t.type === 'In-Class Test' ? 'secondary' : 'outline'}>{t.type}</Badge>
                              </td>
                              <td className="px-3 py-3 text-foreground">{t.total_marks}</td>
                              <td className="px-3 py-3 text-foreground">{t.due_date}</td>
                              <td className="px-3 py-3 text-success font-medium">{s.graded}</td>
                              <td className="px-3 py-3 text-info font-medium">{s.submitted}</td>
                              <td className="px-3 py-3 text-warning font-medium">{s.pending}</td>
                              <td className="px-3 py-3 font-bold text-primary">
                                {s.graded > 0 ? `${((s.avgMark / (t.total_marks || 1)) * 100).toFixed(0)}%` : '-'}
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => { setSelectedTaskId(t.id); setActiveTab('marks'); }}>
                                    <Edit2 className="w-3 h-3 mr-1" /> Marks
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDeleteTask(t)}>
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {rows.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground">No tasks in the database for the selected filters.</div>
                    )}
                  </div>
                </div>
              </TabsContent>
            );
          })}

          <TabsContent value="marks">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookCheck className="w-4 h-4" /> Record &amp; View Marks
                </CardTitle>
                <div className="flex flex-wrap gap-3 mt-2">
                  <Select value={selectedTaskId ? String(selectedTaskId) : ''} onValueChange={v => { setSelectedTaskId(Number(v)); setDrafts({}); }}>
                    <SelectTrigger className="w-72"><SelectValue placeholder="Select a task to grade" /></SelectTrigger>
                    <SelectContent>
                      {filteredTasks.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.title} ({t.type})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {selectedTask && (
                    <Button onClick={saveMarks} disabled={saving}>
                      {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />} Save Marks
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedTask ? (
                  <div className="p-8 text-center text-muted-foreground">Select a task to record marks.</div>
                ) : (
                  <div>
                    <div className="mb-4 p-3 bg-muted rounded-lg flex flex-wrap gap-4 text-xs">
                      <span><strong>Subject:</strong> {selectedTask.subject_name || subjectName(selectedTask.subject)}</span>
                      <span><strong>Type:</strong> {selectedTask.type}</span>
                      <span><strong>Total Marks:</strong> {selectedTask.total_marks}</span>
                      <span><strong>Due:</strong> {selectedTask.due_date}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted">
                            {['Student', 'Reg #', 'Status', `Mark / ${selectedTask.total_marks}`, '%', 'Feedback'].map(h => (
                              <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {classStudents.map(st => {
                            const sub = submissions.find(s => s.task === selectedTask.id && s.student === st.id);
                            const draft = drafts[st.id];
                            const markValue = draft ? draft.mark : sub?.mark != null ? String(sub.mark) : '';
                            const feedbackValue = draft ? draft.feedback : sub?.feedback || '';
                            const pct = markValue !== '' ? (Number(markValue) / (selectedTask.total_marks || 1)) * 100 : null;
                            return (
                              <tr key={st.id} className="border-b border-border">
                                <td className="px-3 py-2 font-medium text-foreground">{st.first_name} {st.last_name}</td>
                                <td className="px-3 py-2 text-muted-foreground">{st.student_no}</td>
                                <td className="px-3 py-2">
                                  <Badge variant={sub?.status === 'Graded' ? 'default' : sub?.status === 'Submitted' ? 'secondary' : 'outline'}>
                                    {sub?.status || 'Pending'}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 w-28">
                                  <Input type="number" value={markValue}
                                    onChange={e => setDrafts(d => ({ ...d, [st.id]: { mark: e.target.value, feedback: feedbackValue } }))}
                                    className="h-8" />
                                </td>
                                <td className="px-3 py-2 font-bold text-primary">{pct != null ? `${pct.toFixed(0)}%` : '-'}</td>
                                <td className="px-3 py-2">
                                  <Input value={feedbackValue}
                                    onChange={e => setDrafts(d => ({ ...d, [st.id]: { mark: markValue, feedback: e.target.value } }))}
                                    placeholder="Feedback" className="h-8" />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {classStudents.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground">No students enrolled in {filterClass || 'this class'}.</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Assessment Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <Select value={newTask.type} onValueChange={v => setNewTask(p => ({ ...p, type: v as CATaskType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Homework">Homework</SelectItem>
                    <SelectItem value="In-Class Test">In-Class Test</SelectItem>
                    <SelectItem value="Project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Subject</label>
                <Select value={newTask.subject} onValueChange={v => setNewTask(p => ({ ...p, subject: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {classSubjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Algebra Practice Set 3" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description / Instructions</label>
              <Textarea value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Total Marks</label>
                <Input type="number" value={newTask.total_marks} onChange={e => setNewTask(p => ({ ...p, total_marks: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                <Input type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={newTask.status} onValueChange={v => setNewTask(p => ({ ...p, status: v as 'Published' | 'Draft' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Published">Published</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Class</label>
              <Input value={filterClass} disabled className="bg-muted" />
            </div>
            <Button onClick={handleCreateTask} className="w-full" disabled={saving}>
              {saving && <Loader2 size={16} className="mr-2 animate-spin" />} Create Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
