// Live Academics / Examinations / Continuous Assessment data from the Django
// backend. No dummy data — every read/write hits MySQL through the API.
//
// Endpoints (DRF routers — see BACKEND_ACADEMICS.md):
//   /api/academics/subject/
//   /api/academics/classroom/
//   /api/academics/catask/
//   /api/academics/casubmission/
//   /api/exams/examtype/
//   /api/exams/exam/
//   /api/exams/result/

import { api, ApiError } from './api';

function unwrap<T>(res: any): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && Array.isArray(res.results)) return res.results as T[];
  return [];
}

/** GET a list, tolerating a backend that has not exposed the route yet. */
async function safeList<T>(path: string): Promise<T[]> {
  try {
    return unwrap<T>(await api.get(path));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return [];
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* Subjects                                                            */
/* ------------------------------------------------------------------ */

export interface BackendSubject {
  id: number;
  code: string;
  name: string;
  type: 'Theory' | 'Practical';
  ca_percent: number;
  classes: string[] | string | null;
  teacher_name?: string | null;
  branch?: number | null;
}

export interface SubjectInput {
  code: string;
  name: string;
  type: 'Theory' | 'Practical';
  ca_percent: number;
  classes: string[];
  teacher_name?: string;
}

/** The backend may store `classes` as JSON array or comma-separated text. */
export function subjectClasses(s: BackendSubject): string[] {
  if (Array.isArray(s.classes)) return s.classes;
  if (typeof s.classes === 'string') {
    return s.classes.split(',').map(c => c.trim()).filter(Boolean);
  }
  return [];
}

export async function listSubjects(): Promise<BackendSubject[]> {
  return safeList<BackendSubject>('/api/academics/subject/?limit=500');
}

export async function createSubject(input: SubjectInput): Promise<BackendSubject> {
  return api.post<BackendSubject>('/api/academics/subject/', input);
}

export async function updateSubject(id: number, input: Partial<SubjectInput>) {
  return api.patch<BackendSubject>(`/api/academics/subject/${id}/`, input);
}

export async function deleteSubject(id: number) {
  return api.delete(`/api/academics/subject/${id}/`);
}

/* ------------------------------------------------------------------ */
/* Classes                                                             */
/* ------------------------------------------------------------------ */

export interface BackendClass {
  id: number;
  name: string;
  level: string;
  capacity?: number | null;
  class_teacher?: string | null;
  student_count?: number;
  branch?: number | null;
}

export interface ClassInput {
  name: string;
  level: string;
  capacity?: number;
  class_teacher?: string;
}

export async function listClasses(): Promise<BackendClass[]> {
  return safeList<BackendClass>('/api/academics/classroom/?limit=500');
}

export async function createClass(input: ClassInput): Promise<BackendClass> {
  return api.post<BackendClass>('/api/academics/classroom/', input);
}

export async function updateClass(id: number, input: Partial<ClassInput>) {
  return api.patch<BackendClass>(`/api/academics/classroom/${id}/`, input);
}

export async function deleteClass(id: number) {
  return api.delete(`/api/academics/classroom/${id}/`);
}

/* ------------------------------------------------------------------ */
/* Continuous assessment                                               */
/* ------------------------------------------------------------------ */

export type CATaskType = 'Homework' | 'In-Class Test' | 'Project';

export interface BackendCATask {
  id: number;
  subject: number;
  subject_name?: string;
  class_name: string;
  title: string;
  description?: string;
  type: CATaskType;
  due_date: string;
  total_marks: number;
  status: 'Published' | 'Draft';
  created_at?: string;
}

export interface CATaskInput {
  subject: number;
  class_name: string;
  title: string;
  description?: string;
  type: CATaskType;
  due_date: string;
  total_marks: number;
  status: 'Published' | 'Draft';
}

export interface BackendCASubmission {
  id: number;
  task: number;
  student: number;
  student_name?: string;
  student_no?: string;
  status: 'Pending' | 'Submitted' | 'Graded';
  mark?: number | null;
  feedback?: string | null;
  submitted_at?: string | null;
}

export async function listCATasks(className?: string): Promise<BackendCATask[]> {
  const qs = new URLSearchParams({ limit: '500' });
  if (className) qs.set('class_name', className);
  return safeList<BackendCATask>(`/api/academics/catask/?${qs.toString()}`);
}

export async function createCATask(input: CATaskInput): Promise<BackendCATask> {
  return api.post<BackendCATask>('/api/academics/catask/', input);
}

export async function deleteCATask(id: number) {
  return api.delete(`/api/academics/catask/${id}/`);
}

export async function listCASubmissions(taskId?: number): Promise<BackendCASubmission[]> {
  const qs = new URLSearchParams({ limit: '2000' });
  if (taskId) qs.set('task', String(taskId));
  return safeList<BackendCASubmission>(`/api/academics/casubmission/?${qs.toString()}`);
}

/** Create Pending submission rows for a class roster (used after task creation). */
export async function seedSubmissions(taskId: number, studentIds: number[]): Promise<number> {
  if (!studentIds.length) return 0;
  const rows = studentIds.map(student => ({ task: taskId, student, status: 'Pending' as const }));
  try {
    await api.post('/api/academics/casubmission/bulk/', { records: rows });
    return rows.length;
  } catch (e) {
    if (!(e instanceof ApiError) || (e.status !== 404 && e.status !== 405)) throw e;
  }
  let n = 0;
  for (const row of rows) {
    await api.post('/api/academics/casubmission/', row);
    n += 1;
  }
  return n;
}

export async function gradeSubmission(
  id: number,
  mark: number,
  feedback: string,
): Promise<BackendCASubmission> {
  return api.patch<BackendCASubmission>(`/api/academics/casubmission/${id}/`, {
    mark,
    feedback,
    status: 'Graded',
  });
}

/** Create a graded submission when the roster row does not exist yet. */
export async function createGradedSubmission(
  task: number,
  student: number,
  mark: number,
  feedback: string,
): Promise<BackendCASubmission> {
  return api.post<BackendCASubmission>('/api/academics/casubmission/', {
    task,
    student,
    mark,
    feedback,
    status: 'Graded',
  });
}

/* ------------------------------------------------------------------ */
/* Examinations                                                        */
/* ------------------------------------------------------------------ */

export interface BackendExamType {
  id: number;
  name: string;
  weight: number;
  term?: string | null;
}

export interface BackendExam {
  id: number;
  exam_type: number;
  exam_type_name?: string;
  subject: number;
  subject_name?: string;
  class_name: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  venue?: string | null;
  total_marks: number;
}

export interface ExamInput {
  exam_type: number;
  subject: number;
  class_name: string;
  date: string;
  start_time?: string;
  end_time?: string;
  venue?: string;
  total_marks: number;
}

export interface BackendExamResult {
  id: number;
  exam: number;
  exam_name?: string;
  subject_name?: string;
  student: number;
  student_name?: string;
  student_no?: string;
  mark: number;
  total_marks?: number;
  percentage?: number;
  grade?: string | null;
  comment?: string | null;
}

export async function listExamTypes(): Promise<BackendExamType[]> {
  return safeList<BackendExamType>('/api/exams/examtype/?limit=200');
}

export async function createExamType(input: { name: string; weight: number; term?: string }) {
  return api.post<BackendExamType>('/api/exams/examtype/', input);
}

export async function listExams(className?: string): Promise<BackendExam[]> {
  const qs = new URLSearchParams({ limit: '500' });
  if (className) qs.set('class_name', className);
  return safeList<BackendExam>(`/api/exams/exam/?${qs.toString()}`);
}

export async function createExam(input: ExamInput): Promise<BackendExam> {
  return api.post<BackendExam>('/api/exams/exam/', input);
}

export async function deleteExam(id: number) {
  return api.delete(`/api/exams/exam/${id}/`);
}

export async function listExamResults(examId?: number): Promise<BackendExamResult[]> {
  const qs = new URLSearchParams({ limit: '2000' });
  if (examId) qs.set('exam', String(examId));
  return safeList<BackendExamResult>(`/api/exams/result/?${qs.toString()}`);
}

export interface ExamResultInput {
  exam: number;
  student: number;
  mark: number;
  comment?: string;
}

/** Save a whole mark sheet; bulk endpoint with per-row upsert fallback. */
export async function saveExamResults(examId: number, rows: ExamResultInput[]): Promise<number> {
  if (!rows.length) return 0;
  try {
    await api.post('/api/exams/result/bulk/', { records: rows });
    return rows.length;
  } catch (e) {
    if (!(e instanceof ApiError) || (e.status !== 404 && e.status !== 405)) throw e;
  }
  const existing = await listExamResults(examId);
  const byStudent = new Map(existing.map(r => [r.student, r.id]));
  let saved = 0;
  for (const row of rows) {
    const id = byStudent.get(row.student);
    if (id) await api.patch(`/api/exams/result/${id}/`, row);
    else await api.post('/api/exams/result/', row);
    saved += 1;
  }
  return saved;
}

export function gradeFor(pct: number): string {
  return pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';
}
