// Brainstar Tuckshop module – POS, shifts, cashup, prices, wastage.
// Backed entirely by the Django/MySQL backend (see BACKEND_TUCKSHOP.md).
// This module keeps a small in-memory cache so components can render
// synchronously, but every read comes from the API and every write is
// persisted through it before the cache is refreshed.

import { useSyncExternalStore } from 'react';
import * as apiT from './tuckshop-api';
import { num } from './tuckshop-api';
import {
  postTuckshopSale, postTuckshopRefund, postTuckshopWastage,
} from './accounting-store';

export type PaymentMethod = apiT.PaymentMethod;
export type SaleStatus = apiT.SaleStatus;

export interface TuckProduct {
  id: string;
  sku: string;
  name: string;
  barcode?: string;
  unitCost: number;
  sellingPrice: number;
  stock: number;
  reorderLevel: number;
}

export interface PriceListEntry {
  productId: string;
  sellingPrice: number;
}

export interface TuckSaleLine {
  productId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
}

export interface TuckSale {
  id: string;
  ref: string;
  date: string;
  shiftId: string;
  operator: string;
  paymentMethod: PaymentMethod;
  studentId?: string;
  studentName?: string;
  lines: TuckSaleLine[];
  subtotal: number;
  cogs: number;
  status: SaleStatus;
  voidReason?: string;
}

export interface Shift {
  id: string;
  ref: string;
  operator: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  declaredCash?: number;
  expectedCash?: number;
  variance?: number;
  status: 'Open' | 'Closed';
  notes?: string;
}

export interface WastageRecord {
  id: string;
  ref: string;
  date: string;
  productId: string;
  productName: string;
  quantity: number;
  reason: string;
  cost: number;
}

interface TuckState {
  products: TuckProduct[];
  prices: PriceListEntry[];
  sales: TuckSale[];
  shifts: Shift[];
  wastage: WastageRecord[];
  loading: boolean;
  error: string | null;
  loadedAt: string | null;
}

let state: TuckState = {
  products: [], prices: [], sales: [], shifts: [], wastage: [],
  loading: false, error: null, loadedAt: null,
};

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const emit = () => listeners.forEach(l => l());
const set = (u: (s: TuckState) => TuckState) => { state = u(state); emit(); };
const getState = () => state;

export function useTuckshop<T>(selector: (s: TuckState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getState()), () => selector(state));
}

/* ------------------------------- Mappers -------------------------------- */

const mapProduct = (p: apiT.BackendTuckProduct): TuckProduct => ({
  id: String(p.id),
  sku: p.sku,
  name: p.name,
  barcode: p.barcode ?? undefined,
  unitCost: num(p.unit_cost),
  sellingPrice: num(p.selling_price),
  stock: num(p.stock),
  reorderLevel: num(p.reorder_level),
});

const mapSale = (s: apiT.BackendSale): TuckSale => ({
  id: String(s.id),
  ref: s.ref,
  date: s.date,
  shiftId: s.shift != null ? String(s.shift) : '',
  operator: s.operator,
  paymentMethod: s.payment_method,
  studentId: s.student_id ?? undefined,
  studentName: s.student_name ?? undefined,
  lines: (s.lines ?? []).map(l => ({
    productId: String(l.product),
    quantity: num(l.quantity),
    unitPrice: num(l.unit_price),
    unitCost: num(l.unit_cost),
  })),
  subtotal: num(s.subtotal),
  cogs: num(s.cogs),
  status: s.status,
  voidReason: s.void_reason ?? undefined,
});

const mapShift = (s: apiT.BackendShift): Shift => ({
  id: String(s.id),
  ref: s.ref,
  operator: s.operator,
  openedAt: s.opened_at,
  closedAt: s.closed_at ?? undefined,
  openingCash: num(s.opening_cash),
  declaredCash: s.declared_cash == null ? undefined : num(s.declared_cash),
  expectedCash: s.expected_cash == null ? undefined : num(s.expected_cash),
  variance: s.variance == null ? undefined : num(s.variance),
  status: s.status,
  notes: s.notes ?? undefined,
});

const mapWastage = (w: apiT.BackendWastage): WastageRecord => ({
  id: String(w.id),
  ref: w.ref,
  date: w.date,
  productId: String(w.product),
  productName: w.product_name ?? String(w.product),
  quantity: num(w.quantity),
  reason: w.reason,
  cost: num(w.cost),
});

/* -------------------------------- Loading ------------------------------- */

export async function loadTuckshop(): Promise<void> {
  set(s => ({ ...s, loading: true, error: null }));
  try {
    const [products, shifts, sales, wastage] = await Promise.all([
      apiT.listProducts(), apiT.listShifts(), apiT.listSales(), apiT.listWastage(),
    ]);
    const mapped = products.map(mapProduct);
    set(s => ({
      ...s,
      products: mapped,
      prices: mapped.map(p => ({ productId: p.id, sellingPrice: p.sellingPrice })),
      shifts: shifts.map(mapShift),
      sales: sales.map(mapSale),
      wastage: wastage.map(mapWastage),
      loading: false,
      loadedAt: new Date().toISOString(),
    }));
  } catch (e: any) {
    set(s => ({ ...s, loading: false, error: e?.message || 'Failed to load tuckshop data' }));
  }
}

