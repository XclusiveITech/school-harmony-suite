// Live Finance data from the Django backend. No dummy data — invoices,
// receipts (payments) and student balances all persist to MySQL.
//
// Endpoints (DRF routers — see BACKEND_FINANCE.md):
//   /api/finance/invoice/          (nested lines)
//   /api/finance/invoice/<id>/cancel/
//   /api/finance/invoice/<id>/process/
//   /api/finance/receipt/
//   /api/finance/receipt/<id>/cancel/
//   /api/finance/receipt/<id>/process/
//   /api/finance/balance/          (read-only, per student)
//   /api/finance/glaccount/

import { api, ApiError } from './api';

export function unwrap<T>(res: any): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && Array.isArray(res.results)) return res.results as T[];
  return [];
}

/** GET a list, tolerating a backend that has not exposed the route yet. */
export async function safeList<T>(path: string): Promise<T[]> {
  try {
    return unwrap<T>(await api.get(path));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return [];
    throw e;
  }
}

/** Backend decimals arrive as strings; normalise to numbers. */
export function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
}

export type DocStatus = 'Draft' | 'Processed' | 'Cancelled';

/* ------------------------------------------------------------------ */
/* GL accounts                                                         */
/* ------------------------------------------------------------------ */

export interface BackendGLAccount {
  id: number;
  code: string;
  name: string;
  type: string;
}

export async function listGLAccounts(): Promise<BackendGLAccount[]> {
  return safeList<BackendGLAccount>('/api/finance/glaccount/?limit=500');
}

/* ------------------------------------------------------------------ */
/* Invoices                                                            */
/* ------------------------------------------------------------------ */

export interface BackendInvoiceLine {
  id?: number;
  description: string;
  gl_account_code: string;
  amount: number | string;
}

export interface BackendInvoice {
  id: number;
  invoice_number: string;
  date: string;
  student: number;
  student_name?: string | null;
  student_no?: string | null;
  currency: string;
  total: number | string;
  status: DocStatus;
  lines: BackendInvoiceLine[];
}

export interface InvoiceInput {
  date: string;
  student: number;
  currency: string;
  status: DocStatus;
  lines: { description: string; gl_account_code: string; amount: number }[];
}

export async function listInvoices(): Promise<BackendInvoice[]> {
  return safeList<BackendInvoice>('/api/finance/invoice/?limit=500');
}

export async function createInvoice(input: InvoiceInput): Promise<BackendInvoice> {
  return api.post<BackendInvoice>('/api/finance/invoice/', input);
}

export async function cancelInvoice(id: number) {
  return api.post(`/api/finance/invoice/${id}/cancel/`, {});
}

export async function processInvoice(id: number) {
  return api.post(`/api/finance/invoice/${id}/process/`, {});
}

/* ------------------------------------------------------------------ */
/* Receipts (payments)                                                 */
/* ------------------------------------------------------------------ */

export interface BackendReceipt {
  id: number;
  receipt_number: string;
  date: string;
  student: number;
  student_name?: string | null;
  student_no?: string | null;
  amount: number | string;
  payment_mode: string;
  currency: string;
  reference: string;
  description: string;
  status: DocStatus;
}

export interface ReceiptInput {
  date: string;
  student: number;
  amount: number;
  payment_mode: string;
  currency: string;
  reference?: string;
  description?: string;
  status: DocStatus;
}

export async function listReceipts(): Promise<BackendReceipt[]> {
  return safeList<BackendReceipt>('/api/finance/receipt/?limit=500');
}

export async function createReceipt(input: ReceiptInput): Promise<BackendReceipt> {
  return api.post<BackendReceipt>('/api/finance/receipt/', input);
}

export async function cancelReceipt(id: number) {
  return api.post(`/api/finance/receipt/${id}/cancel/`, {});
}

export async function processReceipt(id: number) {
  return api.post(`/api/finance/receipt/${id}/process/`, {});
}

/* ------------------------------------------------------------------ */
/* Balances                                                            */
/* ------------------------------------------------------------------ */

export interface BackendBalance {
  student: number;
  student_name?: string | null;
  student_no?: string | null;
  invoiced: number | string;
  paid: number | string;
  balance: number | string;
}

/**
 * Student balances. Uses the backend view when available; otherwise it is
 * derived from the invoices/receipts already fetched from MySQL.
 */
export async function listBalances(): Promise<BackendBalance[]> {
  const rows = await safeList<BackendBalance>('/api/finance/balance/?limit=1000');
  if (rows.length) return rows;
  const [invoices, receipts] = await Promise.all([listInvoices(), listReceipts()]);
  return deriveBalances(invoices, receipts);
}

export function deriveBalances(
  invoices: BackendInvoice[],
  receipts: BackendReceipt[],
): BackendBalance[] {
  const map = new Map<number, BackendBalance>();
  const row = (id: number, name?: string | null, no?: string | null) => {
    const existing = map.get(id);
    if (existing) return existing;
    const created: BackendBalance = {
      student: id, student_name: name ?? null, student_no: no ?? null,
      invoiced: 0, paid: 0, balance: 0,
    };
    map.set(id, created);
    return created;
  };
  for (const inv of invoices) {
    if (inv.status !== 'Processed') continue;
    const r = row(inv.student, inv.student_name, inv.student_no);
    r.invoiced = num(r.invoiced) + num(inv.total);
  }
  for (const rec of receipts) {
    if (rec.status !== 'Processed') continue;
    const r = row(rec.student, rec.student_name, rec.student_no);
    r.paid = num(r.paid) + num(rec.amount);
  }
  for (const r of map.values()) r.balance = num(r.invoiced) - num(r.paid);
  return Array.from(map.values()).sort((a, b) => num(b.balance) - num(a.balance));
}
