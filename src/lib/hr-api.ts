// Live HR & Payroll data from the Django backend. No dummy data — staff
// records, salaries, payroll runs and payslips all persist to MySQL.
//
// Endpoints (DRF routers — see BACKEND_HR.md):
//   /api/hr/staff/
//   /api/hr/leaverequest/
//   /api/hr/payrollrun/
//   /api/hr/payrollrun/<id>/generate/
//   /api/hr/payslip/?run=<id>

import { api, ApiError } from './api';

export function unwrap<T>(res: any): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && Array.isArray(res.results)) return res.results as T[];
  return [];
}

export async function safeList<T>(path: string): Promise<T[]> {
  try {
    return unwrap<T>(await api.get(path));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return [];
    throw e;
  }
}

export function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
}

/* ------------------------------------------------------------------ */
/* Staff                                                               */
/* ------------------------------------------------------------------ */

export type StaffStatus = 'Active' | 'On Leave' | 'Inactive';

export interface BackendStaff {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  department: string;
  status: StaffStatus;
  salary: number | string;
  branch?: number | null;
  branch_name?: string | null;
  joined_at?: string | null;
}

export interface StaffInput {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  department: string;
  status: StaffStatus;
  salary: number;
  branch?: number | null;
}

export async function listStaff(): Promise<BackendStaff[]> {
  return safeList<BackendStaff>('/api/hr/staff/?limit=500');
}

export async function createStaff(input: StaffInput): Promise<BackendStaff> {
  return api.post<BackendStaff>('/api/hr/staff/', input);
}

export async function updateStaff(id: number, input: Partial<StaffInput>) {
  return api.patch<BackendStaff>(`/api/hr/staff/${id}/`, input);
}

export async function deleteStaff(id: number) {
  return api.delete(`/api/hr/staff/${id}/`);
}

export const staffName = (s: BackendStaff) => `${s.first_name} ${s.last_name}`.trim();

/* ------------------------------------------------------------------ */
/* Leave                                                               */
/* ------------------------------------------------------------------ */

export interface BackendLeaveRequest {
  id: number;
  staff: number;
  staff_name?: string | null;
  type: string;
  start_date: string;
  end_date: string;
  days: number | string;
  paid: boolean;
  status: 'Pending' | 'Approved' | 'Rejected';
  reason?: string;
}

export async function listLeaveRequests(): Promise<BackendLeaveRequest[]> {
  return safeList<BackendLeaveRequest>('/api/hr/leaverequest/?limit=500');
}

export async function setLeaveStatus(id: number, status: 'Approved' | 'Rejected') {
  return api.patch(`/api/hr/leaverequest/${id}/`, { status });
}

/* ------------------------------------------------------------------ */
/* Payroll                                                             */
/* ------------------------------------------------------------------ */

export interface BackendPayslip {
  id: number;
  run: number;
  staff: number;
  staff_name?: string | null;
  employee_id?: string | null;
  gross: number | string;
  tax: number | string;
  pension: number | string;
  leave_deduction: number | string;
  unpaid_days: number | string;
  total_deductions: number | string;
  net: number | string;
}

export interface BackendPayrollRun {
  id: number;
  period: string;            // e.g. 2026-03
  status: 'Draft' | 'Generated' | 'Posted';
  created_at?: string;
  total_gross?: number | string;
  total_net?: number | string;
  payslip_count?: number;
}

export async function listPayrollRuns(): Promise<BackendPayrollRun[]> {
  return safeList<BackendPayrollRun>('/api/hr/payrollrun/?limit=100');
}

export async function createPayrollRun(period: string): Promise<BackendPayrollRun> {
  return api.post<BackendPayrollRun>('/api/hr/payrollrun/', { period });
}

/** Server-side generation: builds a payslip per active staff member. */
export async function generatePayroll(runId: number): Promise<BackendPayrollRun> {
  return api.post<BackendPayrollRun>(`/api/hr/payrollrun/${runId}/generate/`, {});
}

export async function listPayslips(runId: number): Promise<BackendPayslip[]> {
  return safeList<BackendPayslip>(`/api/hr/payslip/?run=${runId}&limit=500`);
}

/** Unpaid-leave daily rate: monthly salary / 22 working days. */
export const dailyRate = (monthlySalary: number) => monthlySalary / 22;
