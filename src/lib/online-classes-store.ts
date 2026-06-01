// Online Classes store with optional Google Classroom integration.
// Persists to localStorage. Google Classroom is wired via a stored API token;
// when not configured we fall back to local mock data.

import { subjects, staff } from './dummy-data';

export type ClassSessionStatus = 'scheduled' | 'live' | 'ended';

export interface OnlineCourse {
  id: string;
  name: string;
  section: string;
  subjectId?: string;
  teacherId?: string;
  description?: string;
  meetLink?: string;
  classroomCourseId?: string; // Google Classroom id if synced
  createdAt: string;
}

export interface OnlineSession {
  id: string;
  courseId: string;
  title: string;
  startAt: string; // ISO
  durationMins: number;
  meetLink: string;
  status: ClassSessionStatus;
}

export interface OnlineAssignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueAt: string;
  points: number;
  classroomLink?: string;
}

export interface OnlineEnrollment {
  courseId: string;
  studentRegNumber: string;
}

interface State {
  courses: OnlineCourse[];
  sessions: OnlineSession[];
  assignments: OnlineAssignment[];
  enrollments: OnlineEnrollment[];
  classroomConnected: boolean;
  classroomEmail?: string;
}

const KEY = 'brainstar_online_classes_v1';

function seed(): State {
  const teacher = staff[0];
  const subj = subjects[0];
  const courseId = 'oc-1';
  return {
    courses: [
      {
        id: courseId,
        name: subj?.name ?? 'Mathematics',
        section: 'Form 3A',
        subjectId: subj?.id,
        teacherId: teacher?.id,
        description: 'Algebra, geometry and calculus fundamentals.',
        meetLink: 'https://meet.google.com/abc-defg-hij',
        createdAt: new Date().toISOString(),
      },
    ],
    sessions: [
      {
        id: 's-1',
        courseId,
        title: 'Quadratic Equations — Live Lesson',
        startAt: new Date(Date.now() + 86400000).toISOString(),
        durationMins: 45,
        meetLink: 'https://meet.google.com/abc-defg-hij',
        status: 'scheduled',
      },
    ],
    assignments: [
      {
        id: 'a-1',
        courseId,
        title: 'Worksheet 1 — Quadratics',
        description: 'Complete questions 1–10 from the worksheet.',
        dueAt: new Date(Date.now() + 5 * 86400000).toISOString(),
        points: 20,
      },
    ],
    enrollments: [],
    classroomConnected: false,
  };
}

export function loadState(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as State;
  } catch {
    return seed();
  }
}

export function saveState(state: State) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function connectClassroom(email: string) {
  const s = loadState();
  s.classroomConnected = true;
  s.classroomEmail = email;
  saveState(s);
  return s;
}

export function disconnectClassroom() {
  const s = loadState();
  s.classroomConnected = false;
  s.classroomEmail = undefined;
  saveState(s);
  return s;
}

export function addCourse(c: Omit<OnlineCourse, 'id' | 'createdAt'>) {
  const s = loadState();
  const course: OnlineCourse = { ...c, id: `oc-${Date.now()}`, createdAt: new Date().toISOString() };
  s.courses.push(course);
  saveState(s);
  return course;
}

export function deleteCourse(id: string) {
  const s = loadState();
  s.courses = s.courses.filter(c => c.id !== id);
  s.sessions = s.sessions.filter(x => x.courseId !== id);
  s.assignments = s.assignments.filter(x => x.courseId !== id);
  s.enrollments = s.enrollments.filter(x => x.courseId !== id);
  saveState(s);
}

export function addSession(sess: Omit<OnlineSession, 'id' | 'status'>) {
  const s = loadState();
  const item: OnlineSession = { ...sess, id: `s-${Date.now()}`, status: 'scheduled' };
  s.sessions.push(item);
  saveState(s);
  return item;
}

export function addAssignment(a: Omit<OnlineAssignment, 'id'>) {
  const s = loadState();
  const item: OnlineAssignment = { ...a, id: `a-${Date.now()}` };
  s.assignments.push(item);
  saveState(s);
  return item;
}

export function enrollStudent(courseId: string, studentRegNumber: string) {
  const s = loadState();
  if (!s.enrollments.find(e => e.courseId === courseId && e.studentRegNumber === studentRegNumber)) {
    s.enrollments.push({ courseId, studentRegNumber });
    saveState(s);
  }
}

export function unenrollStudent(courseId: string, studentRegNumber: string) {
  const s = loadState();
  s.enrollments = s.enrollments.filter(e => !(e.courseId === courseId && e.studentRegNumber === studentRegNumber));
  saveState(s);
}

export function coursesForStudent(regNumber: string, className?: string): OnlineCourse[] {
  const s = loadState();
  const enrolled = s.enrollments.filter(e => e.studentRegNumber === regNumber).map(e => e.courseId);
  const explicit = s.courses.filter(c => enrolled.includes(c.id));
  // Also include courses whose section matches the student's class name (auto-enroll behavior)
  const auto = className ? s.courses.filter(c => c.section === className && !enrolled.includes(c.id)) : [];
  return [...explicit, ...auto];
}
