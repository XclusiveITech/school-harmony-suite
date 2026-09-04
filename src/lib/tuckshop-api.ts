// Live Tuckshop data from the Django backend. No dummy data — every read and
// write hits MySQL through the API.
//
// Endpoints (DRF routers — see BACKEND_TUCKSHOP.md):
//   /api/tuckshop/product/
//   /api/tuckshop/shift/
//   /api/tuckshop/sale/
//   /api/tuckshop/wastage/

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

export type PaymentMethod = 'Cash' | 'Student Card' | 'Parent Account';
export type SaleStatus = 'Completed' | 'Voided' | 'Refunded';

export interface BackendTuckProduct {
  id: number;
  sku: string;
  name: string;
  barcode?: string | null;
  unit_cost: number | string;
  selling_price: number | string;
  stock: number | string;
  reorder_level: number | string;
  active?: boolean;
}

export interface BackendSaleLine {
  id?: number;
  product: number;
  product_name?: string;
  quantity: number | string;
  unit_price: number | string;
  unit_cost?: number | string;
}

export interface BackendSale {
  id: number;
  ref: string;
  date: string;
  shift: number | null;
  operator: string;
  payment_method: PaymentMethod;
  student_id?: string | null;
  student_name?: string | null;
  subtotal: number | string;
  cogs: number | string;
  status: SaleStatus;
  void_reason?: string | null;
  lines: BackendSaleLine[];
}

export interface BackendShift {
  id: number;
  ref: string;
  operator: string;
  opened_at: string;
  closed_at?: string | null;
  opening_cash: number | string;
  declared_cash?: number | string | null;
  expected_cash?: number | string | null;
  variance?: number | string | null;
  status: 'Open' | 'Closed';
  notes?: string | null;
}

export interface BackendWastage {
  id: number;
  ref: string;
  date: string;
  product: number;
  product_name?: string;
  quantity: number | string;
  reason: string;
  cost: number | string;
  operator?: string | null;
}

export const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
};

/* ------------------------------- Products ------------------------------- */

export const listProducts = () => safeList<BackendTuckProduct>('/api/tuckshop/product/');

export const createProduct = (data: Partial<BackendTuckProduct>) =>
  api.post<BackendTuckProduct>('/api/tuckshop/product/', data);

export const updateProduct = (id: number, data: Partial<BackendTuckProduct>) =>
  api.patch<BackendTuckProduct>(`/api/tuckshop/product/${id}/`, data);

export const setSellingPrice = (id: number, selling_price: number) =>
  updateProduct(id, { selling_price });

/* -------------------------------- Shifts -------------------------------- */

export const listShifts = () => safeList<BackendShift>('/api/tuckshop/shift/');

export const openShift = (operator: string, opening_cash: number) =>
  api.post<BackendShift>('/api/tuckshop/shift/', { operator, opening_cash, status: 'Open' });

export async function closeShift(id: number, declared_cash: number, notes?: string) {
  try {
    return await api.post<BackendShift>(`/api/tuckshop/shift/${id}/close/`, { declared_cash, notes });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 405)) {
      // Fallback: plain update when the custom action is unavailable.
      return api.patch<BackendShift>(`/api/tuckshop/shift/${id}/`, {
        declared_cash, notes, status: 'Closed', closed_at: new Date().toISOString(),
      });
    }
    throw e;
  }
}

/* --------------------------------- Sales -------------------------------- */

export const listSales = () => safeList<BackendSale>('/api/tuckshop/sale/');

export const createSale = (data: {
  shift: number | null;
  operator: string;
  payment_method: PaymentMethod;
  student_id?: string;
  student_name?: string;
  lines: { product: number; quantity: number; unit_price: number }[];
}) => api.post<BackendSale>('/api/tuckshop/sale/', data);

export async function changeSaleStatus(id: number, status: 'Voided' | 'Refunded', reason: string) {
  const action = status === 'Voided' ? 'void' : 'refund';
  try {
    return await api.post<BackendSale>(`/api/tuckshop/sale/${id}/${action}/`, { reason });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 405)) {
      return api.patch<BackendSale>(`/api/tuckshop/sale/${id}/`, { status, void_reason: reason });
    }
    throw e;
  }
}

/* -------------------------------- Wastage ------------------------------- */

export const listWastage = () => safeList<BackendWastage>('/api/tuckshop/wastage/');

export const createWastage = (data: {
  product: number; quantity: number; reason: string; operator?: string;
}) => api.post<BackendWastage>('/api/tuckshop/wastage/', data);
