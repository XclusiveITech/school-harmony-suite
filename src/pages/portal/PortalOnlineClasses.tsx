import React from 'react';
import { usePortalStudent } from './StudentPortalLayout';
import { loadState, coursesForStudent } from '@/lib/online-classes-store';
import { staff } from '@/lib/dummy-data';
import { Video, BookOpen, FileText, ExternalLink, Calendar, CheckCircle2 } from 'lucide-react';

export default function PortalOnlineClasses() {
  const student = usePortalStudent();
  const state = loadState();
  const myCourses = coursesForStudent(student.regNumber, student.className);
  const myCourseIds = new Set(myCourses.map(c => c.id));
  const mySessions = state.sessions.filter(s => myCourseIds.has(s.courseId)).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const myAssignments = state.assignments.filter(a => myCourseIds.has(a.courseId)).sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Online Classes</h1>
        <p className="text-sm text-muted-foreground">
          {myCourses.length} courses
          {state.classroomConnected && (
            <span className="ml-2 inline-flex items-center gap-1 text-success text-xs">
              <CheckCircle2 size={12} /> Google Classroom
            </span>
          )}
        </p>
      </div>

      {/* Courses */}
      <section>
        <h2 className="font-display text-sm font-semibold text-foreground mb-3">My Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myCourses.map(c => {
            const teacher = staff.find(s => s.id === c.teacherId);
            return (
              <div key={c.id} className="bg-card rounded-xl shadow-card p-5 space-y-3">
                <div className="p-2 rounded-lg bg-primary/10 w-fit">
                  <BookOpen size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{c.name}</h3>
                  <p className="text-xs text-muted-foreground">{c.section} {teacher && `• ${teacher.firstName} ${teacher.lastName}`}</p>
                </div>
                {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                {c.meetLink && (
                  <a href={c.meetLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg gradient-primary text-primary-foreground text-xs">
                    <Video size={14} /> Join Class
                  </a>
                )}
              </div>
            );
          })}
          {myCourses.length === 0 && <div className="md:col-span-3 text-center text-muted-foreground py-8">No courses yet</div>}
        </div>
      </section>

      {/* Upcoming sessions */}
      <section>
        <h2 className="font-display text-sm font-semibold text-foreground mb-3">Upcoming Live Sessions</h2>
        <div className="bg-card rounded-xl shadow-card divide-y divide-border">
          {mySessions.map(s => {
            const c = state.courses.find(x => x.id === s.courseId);
            return (
              <div key={s.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-primary" />
                  <div>
                    <p className="font-medium text-foreground text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{c?.name} • {new Date(s.startAt).toLocaleString()} • {s.durationMins} mins</p>
                  </div>
                </div>
                {s.meetLink && (
                  <a href={s.meetLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary text-xs hover:underline">
                    Join <ExternalLink size={12} />
                  </a>
                )}
              </div>
            );
          })}
          {mySessions.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">No upcoming sessions</div>}
        </div>
      </section>

      {/* Assignments */}
      <section>
        <h2 className="font-display text-sm font-semibold text-foreground mb-3">Assignments</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myAssignments.map(a => {
            const c = state.courses.find(x => x.id === a.courseId);
            const overdue = new Date(a.dueAt).getTime() < Date.now();
            return (
              <div key={a.id} className="bg-card rounded-xl shadow-card p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">{a.title}</h4>
                    <p className="text-xs text-muted-foreground">{c?.name} • Due {new Date(a.dueAt).toLocaleString()}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-md font-medium ${overdue ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                    {overdue ? 'Overdue' : `${a.points} pts`}
                  </span>
                </div>
                {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
                {a.classroomLink && (
                  <a href={a.classroomLink} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    <FileText size={12} /> Open in Classroom <ExternalLink size={12} />
                  </a>
                )}
              </div>
            );
          })}
          {myAssignments.length === 0 && <div className="md:col-span-2 text-center text-muted-foreground py-8 text-sm">No assignments</div>}
        </div>
      </section>
    </div>
  );
}
