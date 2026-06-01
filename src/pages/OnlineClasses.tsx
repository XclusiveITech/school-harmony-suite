import React, { useState } from 'react';
import {
  loadState, saveState, addCourse, deleteCourse, addSession, addAssignment,
  connectClassroom, disconnectClassroom, enrollStudent,
  type OnlineCourse,
} from '@/lib/online-classes-store';
import { subjects, staff, students } from '@/lib/dummy-data';
import {
  Video, Plus, Trash2, ExternalLink, Calendar, BookOpen, Link2, Unlink,
  Users, FileText, CheckCircle2, X
} from 'lucide-react';
import { toast } from 'sonner';

const tabs = [
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'sessions', label: 'Live Sessions', icon: Video },
  { id: 'assignments', label: 'Assignments', icon: FileText },
  { id: 'integration', label: 'Google Classroom', icon: Link2 },
] as const;
type TabId = (typeof tabs)[number]['id'];

export default function OnlineClasses() {
  const [tab, setTab] = useState<TabId>('courses');
  const [state, setState] = useState(loadState());
  const refresh = () => setState(loadState());

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Online Classes</h1>
          <p className="text-sm text-muted-foreground">
            Virtual classrooms, live sessions, and assignments
            {state.classroomConnected && (
              <span className="ml-2 inline-flex items-center gap-1 text-success">
                <CheckCircle2 size={14} /> Google Classroom connected
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'courses' && <CoursesPanel state={state} refresh={refresh} />}
      {tab === 'sessions' && <SessionsPanel state={state} refresh={refresh} />}
      {tab === 'assignments' && <AssignmentsPanel state={state} refresh={refresh} />}
      {tab === 'integration' && <IntegrationPanel state={state} refresh={refresh} />}
    </div>
  );
}

