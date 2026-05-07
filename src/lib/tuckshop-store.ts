// Brainstar Tuckshop module – POS, shifts, cashup, prices.
// Integrates with inventory-store via SALE / SALE_RETURN / WASTAGE movements
// posted against the dedicated TUCKSHOP_WAREHOUSE_ID warehouse.

import { useSyncExternalStore } from 'react';
import {
  TUCKSHOP_WAREHOUSE_ID, postSale, postSaleReturn, postWastage,
  getStockOnHand,
} from './inventory-store';
import {
  postTuckshopSale, postTuckshopRefund, postTuckshopWastage,
} from './accounting-store';

export type PaymentMethod = 'Cash' | 'Student Card' | 'Parent Account';
export type SaleStatus = 'Completed' | 'Voided' | 'Refunded';

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
  date: string;        // ISO datetime
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

interface TuckState {
  prices: PriceListEntry[];
  sales: TuckSale[];
  shifts: Shift[];
}

let state: TuckState = {
  prices: [],
  sales: [],
  shifts: [],
};

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const emit = () => listeners.forEach(l => l());
const set = (u: (s: TuckState) => TuckState) => { state = u(state); emit(); };
const getState = () => state;

export function useTuckshop<T>(selector: (s: TuckState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getState()), () => selector(state));
}

const counters = { S: 0, SH: 0 };
const newRef = (p: 'S' | 'SH') => `${p}-${(++counters[p]).toString().padStart(4, '0')}`;
const newId = () => Math.random().toString(36).slice(2, 10);

// ---------- Prices ----------
export function setPrice(productId: string, sellingPrice: number) {
  set(s => {
    const existing = s.prices.find(p => p.productId === productId);
    return {
      ...s,
      prices: existing
        ? s.prices.map(p => p.productId === productId ? { ...p, sellingPrice } : p)
        : [...s.prices, { productId, sellingPrice }],
    };
  });
}

export function getPrice(productId: string): number {
  return state.prices.find(p => p.productId === productId)?.sellingPrice ?? 0;
}

// ---------- Shifts ----------
export function openShift(operator: string, openingCash: number): Shift {
  const sh: Shift = {
    id: newId(), ref: newRef('SH'), operator,
    openedAt: new Date().toISOString(),
    openingCash, status: 'Open',
  };
  set(s => ({ ...s, shifts: [sh, ...s.shifts] }));
  return sh;
}

export function getActiveShift(operator?: string): Shift | undefined {
  return state.shifts.find(s => s.status === 'Open' && (!operator || s.operator === operator));
}

export function closeShift(shiftId: string, declaredCash: number, notes?: string): Shift | undefined {
  const cashSales = state.sales
    .filter(x => x.shiftId === shiftId && x.status === 'Completed' && x.paymentMethod === 'Cash')
    .reduce((sum, x) => sum + x.subtotal, 0);
  const refunds = state.sales
    .filter(x => x.shiftId === shiftId && x.status === 'Refunded' && x.paymentMethod === 'Cash')
    .reduce((sum, x) => sum + x.subtotal, 0);
  let updated: Shift | undefined;
  set(s => ({
    ...s,
    shifts: s.shifts.map(sh => {
      if (sh.id !== shiftId) return sh;
      const expected = sh.openingCash + cashSales - refunds;
      updated = {
        ...sh,
        closedAt: new Date().toISOString(),
        declaredCash,
        expectedCash: expected,
        variance: declaredCash - expected,
        status: 'Closed',
        notes,
      };
      return updated;
    }),
  }));
  return updated;
}

// ---------- Sales ----------
export function recordSale(input: {
  shiftId: string; operator: string;
  paymentMethod: PaymentMethod;
  studentId?: string; studentName?: string;
  lines: { productId: string; quantity: number; unitPrice: number }[];
}): { ok: boolean; error?: string; sale?: TuckSale } {
  // stock validation handled by postSale
  const date = new Date().toISOString();
  const ref = newRef('S');
  const result = postSale({
    date: date.slice(0, 10),
    warehouseId: TUCKSHOP_WAREHOUSE_ID,
    ref,
    lines: input.lines,
  });
  if (!result.ok) return { ok: false, error: result.error };

  const subtotal = input.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  // Distribute cogs proportionally
  const totalQty = input.lines.reduce((s, l) => s + l.quantity, 0);
  const lines: TuckSaleLine[] = input.lines.map(l => ({
    productId: l.productId,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    unitCost: totalQty ? (result.cogs ?? 0) * (l.quantity / totalQty) / l.quantity : 0,
  }));
  const sale: TuckSale = {
    id: newId(), ref, date,
    shiftId: input.shiftId, operator: input.operator,
    paymentMethod: input.paymentMethod,
    studentId: input.studentId, studentName: input.studentName,
    lines, subtotal, cogs: result.cogs ?? 0,
    status: 'Completed',
  };
  set(s => ({ ...s, sales: [sale, ...s.sales] }));
  return { ok: true, sale };
}

export function voidSale(saleId: string, reason: string): { ok: boolean; error?: string } {
  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) return { ok: false, error: 'Sale not found' };
  if (sale.status !== 'Completed') return { ok: false, error: 'Only completed sales can be voided' };
  // Return stock
  postSaleReturn({
    date: new Date().toISOString().slice(0, 10),
    warehouseId: TUCKSHOP_WAREHOUSE_ID,
    ref: `${sale.ref}-VOID`,
    lines: sale.lines.map(l => ({ productId: l.productId, quantity: l.quantity, unitCost: l.unitCost })),
  });
  set(s => ({
    ...s,
    sales: s.sales.map(x => x.id === saleId ? { ...x, status: 'Voided', voidReason: reason } : x),
  }));
  return { ok: true };
}

export function refundSale(saleId: string, reason: string): { ok: boolean; error?: string } {
  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) return { ok: false, error: 'Sale not found' };
  if (sale.status !== 'Completed') return { ok: false, error: 'Only completed sales can be refunded' };
  postSaleReturn({
    date: new Date().toISOString().slice(0, 10),
    warehouseId: TUCKSHOP_WAREHOUSE_ID,
    ref: `${sale.ref}-RFND`,
    lines: sale.lines.map(l => ({ productId: l.productId, quantity: l.quantity, unitCost: l.unitCost })),
  });
  set(s => ({
    ...s,
    sales: s.sales.map(x => x.id === saleId ? { ...x, status: 'Refunded', voidReason: reason } : x),
  }));
  return { ok: true };
}

// ---------- Wastage ----------
export function recordWastage(input: { lines: { productId: string; quantity: number; reason: string }[] }) {
  return postWastage({
    date: new Date().toISOString().slice(0, 10),
    warehouseId: TUCKSHOP_WAREHOUSE_ID,
    ref: `WST-${Date.now()}`,
    lines: input.lines,
  });
}

// ---------- Helpers ----------
export function getTuckStockOnHand(productId: string) {
  return getStockOnHand(productId, TUCKSHOP_WAREHOUSE_ID);
}

export const TUCKSHOP_WH = TUCKSHOP_WAREHOUSE_ID;
