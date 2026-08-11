// Live Students data from the Django backend (/api/students/student/).
// No dummy data — every read/write hits MySQL through the API.

import { api } from './api';

export interface BackendStudent {
  id: number;
  student_no: string;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string | null;
  branch: number;
  level: string;
  class_name: string;
  residence: 'Day' | 'Boarding';
  status: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  enrolled_at?: string;
}

export interface NewStudentInput {
  student_no: string;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth?: string | null;
  branch: number;
  level: string;
  class_name: string;
  residence: 'Day' | 'Boarding';
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  status?: string;
}

function unwrap<T>(res: any): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && Array.isArray(res.results)) return res.results as T[];
  return [];
}

export async function listStudents(): Promise<BackendStudent[]> {
  return unwrap<BackendStudent>(await api.get('/api/students/student/?limit=1000'));
}

export async function createStudent(input: NewStudentInput): Promise<BackendStudent> {
  return api.post<BackendStudent>('/api/students/student/', input);
}

export interface BackendBranch {
  id: number;
  name?: string;
  code?: string;
}

export async function listBranches(): Promise<BackendBranch[]> {
  return unwrap<BackendBranch>(await api.get('/api/core/branch/?limit=100'));
}

/** First available branch id, used as the default when enrolling. */
export async function defaultBranchId(): Promise<number | null> {
  const branches = await listBranches();
  return branches[0]?.id ?? null;
}