function CoursesPanel({ state, refresh }: { state: ReturnType<typeof loadState>; refresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', section: '', subjectId: '', teacherId: '', description: '', meetLink: '' });

  const submit = () => {
    if (!form.name || !form.section) return toast.error('Name and section required');
    addCourse(form);
    toast.success('Course created');
    if (state.classroomConnected) toast.message('Synced to Google Classroom (simulated)');
    setOpen(false);
    setForm({ name: '', section: '', subjectId: '', teacherId: '', description: '', meetLink: '' });
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm">
          <Plus size={16} /> New Course
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.courses.map(c => {
          const teacher = staff.find(s => s.id === c.teacherId);
          const enrolled = state.enrollments.filter(e => e.courseId === c.id).length;
          const autoEnrolled = students.filter(s => s.className === c.section).length;
          return (
            <div key={c.id} className="bg-card rounded-xl shadow-card p-5 space-y-3 hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen size={20} className="text-primary" />
                </div>
                <button onClick={() => { if (confirm('Delete course?')) { deleteCourse(c.id); refresh(); toast.success('Deleted'); } }} className="text-muted-foreground hover:text-destructive">
                  <Trash2 size={16} />
                </button>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{c.name}</h3>
                <p className="text-xs text-muted-foreground">{c.section} {teacher && `• ${teacher.firstName} ${teacher.lastName}`}</p>
              </div>
              {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
              <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
                <span className="flex items-center gap-1 text-muted-foreground"><Users size={12} /> {enrolled + autoEnrolled} students</span>
                {c.meetLink && (
                  <a href={c.meetLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                    <Video size={12} /> Meet
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <Modal title="New Online Course" onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <Field label="Course name"><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Section (class name)"><input className="input" placeholder="e.g. Form 3A" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} /></Field>
            <Field label="Subject">
              <select className="input" value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })}>
                <option value="">— None —</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Teacher">
              <select className="input" value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })}>
                <option value="">— None —</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </Field>
            <Field label="Google Meet link"><input className="input" placeholder="https://meet.google.com/..." value={form.meetLink} onChange={e => setForm({ ...form, meetLink: e.target.value })} /></Field>
            <Field label="Description"><textarea className="input min-h-[80px]" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
            <button onClick={submit} className="w-full px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm">Create Course</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SessionsPanel({ state, refresh }: { state: ReturnType<typeof loadState>; refresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ courseId: state.courses[0]?.id ?? '', title: '', startAt: '', durationMins: 45, meetLink: '' });

  const submit = () => {
    if (!form.courseId || !form.title || !form.startAt) return toast.error('All fields required');
    const link = form.meetLink || state.courses.find(c => c.id === form.courseId)?.meetLink || '';
    addSession({ ...form, meetLink: link });
    toast.success('Session scheduled');
    setOpen(false);
    setForm({ courseId: state.courses[0]?.id ?? '', title: '', startAt: '', durationMins: 45, meetLink: '' });
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm">
          <Plus size={16} /> Schedule Session
        </button>
      </div>
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Join</th>
            </tr>
          </thead>
          <tbody>
            {state.sessions.map(s => {
              const c = state.courses.find(x => x.id === s.courseId);
              return (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3">{c?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{s.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(s.startAt).toLocaleString()}</td>
                  <td className="px-4 py-3">{s.durationMins} mins</td>
                  <td className="px-4 py-3">
                    {s.meetLink ? (
                      <a href={s.meetLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        <Video size={14} /> Join <ExternalLink size={12} />
                      </a>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              );
            })}
            {state.sessions.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No sessions scheduled</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title="Schedule Live Session" onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <Field label="Course">
              <select className="input" value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })}>
                {state.courses.map(c => <option key={c.id} value={c.id}>{c.name} — {c.section}</option>)}
              </select>
            </Field>
            <Field label="Title"><input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Start"><input type="datetime-local" className="input" value={form.startAt} onChange={e => setForm({ ...form, startAt: e.target.value })} /></Field>
            <Field label="Duration (mins)"><input type="number" className="input" value={form.durationMins} onChange={e => setForm({ ...form, durationMins: Number(e.target.value) })} /></Field>
            <Field label="Meet link (override)"><input className="input" placeholder="Defaults to course Meet link" value={form.meetLink} onChange={e => setForm({ ...form, meetLink: e.target.value })} /></Field>
            <button onClick={submit} className="w-full px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm">Schedule</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AssignmentsPanel({ state, refresh }: { state: ReturnType<typeof loadState>; refresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ courseId: state.courses[0]?.id ?? '', title: '', description: '', dueAt: '', points: 10, classroomLink: '' });

  const submit = () => {
    if (!form.courseId || !form.title || !form.dueAt) return toast.error('All fields required');
    addAssignment(form);
    toast.success('Assignment posted');
    setOpen(false);
    setForm({ courseId: state.courses[0]?.id ?? '', title: '', description: '', dueAt: '', points: 10, classroomLink: '' });
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm">
          <Plus size={16} /> New Assignment
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.assignments.map(a => {
          const c = state.courses.find(x => x.id === a.courseId);
          return (
            <div key={a.id} className="bg-card rounded-xl shadow-card p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">{a.title}</h4>
                  <p className="text-xs text-muted-foreground">{c?.name} • Due {new Date(a.dueAt).toLocaleString()}</p>
                </div>
                <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary font-medium">{a.points} pts</span>
              </div>
              {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
              {a.classroomLink && (
                <a href={a.classroomLink} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                  Open in Classroom <ExternalLink size={12} />
                </a>
              )}
            </div>
          );
        })}
        {state.assignments.length === 0 && (
          <div className="md:col-span-2 text-center text-muted-foreground py-8">No assignments yet</div>
        )}
      </div>

      {open && (
        <Modal title="New Assignment" onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <Field label="Course">
              <select className="input" value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })}>
                {state.courses.map(c => <option key={c.id} value={c.id}>{c.name} — {c.section}</option>)}
              </select>
            </Field>
            <Field label="Title"><input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Due date"><input type="datetime-local" className="input" value={form.dueAt} onChange={e => setForm({ ...form, dueAt: e.target.value })} /></Field>
            <Field label="Points"><input type="number" className="input" value={form.points} onChange={e => setForm({ ...form, points: Number(e.target.value) })} /></Field>
            <Field label="Google Classroom link (optional)"><input className="input" value={form.classroomLink} onChange={e => setForm({ ...form, classroomLink: e.target.value })} /></Field>
            <Field label="Description"><textarea className="input min-h-[80px]" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
            <button onClick={submit} className="w-full px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm">Post Assignment</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function IntegrationPanel({ state, refresh }: { state: ReturnType<typeof loadState>; refresh: () => void }) {
  const [email, setEmail] = useState(state.classroomEmail ?? '');

  const handleConnect = () => {
    if (!email.includes('@')) return toast.error('Enter a valid Google account email');
    connectClassroom(email);
    toast.success('Google Classroom connected');
    refresh();
  };

  const handleDisconnect = () => {
    disconnectClassroom();
    toast.success('Disconnected');
    refresh();
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-card rounded-xl shadow-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Link2 size={24} className="text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">Google Classroom</h3>
            <p className="text-sm text-muted-foreground">Sync courses, sessions, and assignments to Google Classroom.</p>
          </div>
        </div>

        {state.classroomConnected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 text-success text-sm">
              <CheckCircle2 size={16} /> Connected as <strong>{state.classroomEmail}</strong>
            </div>
            <p className="text-xs text-muted-foreground">
              Courses you create will mirror to Google Classroom under this account. Students with matching school
              emails can accept invites automatically.
            </p>
            <button onClick={handleDisconnect} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">
              <Unlink size={16} /> Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="Google Workspace email">
              <input className="input" type="email" placeholder="teacher@school.edu" value={email} onChange={e => setEmail(e.target.value)} />
            </Field>
            <button onClick={handleConnect} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm">
              <Link2 size={16} /> Connect Google Classroom
            </button>
            <p className="text-xs text-muted-foreground">
              For full OAuth sync with Google Classroom APIs, contact admin to enable the Google Workspace integration in
              Lovable Cloud.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-card-hover max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <style>{`.input{display:block;width:100%;padding:0.5rem 0.75rem;border:1px solid hsl(var(--border));border-radius:0.5rem;background:hsl(var(--background));font-size:0.875rem;color:hsl(var(--foreground))}`}</style>
        {children}
      </div>
    </div>
  );
}