/* -------------------------------- Prices -------------------------------- */

export async function setPrice(productId: string, sellingPrice: number) {
  await apiT.setSellingPrice(Number(productId), sellingPrice);
  set(s => ({
    ...s,
    products: s.products.map(p => p.id === productId ? { ...p, sellingPrice } : p),
    prices: s.prices.some(p => p.productId === productId)
      ? s.prices.map(p => p.productId === productId ? { ...p, sellingPrice } : p)
      : [...s.prices, { productId, sellingPrice }],
  }));
}

export function getPrice(productId: string): number {
  return state.products.find(p => p.id === productId)?.sellingPrice ?? 0;
}

export function getTuckStockOnHand(productId: string): number {
  return state.products.find(p => p.id === productId)?.stock ?? 0;
}

/* -------------------------------- Shifts -------------------------------- */

export async function openShift(operator: string, openingCash: number): Promise<Shift> {
  const sh = mapShift(await apiT.openShift(operator, openingCash));
  set(s => ({ ...s, shifts: [sh, ...s.shifts] }));
  return sh;
}

export function getActiveShift(operator?: string): Shift | undefined {
  return state.shifts.find(s => s.status === 'Open' && (!operator || s.operator === operator));
}

export async function closeShift(shiftId: string, declaredCash: number, notes?: string): Promise<Shift | undefined> {
  const updated = mapShift(await apiT.closeShift(Number(shiftId), declaredCash, notes));
  set(s => ({ ...s, shifts: s.shifts.map(sh => sh.id === shiftId ? updated : sh) }));
  return updated;
}

/* --------------------------------- Sales -------------------------------- */

export async function recordSale(input: {
  shiftId: string; operator: string;
  paymentMethod: PaymentMethod;
  studentId?: string; studentName?: string;
  lines: { productId: string; quantity: number; unitPrice: number }[];
}): Promise<{ ok: boolean; error?: string; sale?: TuckSale }> {
  try {
    const created = await apiT.createSale({
      shift: input.shiftId ? Number(input.shiftId) : null,
      operator: input.operator,
      payment_method: input.paymentMethod,
      student_id: input.studentId,
      student_name: input.studentName,
      lines: input.lines.map(l => ({
        product: Number(l.productId), quantity: l.quantity, unit_price: l.unitPrice,
      })),
    });
    const sale = mapSale(created);
    set(s => ({
      ...s,
      sales: [sale, ...s.sales],
      products: s.products.map(p => {
        const line = sale.lines.find(l => l.productId === p.id);
        return line ? { ...p, stock: p.stock - line.quantity } : p;
      }),
    }));
    postTuckshopSale({
      date: sale.date, saleRef: sale.ref, paymentMethod: sale.paymentMethod,
      amount: sale.subtotal, cogs: sale.cogs, studentName: sale.studentName,
    });
    return { ok: true, sale };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Sale could not be saved' };
  }
}

async function changeStatus(saleId: string, status: 'Voided' | 'Refunded', reason: string) {
  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) return { ok: false, error: 'Sale not found' };
  if (sale.status !== 'Completed') return { ok: false, error: `Only completed sales can be ${status === 'Voided' ? 'voided' : 'refunded'}` };
  try {
    const updated = mapSale(await apiT.changeSaleStatus(Number(saleId), status, reason));
    set(s => ({
      ...s,
      sales: s.sales.map(x => x.id === saleId ? updated : x),
      products: s.products.map(p => {
        const line = sale.lines.find(l => l.productId === p.id);
        return line ? { ...p, stock: p.stock + line.quantity } : p;
      }),
    }));
    postTuckshopRefund({
      date: new Date().toISOString(), saleRef: sale.ref,
      kind: status === 'Voided' ? 'Void' : 'Refund',
      paymentMethod: sale.paymentMethod, amount: sale.subtotal, cogs: sale.cogs,
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Update failed' };
  }
}

export const voidSale = (saleId: string, reason: string) => changeStatus(saleId, 'Voided', reason);
export const refundSale = (saleId: string, reason: string) => changeStatus(saleId, 'Refunded', reason);

/* -------------------------------- Wastage ------------------------------- */

export async function recordWastage(input: {
  operator?: string;
  lines: { productId: string; quantity: number; reason: string }[];
}): Promise<{ ok: boolean; error?: string }> {
  try {
    for (const l of input.lines) {
      const created = mapWastage(await apiT.createWastage({
        product: Number(l.productId), quantity: l.quantity, reason: l.reason, operator: input.operator,
      }));
      set(s => ({
        ...s,
        wastage: [created, ...s.wastage],
        products: s.products.map(p => p.id === l.productId ? { ...p, stock: p.stock - l.quantity } : p),
      }));
      postTuckshopWastage({
        date: created.date, ref: created.ref, cost: created.cost, reason: created.reason,
      });
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Wastage could not be saved' };
  }
}
