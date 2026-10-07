// Live Fees Structure data from the Django backend (/api/finance/feestructure/).
// Versioning (activate / new_version) and billing (bill_students) are
// performed server-side — see BACKEND_FEES.md.

import { api, ApiError } from './api';
import { safeList, num } from './finance-api';

export type FeeStructureStatus = 'Draft' | 'Active' | 'Archived';

export interface BackendFeeItem {
  id?: number;
  name: string;
  amount: number | string;
  gl_account: number; // FK id -> GLAccount
  gl_account_code?: string | null; // convenience field returned by the serializer
  mandatory: boolean;
}

export interface BackendFeeStructure {
  id: number;
  name: string;
  level: string;
  class_name?: string | null;
  term: string;
  year: string;
  currency: string;
  version: number;
  status: FeeStructureStatus;
  effective_from: string;
  parent?: number | null;
  created_at?: string;
  items: BackendFeeItem[];
}

export interface FeeStructureInput {
  name: string;
  level: string;
  class_name?: string | null;
  term: string;
  year: string;
  currency: string;
  effective_from: string;
  items: { name: string; amount: number; gl_account: number; mandatory: boolean }[];
}

export async function listFeeStructures(): Promise<BackendFeeStructure[]> {
  return safeList<BackendFeeStructure>('/api/finance/feestructure/?limit=500');
}

export async function createFeeStructure(input: FeeStructureInput): Promise<BackendFeeStructure> {
  return api.post<BackendFeeStructure>('/api/finance/feestructure/', input);
}

export async function updateFeeStructure(id: number, input: FeeStructureInput): Promise<BackendFeeStructure> {
  return api.put<BackendFeeStructure>(`/api/finance/feestructure/${id}/`, input);
}

export async function activateFeeStructure(id: number): Promise<BackendFeeStructure> {
  return api.post<BackendFeeStructure>(`/api/finance/feestructure/${id}/activate/`, {});
}

export async function newVersionFeeStructure(id: number): Promise<BackendFeeStructure> {
  return api.post<BackendFeeStructure>(`/api/finance/feestructure/${id}/new_version/`, {});
}

export async function billStudentsForFeeStructure(id: number): Promise<{ count: number }> {
  return api.post<{ count: number }>(`/api/finance/feestructure/${id}/bill_students/`, {});
}

export { ApiError, num };
