// Live Accounts-Payable (creditors) data from the Django backend. No dummy
// data — suppliers, supplier bills and supplier payments all persist to
// MySQL. See BACKEND_PAYABLES.md for the backend contract.
//
// Endpoints (DRF routers):
//   /api/finance/supplier/
//   /api/finance/supplierbill/
//   /api/finance/supplierpayment/
//   /api/finance/supplierstatementline/   (creditors reconciliation)

import { api, ApiError } from './api';
import { safeList, num } from './finance-api';

/* ------------------------------------------------------------------ */
/* Suppliers                                                           */
/* ------------------------------------------------------------------ */

export interface BackendSupplier {
  id: number;
  code: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  bank_details?: string | null;
  tax_number?: string | null;
  payment_terms?: number | string | null;
  status: 'Active' | 'Inactive';
}

export interface SupplierInput {
  code: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  bank_details?: string;
  tax_number?: string;
  payment_terms?: number;
  status?: 'Active' | 'Inactive';
}

export async function listSuppliers(): Promise<BackendSupplier[]> {
  return safeList<BackendSupplier>('/api/finance/supplier/?limit=500');
}

export async function createSupplier(input: SupplierInput): Promise<BackendSupplier> {
  return api.post<BackendSupplier>('/api/finance/supplier/', input);
}

export async function updateSupplier(id: number, input: Partial<SupplierInput>): Promise<BackendSupplier> {
  return api.patch<BackendSupplier>(`/api/finance/supplier/${id}/`, input);
}

/* ------------------------------------------------------------------ */
/* Supplier bills (purchase invoices)                                  */
/* ------------------------------------------------------------------ */

export type BillStatus = 'Unpaid' | 'Partial' | 'Paid' | 'Cancelled';

export interface BackendSupplierBill {
  id: number;
  supplier: number;
  supplier_name?: string | null;
  bill_no: string;
  date: string;
  due_date: string;
  amount: number | string;
  paid?: number | string;
  currency: string;
  description: string;
  gl_account_code?: string | null;
  status: BillStatus;
}

export interface SupplierBillInput {
  supplier: number;
  bill_no: string;
  date: string;
  due_date: string;
  amount: number;
  currency: string;
  description?: string;
  gl_account_code?: string;
  status?: BillStatus;
}

export async function listSupplierBills(): Promise<BackendSupplierBill[]> {
  return safeList<BackendSupplierBill>('/api/finance/supplierbill/?limit=1000');
}

export async function createSupplierBill(input: SupplierBillInput): Promise<BackendSupplierBill> {
  return api.post<BackendSupplierBill>('/api/finance/supplierbill/', input);
}

/* ------------------------------------------------------------------ */
/* Supplier payments                                                   */
/* ------------------------------------------------------------------ */

export interface BackendSupplierPayment {
  id: number;
  supplier: number;
  supplier_name?: string | null;
  bill?: number | null;
  date: string;
  amount: number | string;
  method: string;
  reference?: string | null;
  description?: string | null;
}

export interface SupplierPaymentInput {
  supplier: number;
  bill?: number | null;
  date: string;
  amount: number;
  method: string;
  reference?: string;
  description?: string;
}

export async function listSupplierPayments(): Promise<BackendSupplierPayment[]> {
  return safeList<BackendSupplierPayment>('/api/finance/supplierpayment/?limit=1000');
}

export async function createSupplierPayment(input: SupplierPaymentInput): Promise<BackendSupplierPayment> {
  return api.post<BackendSupplierPayment>('/api/finance/supplierpayment/', input);
}

/* ------------------------------------------------------------------ */
/* Supplier statement lines (creditors reconciliation)                 */
/* ------------------------------------------------------------------ */

export interface BackendSupplierStatementLine {
  id: number;
  supplier: number;
  date: string;
  reference?: string | null;
  description?: string | null;
  amount: number | string;
  matched: boolean;
  matched_bill?: number | null;
}

export async function listSupplierStatementLines(): Promise<BackendSupplierStatementLine[]> {
  return safeList<BackendSupplierStatementLine>('/api/finance/supplierstatementline/?limit=1000');
}

export async function matchSupplierStatementLine(id: number, matched_bill: number | null): Promise<BackendSupplierStatementLine> {
  return api.patch<BackendSupplierStatementLine>(`/api/finance/supplierstatementline/${id}/`, {
    matched: matched_bill != null,
    matched_bill,
  });
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

export function billBalance(bill: BackendSupplierBill): number {
  return Math.max(0, num(bill.amount) - num(bill.paid));
}

export { num, ApiError };
