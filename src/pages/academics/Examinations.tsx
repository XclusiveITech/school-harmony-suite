import React, { useEffect, useMemo, useState } from 'react';
import {
  listSubjects, listClasses, listExamTypes, createExamType, listExams, createExam, deleteExam,
  listExamResults, saveExamResults, gradeFor,
  type BackendSubject, type BackendClass, type BackendExamType, type BackendExam, type BackendExamResult,
} from '@/lib/academics-api';
import { listStudents, type BackendStudent } from '@/lib/students-api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReportHeader from '@/components/ReportHeader';
import { Plus, Trash2, Loader2, RefreshCw, AlertCircle, Save, Printer } from 'lucide-react';
import { toast } from 'sonner';

const TAB_BY_HASH: Record<string, string> = {
  '#types': 'types', '#schedule': 'schedule', '#marks': 'marks', '#results': 'results',
};

export default function Examinations() {
  const [subjects, setSubjects] = useState<BackendSubject[]>([]);
  const [classes, setClasses] = useState<BackendClass[]>([]);
  const [students, setStudents] = useState<BackendStudent[]>([]);
  const [examTypes, setExamTypes] = useState<BackendExamType[]>([]);
  const [exams, setExams] = useState<BackendExam[]>([]);
  const [results, setResults] = useState<BackendExamResult[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState(TAB_BY_HASH[window.location.hash] || 'schedule');
  const [filterClass, setFilterClass] = useState('');
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, { mark: string; comment: string }>>({});

  const [typeDialog, setTypeDialog] = useState(false);
  const [newType, setNewType] = useState({ name: '', weight: 70, term: 'Term 1' });
  const [examDialog, setExamDialog] = useState(false);
  const [newExam, setNewExam] = useState({ exam_type: '', subject: '', date: '', start_time: '', end_time: '', venue: '', total_marks: 100 });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [subs, cls, sts, types, exs, res] = await Promise.all([
        listSubjects(), listClasses(), listStudents(), listExamTypes(), listExams(), listExamResults(),
      ]);
      setSubjects(subs); setClasses(cls); setStudents(sts);
      setExamTypes(types); setExams(exs); setResults(res);
      setFilterClass(prev => prev || cls[0]?.name || '');
    } catch (e: any) {
      setError(e?.message || 'Failed to load examination data from the backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const onHash = () => setTab(TAB_BY_HASH[window.location.hash] || 'schedule');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const classExams = useMemo(
    () => exams.filter(e => !filterClass || e.class_name === filterClass),
    [exams, filterClass],
  );
  const classStudents = useMemo(
    () => students.filter(s => !filterClass || s.class_name === filterClass),
    [students, filterClass],
  );
  const selectedExam = exams.find(e => e.id === selectedExamId) || null;
  const subjectName = (id: number) => subjects.find(s => s.id === id)?.name || `Subject #${id}`;

  const addType = async () => {
    if (!newType.name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const created = await createExamType(newType);
      setExamTypes(prev => [...prev, created]);
      setNewType({ name: '', weight: 70, term: 'Term 1' });
      setTypeDialog(false);
      toast.success('Exam type saved to the database');
    } catch (e: any) {
      toast.error(e?.message || 'Could not save exam type');
    } finally { setSaving(false); }
  };

  const addExam = async () => {
    if (!newExam.exam_type || !newExam.subject || !newExam.date || !filterClass) {
      toast.error('Class, exam type, subject and date are required'); return;
    }
    setSaving(true);
    try {
      const created = await createExam({
        exam_type: Number(newExam.exam_type),
        subject: Number(newExam.subject),
        class_name: filterClass,
        date: newExam.date,
        start_time: newExam.start_time || undefined,
        end_time: newExam.end_time || undefined,
        venue: newExam.venue || undefined,
        total_marks: newExam.total_marks,
      });
      setExams(prev => [...prev, created]);
      setNewExam({ exam_type: '', subject: '', date: '', start_time: '', end_time: '', venue: '', total_marks: 100 });
      setExamDialog(false);
      toast.success('Exam scheduled and saved to the database');
    } catch (e: any) {
      toast.error(e?.message || 'Could not schedule exam');
    } finally { setSaving(false); }
  };

  const removeExam = async (exam: BackendExam) => {
    if (!confirm('Delete this scheduled exam?')) return;
    try {
      await deleteExam(exam.id);
      setExams(prev => prev.filter(e => e.id !== exam.id));
      toast.success('Exam deleted');
    } catch (e: any) {
      toast.error(e?.message || 'Could not delete exam');
    }
  };

  const saveMarks = async () => {
    if (!selectedExam) return;
    const rows = Object.entries(drafts)
      .filter(([, d]) => d.mark !== '' && !Number.isNaN(Number(d.mark)))
      .map(([studentId, d]) => ({ exam: selectedExam.id, student: Number(studentId), mark: Number(d.mark), comment: d.comment || '' }));
    if (!rows.length) { toast.error('Enter at least one mark'); return; }
    setSaving(true);
    try {
      const n = await saveExamResults(selectedExam.id, rows);
      setResults(await listExamResults());
      setDrafts({});
      toast.success(`${n} result${n === 1 ? '' : 's'} saved to the database`);
    } catch (e: any) {
      toast.error(e?.message || 'Could not save marks');
    } finally { setSaving(false); }
  };

  // Results summary per student across all exams of the selected class.
  const resultRows = useMemo(() => classStudents.map(st => {
    const mine = results.filter(r => r.student === st.id && classExams.some(e => e.id === r.exam));
    const pcts = mine.map(r => {
      const exam = exams.find(e => e.id === r.exam);
      const total = r.total_marks || exam?.total_marks || 100;
      return (Number(r.mark) / total) * 100;
    });
    const avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
    return { student: st, count: mine.length, avg, grade: gradeFor(avg) };
  }), [classStudents, results, classExams, exams]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between gap-4 no-print">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Examinations</h1>
          <p className="text-sm text-muted-foreground">Exam types, schedules, marks and results — stored in the database</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              {classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive no-print">
          <AlertCircle size={16} className="mt-0.5" /> <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading examinations…
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="no-print">
            <TabsTrigger value="types">Exam Types</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="marks">Enter Marks</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="types">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Exam Types &amp; Weighting</CardTitle>
                <Button size="sm" onClick={() => setTypeDialog(true)}><Plus size={15} className="mr-1" /> Add Type</Button>
              </CardHeader>
              <CardContent>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      {['Name', 'Term', 'Weight (%)'].map(h => <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {examTypes.map(t => (
                      <tr key={t.id} className="border-b border-border">
                        <td className="px-3 py-2 font-medium text-foreground">{t.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{t.term || '-'}</td>
                        <td className="px-3 py-2 text-primary font-bold">{t.weight}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {examTypes.length === 0 && <div className="p-8 text-center text-muted-foreground">No exam types in the database yet.</div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Examination Schedule — {filterClass || 'no class selected'}</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => window.print()}><Printer size={15} className="mr-1" /> Print</Button>
                  <Button size="sm" onClick={() => setExamDialog(true)}><Plus size={15} className="mr-1" /> Schedule Exam</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted">
                        {['Date', 'Subject', 'Exam', 'Time', 'Venue', 'Total', ''].map(h => (
                          <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {classExams.map(e => (
                        <tr key={e.id} className="border-b border-border hover:bg-muted/50">
                          <td className="px-3 py-2 text-foreground">{e.date}</td>
                          <td className="px-3 py-2 font-medium text-foreground">{e.subject_name || subjectName(e.subject)}</td>
                          <td className="px-3 py-2 text-foreground">{e.exam_type_name || examTypes.find(t => t.id === e.exam_type)?.name || '-'}</td>
                          <td className="px-3 py-2 text-muted-foreground">{e.start_time || '-'}{e.end_time ? ` – ${e.end_time}` : ''}</td>
                          <td className="px-3 py-2 text-muted-foreground">{e.venue || '-'}</td>
                          <td className="px-3 py-2 text-foreground">{e.total_marks}</td>
                          <td className="px-3 py-2 no-print">
                            <Button size="sm" variant="ghost" onClick={() => removeExam(e)}><Trash2 size={13} className="text-destructive" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {classExams.length === 0 && <div className="p-8 text-center text-muted-foreground">No exams scheduled for this class.</div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marks">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Enter Examination Marks</CardTitle>
                <div className="flex flex-wrap gap-3 mt-2">
                  <Select value={selectedExamId ? String(selectedExamId) : ''} onValueChange={v => { setSelectedExamId(Number(v)); setDrafts({}); }}>
                    <SelectTrigger className="w-80"><SelectValue placeholder="Select an exam" /></SelectTrigger>
                    <SelectContent>
                      {classExams.map(e => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {(e.subject_name || subjectName(e.subject))} — {e.date}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedExam && (
                    <Button onClick={saveMarks} disabled={saving}>
                      {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />} Save Marks
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedExam ? (
                  <div className="p-8 text-center text-muted-foreground">Select an exam to enter marks.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted">
                          {['Student', 'Reg #', `Mark / ${selectedExam.total_marks}`, '%', 'Grade', 'Comment'].map(h => (
                            <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {classStudents.map(st => {
                          const existing = results.find(r => r.exam === selectedExam.id && r.student === st.id);
                          const draft = drafts[st.id];
                          const mark = draft ? draft.mark : existing?.mark != null ? String(existing.mark) : '';
                          const comment = draft ? draft.comment : existing?.comment || '';
                          const pct = mark !== '' ? (Number(mark) / (selectedExam.total_marks || 100)) * 100 : null;
                          return (
                            <tr key={st.id} className="border-b border-border">
                              <td className="px-3 py-2 font-medium text-foreground">{st.first_name} {st.last_name}</td>
                              <td className="px-3 py-2 text-muted-foreground">{st.student_no}</td>
                              <td className="px-3 py-2 w-28">
                                <Input type="number" className="h-8" value={mark}
                                  onChange={e => setDrafts(d => ({ ...d, [st.id]: { mark: e.target.value, comment } }))} />
                              </td>
                              <td className="px-3 py-2 font-bold text-primary">{pct != null ? `${pct.toFixed(1)}%` : '-'}</td>
                              <td className="px-3 py-2">{pct != null ? <Badge>{gradeFor(pct)}</Badge> : '-'}</td>
                              <td className="px-3 py-2">
                                <Input className="h-8" value={comment} placeholder="Comment"
                                  onChange={e => setDrafts(d => ({ ...d, [st.id]: { mark, comment: e.target.value } }))} />
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
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <div className="bg-card rounded-xl shadow-card p-6">
              <div className="flex justify-end no-print mb-2">
                <Button size="sm" variant="outline" onClick={() => window.print()}><Printer size={15} className="mr-1" /> Print</Button>
              </div>
              <ReportHeader reportTitle={`Examination Results — ${filterClass}`} />
              <table className="w-full text-xs mt-4">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    {['Student', 'Reg #', 'Exams Written', 'Average %', 'Grade'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultRows.map(r => (
                    <tr key={r.student.id} className="border-b border-border">
                      <td className="px-3 py-2 font-medium text-foreground">{r.student.first_name} {r.student.last_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.student.student_no}</td>
                      <td className="px-3 py-2 text-foreground">{r.count}</td>
                      <td className="px-3 py-2 font-bold text-primary">{r.count ? `${r.avg.toFixed(1)}%` : '-'}</td>
                      <td className="px-3 py-2">{r.count ? <Badge>{r.grade}</Badge> : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {resultRows.length === 0 && <div className="p-8 text-center text-muted-foreground">No results recorded for this class.</div>}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={typeDialog} onOpenChange={setTypeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Exam Type</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <Input value={newType.name} onChange={e => setNewType(p => ({ ...p, name: e.target.value }))} placeholder="End of Term 1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Term</label>
                <Input value={newType.term} onChange={e => setNewType(p => ({ ...p, term: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Weight (%)</label>
                <Input type="number" value={newType.weight} onChange={e => setNewType(p => ({ ...p, weight: Number(e.target.value) }))} />
              </div>
            </div>
            <Button className="w-full" onClick={addType} disabled={saving}>
              {saving && <Loader2 size={16} className="mr-2 animate-spin" />} Save Exam Type
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={examDialog} onOpenChange={setExamDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Schedule Exam — {filterClass}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Exam Type</label>
                <Select value={newExam.exam_type} onValueChange={v => setNewExam(p => ({ ...p, exam_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {examTypes.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Subject</label>
                <Select value={newExam.subject} onValueChange={v => setNewExam(p => ({ ...p, subject: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <Input type="date" value={newExam.date} onChange={e => setNewExam(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Start</label>
                <Input type="time" value={newExam.start_time} onChange={e => setNewExam(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">End</label>
                <Input type="time" value={newExam.end_time} onChange={e => setNewExam(p => ({ ...p, end_time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Venue</label>
                <Input value={newExam.venue} onChange={e => setNewExam(p => ({ ...p, venue: e.target.value }))} placeholder="Hall A" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Total Marks</label>
                <Input type="number" value={newExam.total_marks} onChange={e => setNewExam(p => ({ ...p, total_marks: Number(e.target.value) }))} />
              </div>
            </div>
            <Button className="w-full" onClick={addExam} disabled={saving}>
              {saving && <Loader2 size={16} className="mr-2 animate-spin" />} Schedule Exam
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
