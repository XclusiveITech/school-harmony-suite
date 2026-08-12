// Live Attendance data from the Django backend (/api/students/attendance/).
// No dummy data — every read/write hits MySQL through the API.

import { api, ApiError } from './api';

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface BackendAttendance {
  id: number;
  student: number;
  student_no?: string;
  student_name?: string;
  class_name?: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  remarks?: string;
  recorded_by?: number | string | null;
}

export interface AttendanceInput {
  student: number;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
  class_name?: string;
}

function unwrap<T>(res: any): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && Array.isArray(res.results)) return res.results as T[];
  return [];
}

/** Attendance rows for a given date (optionally filtered by class). */
export async function listAttendance(date: string, className?: string): Promise<BackendAttendance[]> {
  const qs = new URLSearchParams({ date, limit: '1000' });
  if (className) qs.set('class_name', className);
  return unwrap<BackendAttendance>(await api.get(`/api/students/attendance/?${qs.toString()}`));
}

/** Attendance rows within a date range — used by the register summary. */
export async function listAttendanceRange(from: string, to: string): Promise<BackendAttendance[]> {
  const qs = new URLSearchParams({ date_from: from, date_to: to, limit: '5000' });
  return unwrap<BackendAttendance>(await api.get(`/api/students/attendance/?${qs.toString()}`));
}

/**
 * Save a whole register. Uses the bulk endpoint when the backend exposes it and
 * falls back to one request per row (create or update) otherwise.
 */
export async function saveAttendance(rows: AttendanceInput[]): Promise<number> {
  if (!rows.length) return 0;
  try {
    await api.post('/api/students/attendance/bulk/', { records: rows });
    return rows.length;
  } catch (e) {
    if (!(e instanceof ApiError) || (e.status !== 404 && e.status !== 405)) throw e;
  }

  // Fallback: upsert row by row.
  const existing = await listAttendance(rows[0].date);
  const byStudent = new Map(existing.map(r => [r.student, r.id]));
  let saved = 0;
  for (const row of rows) {
    const id = byStudent.get(row.student);
    if (id) await api.patch(`/api/students/attendance/${id}/`, row);
    else await api.post('/api/students/attendance/', row);
    saved += 1;
  }
  return saved;
}
