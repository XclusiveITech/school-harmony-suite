import React, { useState } from 'react';
import { subjects, students, classes, caTasks, caSubmissions, type CATask, type CASubmission } from '@/lib/dummy-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { BookCheck, FileText, Plus, Eye, Edit2, Users, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type TaskType = 'Homework' | 'In-Class Test' | 'Project';

export default function ContinuousAssessment() {
  const [tasks, setTasks] = useState<CATask[]>([...caTasks]);
  const [submissions, setSubmissions] = useState<CASubmission[]>([...caSubmissions]);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterClass, setFilterClass] = useState('Form 3A');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<CATask | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMarkDialog, setShowMarkDialog] = useState(false);
  const [newTask, setNewTask] = useState<Partial<CATask>>({ type: 'Homework', status: 'Published', totalMarks: 50 });

  const filteredSubjects = subjects.filter(s => s.classes.includes(filterClass));
  const filteredTasks = tasks.filter(t => {
    if (t.className !== filterClass) return false;
    if (filterSubject !== 'all' && t.subjectId !== filterSubject) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    return true;
  });

  const classStudents = students.filter(s => s.className === filterClass);

  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || 'Unknown';

  const getTaskStats = (taskId: string) => {
    const subs = submissions.filter(s => s.taskId === taskId);
    const graded = subs.filter(s => s.status === 'Graded').length;
    const submitted = subs.filter(s => s.status === 'Submitted').length;
    const pending = subs.filter(s => s.status === 'Pending').length;
    const marks = subs.filter(s => s.mark !== undefined).map(s => s.mark!);
    const avg = marks.length > 0 ? marks.reduce((a, b) => a + b, 0) / marks.length : 0;
    return { graded, submitted, pending, total: subs.length, avgMark: avg };
  };

  const handleCreateTask = () => {
    if (!newTask.title || !newTask.subjectId || !newTask.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    const task: CATask = {
      id: String(Date.now()),
      subjectId: newTask.subjectId!,
      className: filterClass,
      title: newTask.title!,
      description: newTask.description || '',
      type: newTask.type as TaskType,
      dueDate: newTask.dueDate!,
      totalMarks: newTask.totalMarks || 50,
      status: newTask.status as 'Published' | 'Draft',
      createdDate: new Date().toISOString().split('T')[0],
    };
    setTasks(prev => [...prev, task]);
    // Create pending submissions for all students in class
    const newSubs = classStudents.map((st, i) => ({
      id: String(Date.now() + i + 1),
      taskId: task.id,
      studentId: st.id,
      status: 'Pending' as const,
    }));
    setSubmissions(prev => [...prev, ...newSubs]);
    setNewTask({ type: 'Homework', status: 'Published', totalMarks: 50 });
    setShowCreateDialog(false);
    toast.success(`${task.type} "${task.title}" created successfully`);
  };

  const handleUpdateMark = (submissionId: string, mark: number, feedback: string) => {
    setSubmissions(prev => prev.map(s =>
      s.id === submissionId ? { ...s, mark, feedback, status: 'Graded' as const } : s
    ));
    toast.success('Mark updated successfully');
  };

  // Overview stats
  const hwCount = filteredTasks.filter(t => t.type === 'Homework').length;
  const testCount = filteredTasks.filter(t => t.type === 'In-Class Test').length;
  const projectCount = filteredTasks.filter(t => t.type === 'Project').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Continuous Assessment</h1>
          <p className="text-sm text-muted-foreground">Manage homeworks, tests, projects and record marks</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Task</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Assessment Task</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <Select value={newTask.type} onValueChange={v => setNewTask(p => ({ ...p, type: v as TaskType }))}>
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
                  <Select value={newTask.subjectId} onValueChange={v => setNewTask(p => ({ ...p, subjectId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {filteredSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Title</label>
                <Input value={newTask.title || ''} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Algebra Practice Set 3" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description / Instructions</label>
                <Textarea value={newTask.description || ''} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} placeholder="Enter task description..." rows={3} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Total Marks</label>
                  <Input type="number" value={newTask.totalMarks || ''} onChange={e => setNewTask(p => ({ ...p, totalMarks: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                  <Input type="date" value={newTask.dueDate || ''} onChange={e => setNewTask(p => ({ ...p, dueDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select value={newTask.status} onValueChange={v => setNewTask(p => ({ ...p, status: v }))}>
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
              <Button onClick={handleCreateTask} className="w-full">Create Task</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {filteredSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="text-2xl font-bold text-primary">{hwCount}</div>
          <div className="text-xs text-muted-foreground">Homeworks</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="text-2xl font-bold text-primary">{testCount}</div>
          <div className="text-xs text-muted-foreground">In-Class Tests</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="text-2xl font-bold text-primary">{projectCount}</div>
          <div className="text-xs text-muted-foreground">Projects</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="text-2xl font-bold text-primary">{filteredTasks.length}</div>
          <div className="text-xs text-muted-foreground">Total Tasks</div>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">All Tasks</TabsTrigger>
          <TabsTrigger value="homework">Homeworks</TabsTrigger>
          <TabsTrigger value="test">In-Class Tests</TabsTrigger>
          <TabsTrigger value="project">Projects</TabsTrigger>
          <TabsTrigger value="marks">Record Marks</TabsTrigger>
        </TabsList>

        {/* Task list tabs */}
        {['overview', 'homework', 'test', 'project'].map(tab => (
          <TabsContent key={tab} value={tab}>
            <div className="bg-card rounded-xl shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Title</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Subject</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Total Marks</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Due Date</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Graded</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Submitted</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Pending</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Avg %</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks
                      .filter(t => tab === 'overview' ? true : tab === 'homework' ? t.type === 'Homework' : tab === 'test' ? t.type === 'In-Class Test' : t.type === 'Project')
                      .map(t => {
                        const stats = getTaskStats(t.id);
                        const task = tasks.find(tk => tk.id === t.id)!;
                        return (
                          <tr key={t.id} className="border-b border-border hover:bg-muted/50">
                            <td className="px-3 py-3 font-medium text-foreground">{t.title}</td>
                            <td className="px-3 py-3 text-foreground">{getSubjectName(t.subjectId)}</td>
                            <td className="px-3 py-3">
                              <Badge variant={t.type === 'Homework' ? 'default' : t.type === 'In-Class Test' ? 'secondary' : 'outline'}>
                                {t.type}
                              </Badge>
                            </td>
                            <td className="px-3 py-3 text-center text-foreground">{t.totalMarks}</td>
                            <td className="px-3 py-3 text-foreground">{t.dueDate}</td>
                            <td className="px-3 py-3 text-center">
                              <span className="text-green-600 font-medium">{stats.graded}</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="text-blue-600 font-medium">{stats.submitted}</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="text-orange-600 font-medium">{stats.pending}</span>
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-primary">
                              {stats.graded > 0 ? `${((stats.avgMark / task.totalMarks) * 100).toFixed(0)}%` : '-'}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <Button size="sm" variant="ghost" onClick={() => { setSelectedTask(t); setActiveTab('marks'); }}>
                                <Edit2 className="w-3 h-3 mr-1" /> Marks
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {filteredTasks.filter(t => tab === 'overview' ? true : tab === 'homework' ? t.type === 'Homework' : tab === 'test' ? t.type === 'In-Class Test' : t.type === 'Project').length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">No tasks found for the selected filters.</div>
                )}
              </div>
            </div>
          </TabsContent>
        ))}

        {/* Record Marks Tab */}
        <TabsContent value="marks">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookCheck className="w-4 h-4" /> Record & View Marks
              </CardTitle>
              <div className="flex gap-3 mt-2">
                <Select value={selectedTask?.id || ''} onValueChange={v => setSelectedTask(tasks.find(t => t.id === v) || null)}>
                  <SelectTrigger className="w-72"><SelectValue placeholder="Select a task to grade" /></SelectTrigger>
                  <SelectContent>
                    {filteredTasks.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.title} ({t.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {selectedTask ? (
                <div>
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <div className="flex flex-wrap gap-4 text-xs">
                      <span><strong>Subject:</strong> {getSubjectName(selectedTask.subjectId)}</span>
                      <span><strong>Type:</strong> {selectedTask.type}</span>
                      <span><strong>Total Marks:</strong> {selectedTask.totalMarks}</span>
                      <span><strong>Due:</strong> {selectedTask.dueDate}</span>
                    </div>
                    {selectedTask.description && <p className="text-xs text-muted-foreground mt-2">{selectedTask.description}</p>}
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Student</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Reg #</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">Status</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">Submitted</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">Mark / {selectedTask.totalMarks}</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">%</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Feedback</th>
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.map(st => {
                        const sub = submissions.find(s => s.taskId === selectedTask.id && s.studentId === st.id);
                        return <MarkRow key={st.id} student={st} submission={sub} task={selectedTask} onSave={handleUpdateMark} />;
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">Select a task above to view and record marks.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MarkRow({ student, submission, task, onSave }: {
  student: typeof students[0];
  submission?: CASubmission;
  task: CATask;
  onSave: (id: string, mark: number, feedback: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [mark, setMark] = useState(submission?.mark?.toString() || '');
  const [feedback, setFeedback] = useState(submission?.feedback || '');

  const handleSave = () => {
    if (!submission) return;
    const numMark = Number(mark);
    if (isNaN(numMark) || numMark < 0 || numMark > task.totalMarks) {
      toast.error(`Mark must be between 0 and ${task.totalMarks}`);
      return;
    }
    onSave(submission.id, numMark, feedback);
    setEditing(false);
  };

  const statusColor = !submission || submission.status === 'Pending' ? 'text-orange-600' : submission.status === 'Submitted' ? 'text-blue-600' : 'text-green-600';
  const statusIcon = !submission || submission.status === 'Pending' ? <Clock className="w-3 h-3" /> : submission.status === 'Submitted' ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />;

  return (
    <tr className="border-b border-border hover:bg-muted/50">
      <td className="px-3 py-2 font-medium text-foreground">{student.firstName} {student.lastName}</td>
      <td className="px-3 py-2 text-muted-foreground">{student.regNumber}</td>
      <td className="px-3 py-2 text-center">
        <span className={`inline-flex items-center gap-1 ${statusColor}`}>{statusIcon} {submission?.status || 'Pending'}</span>
      </td>
      <td className="px-3 py-2 text-center text-muted-foreground">{submission?.submittedDate || '-'}</td>
      <td className="px-3 py-2 text-center">
        {editing ? (
          <Input type="number" value={mark} onChange={e => setMark(e.target.value)} className="w-16 h-7 text-xs text-center mx-auto" min={0} max={task.totalMarks} />
        ) : (
          <span className="font-bold text-foreground">{submission?.mark ?? '-'}</span>
        )}
      </td>
      <td className="px-3 py-2 text-center font-medium text-primary">
        {submission?.mark !== undefined ? `${((submission.mark / task.totalMarks) * 100).toFixed(0)}%` : '-'}
      </td>
      <td className="px-3 py-2">
        {editing ? (
          <Input value={feedback} onChange={e => setFeedback(e.target.value)} className="h-7 text-xs" placeholder="Feedback..." />
        ) : (
          <span className="text-xs text-muted-foreground">{submission?.feedback || '-'}</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        {editing ? (
          <div className="flex gap-1 justify-center">
            <Button size="sm" variant="default" onClick={handleSave} className="h-6 text-xs px-2">Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-6 text-xs px-2">Cancel</Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-6 text-xs px-2">
            <Edit2 className="w-3 h-3 mr-1" /> Edit
          </Button>
        )}
      </td>
    </tr>
  );
}
