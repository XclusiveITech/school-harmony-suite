// Brainstar Inventory Module – data model, seed, and reactive store.
// Pure client-side (no backend). Drives every stock figure from stock movements.

import { useSyncExternalStore } from 'react';
import { inventory as legacyItems } from './dummy-data';

// ---------- Types ----------
export type MovementType =
  | 'OPENING'
  | 'PURCHASE'         // GRN (stock IN)
  | 'DELIVERY'         // sales dispatch (stock OUT)
  | 'CREDIT_NOTE'      // customer return (stock IN after inspection)
  | 'TRANSFER_OUT'     // warehouse transfer (OUT side)
  | 'TRANSFER_IN'      // warehouse transfer (IN side)
  | 'ISSUE'            // internal issuing (OUT)
  | 'ISSUE_RETURN'     // return from issuing (IN)
  | 'SALE'             // tuckshop POS sale (OUT)
  | 'SALE_RETURN'      // tuckshop refund (IN)
  | 'WASTAGE'          // tuckshop wastage (OUT)
  | 'ADJUSTMENT';      // stock-take adjustment

export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  category: string;
  unit: string;          // EA, BOX, REAM, KG
  reorderLevel: number;
}

export interface StockBatch {
  id: string;
  productId: string;
  warehouseId: string;
  batchNo: string;
  receivedDate: string;
  expiryDate?: string;
  unitCost: number;
  qtyRemaining: number;
}

export interface StockMovement {
  id: string;
  date: string;
  productId: string;
  warehouseId: string;
  type: MovementType;
  quantity: number;       // +IN / -OUT (signed)
  unitCost: number;
  documentType: string;   // 'DeliveryNote' | 'CreditNote' | 'Transfer' | 'Issue' | 'IssueReturn' | 'GRN' | 'Opening' | 'Adjustment'
  documentRef: string;    // e.g. DN-0001
  batchId?: string;
  notes?: string;
}

export interface DeliveryNote {
  id: string;
  ref: string;
  date: string;
  customer: string;
  warehouseId: string;
  status: 'Draft' | 'Dispatched' | 'Cancelled';
  lines: { productId: string; quantity: number; unitPrice: number }[];
}

export interface CreditNote {
  id: string;
  ref: string;
  date: string;
  customer: string;
  warehouseId: string;
  inspectedBy: string;
  status: 'Pending Inspection' | 'Accepted' | 'Rejected';
  lines: { productId: string; quantity: number; reason: string }[];
}

export interface WarehouseTransfer {
  id: string;
  ref: string;
  date: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: 'Draft' | 'Completed';
  lines: { productId: string; quantity: number }[];
}

export interface Issue {
  id: string;
  ref: string;
  date: string;
  costCenter: string;
  issuedTo: string;
  warehouseId: string;
  status: 'Issued' | 'Returned' | 'Partially Returned';
  lines: { productId: string; quantity: number; returned: number }[];
}

export interface IssueReturn {
  id: string;
  ref: string;
  date: string;
  issueRef: string;
  warehouseId: string;
  receivedBy: string;
  lines: { productId: string; quantity: number; condition: 'Good' | 'Damaged' }[];
}

export interface StockTake {
  id: string;
  ref: string;
  date: string;
  warehouseId: string;
  countedBy: string;
  status: 'Draft' | 'Posted';
  lines: { productId: string; systemQty: number; countedQty: number }[];
}

export interface InventoryState {
  warehouses: Warehouse[];
  products: Product[];
  batches: StockBatch[];
  movements: StockMovement[];
  deliveryNotes: DeliveryNote[];
  creditNotes: CreditNote[];
  transfers: WarehouseTransfer[];
  issues: Issue[];
  issueReturns: IssueReturn[];
  stockTakes: StockTake[];
}

// ---------- Seed ----------
const warehouses: Warehouse[] = [
  { id: 'WH1', name: 'Main Store', location: 'Main Branch – Block A' },
  { id: 'WH2', name: 'Science Lab', location: 'Main Branch – Lab Wing' },
  { id: 'WH3', name: 'Admin Office', location: 'Main Branch – Admin' },
];

// Map legacy items to products
const products: Product[] = legacyItems.map((it, idx) => ({
  id: `P${idx + 1}`,
  sku: `SKU-${(idx + 1).toString().padStart(4, '0')}`,
  barcode: `60000000${idx + 1}`,
  name: it.name,
  category: it.category,
  unit: 'EA',
  reorderLevel: it.reorderLevel,
}));

const whByName = (n: string) => warehouses.find(w => w.name === n)?.id ?? 'WH1';

// Opening batches (FIFO)
const today = new Date().toISOString().slice(0, 10);
const lastMonth = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); })();

const batches: StockBatch[] = legacyItems.map((it, idx) => ({
  id: `B${idx + 1}`,
  productId: `P${idx + 1}`,
  warehouseId: whByName(it.warehouse),
  batchNo: `BATCH-${(idx + 1).toString().padStart(4, '0')}`,
  receivedDate: lastMonth,
  unitCost: it.unitCost,
  qtyRemaining: it.quantity,
}));

const movements: StockMovement[] = legacyItems.map((it, idx) => ({
  id: `M${idx + 1}`,
  date: lastMonth,
  productId: `P${idx + 1}`,
  warehouseId: whByName(it.warehouse),
  type: 'OPENING',
  quantity: it.quantity,
  unitCost: it.unitCost,
  documentType: 'Opening',
  documentRef: `OPEN-${(idx + 1).toString().padStart(4, '0')}`,
  batchId: `B${idx + 1}`,
}));

const initialState: InventoryState = {
  warehouses,
  products,
  batches,
  movements,
  deliveryNotes: [],
  creditNotes: [],
  transfers: [],
  issues: [],
  issueReturns: [],
  stockTakes: [],
};

// ---------- Reactive store ----------
let state: InventoryState = initialState;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const emit = () => listeners.forEach(l => l());
const set = (updater: (s: InventoryState) => InventoryState) => { state = updater(state); emit(); };
const getState = () => state;

export function useInventory<T>(selector: (s: InventoryState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getState()), () => selector(initialState));
}

// ---------- Helpers ----------
let counters: Record<string, number> = { DN: 0, CN: 0, TR: 0, ISS: 0, IRT: 0, ST: 0, M: state.movements.length };
const nextRef = (prefix: string) => {
  counters[prefix] = (counters[prefix] ?? 0) + 1;
  return `${prefix}-${counters[prefix].toString().padStart(4, '0')}`;
};
const newId = () => Math.random().toString(36).slice(2, 10);

export function getStockOnHand(productId: string, warehouseId?: string): number {
  return state.batches
    .filter(b => b.productId === productId && (!warehouseId || b.warehouseId === warehouseId))
    .reduce((sum, b) => sum + b.qtyRemaining, 0);
}

export function getProductValuation(productId: string, warehouseId?: string): number {
  return state.batches
    .filter(b => b.productId === productId && (!warehouseId || b.warehouseId === warehouseId))
    .reduce((sum, b) => sum + b.qtyRemaining * b.unitCost, 0);
}

// FIFO allocation — returns batch consumption plan or null if insufficient.
export function allocateFIFO(productId: string, warehouseId: string, quantity: number): { batchId: string; qty: number; unitCost: number }[] | null {
  const onHand = getStockOnHand(productId, warehouseId);
  if (onHand < quantity) return null;
  const sorted = state.batches
    .filter(b => b.productId === productId && b.warehouseId === warehouseId && b.qtyRemaining > 0)
    .sort((a, b) => a.receivedDate.localeCompare(b.receivedDate));
  const plan: { batchId: string; qty: number; unitCost: number }[] = [];
  let need = quantity;
  for (const b of sorted) {
    if (need <= 0) break;
    const take = Math.min(b.qtyRemaining, need);
    plan.push({ batchId: b.id, qty: take, unitCost: b.unitCost });
    need -= take;
  }
  return plan;
}

function postMovements(records: Omit<StockMovement, 'id'>[]) {
  set(s => ({
    ...s,
    movements: [
      ...s.movements,
      ...records.map(r => ({ ...r, id: `M${++counters.M}` })),
    ],
  }));
}

function adjustBatches(updates: { batchId: string; deltaQty: number }[]) {
  set(s => ({
    ...s,
    batches: s.batches.map(b => {
      const u = updates.find(x => x.batchId === b.id);
      return u ? { ...b, qtyRemaining: b.qtyRemaining + u.deltaQty } : b;
    }),
  }));
}

function addBatch(batch: StockBatch) {
  set(s => ({ ...s, batches: [...s.batches, batch] }));
}

// ---------- Document operations ----------

export function dispatchDeliveryNote(input: {
  date: string; customer: string; warehouseId: string;
  lines: { productId: string; quantity: number; unitPrice: number }[];
}): { ok: boolean; error?: string; ref?: string } {
  // validate stock
  for (const ln of input.lines) {
    if (allocateFIFO(ln.productId, input.warehouseId, ln.quantity) === null) {
      return { ok: false, error: `Insufficient stock for product ${ln.productId}` };
    }
  }
  const ref = nextRef('DN');
  const dn: DeliveryNote = { id: newId(), ref, date: input.date, customer: input.customer, warehouseId: input.warehouseId, status: 'Dispatched', lines: input.lines };
  set(s => ({ ...s, deliveryNotes: [dn, ...s.deliveryNotes] }));

  const movs: Omit<StockMovement, 'id'>[] = [];
  const batchUpdates: { batchId: string; deltaQty: number }[] = [];
  for (const ln of input.lines) {
    const plan = allocateFIFO(ln.productId, input.warehouseId, ln.quantity)!;
    for (const p of plan) {
      batchUpdates.push({ batchId: p.batchId, deltaQty: -p.qty });
      movs.push({
        date: input.date, productId: ln.productId, warehouseId: input.warehouseId,
        type: 'DELIVERY', quantity: -p.qty, unitCost: p.unitCost,
        documentType: 'DeliveryNote', documentRef: ref, batchId: p.batchId,
      });
    }
  }
  adjustBatches(batchUpdates);
  postMovements(movs);
  return { ok: true, ref };
}

export function postCreditNote(input: {
  date: string; customer: string; warehouseId: string; inspectedBy: string;
  lines: { productId: string; quantity: number; reason: string; unitCost: number }[];
}): { ok: boolean; ref: string } {
  const ref = nextRef('CN');
  const cn: CreditNote = {
    id: newId(), ref, date: input.date, customer: input.customer, warehouseId: input.warehouseId,
    inspectedBy: input.inspectedBy, status: 'Accepted',
    lines: input.lines.map(({ productId, quantity, reason }) => ({ productId, quantity, reason })),
  };
  set(s => ({ ...s, creditNotes: [cn, ...s.creditNotes] }));

  const movs: Omit<StockMovement, 'id'>[] = [];
  for (const ln of input.lines) {
    const batch: StockBatch = {
      id: `B${newId()}`, productId: ln.productId, warehouseId: input.warehouseId,
      batchNo: `RTN-${ref}-${ln.productId}`, receivedDate: input.date,
      unitCost: ln.unitCost, qtyRemaining: ln.quantity,
    };
    addBatch(batch);
    movs.push({
      date: input.date, productId: ln.productId, warehouseId: input.warehouseId,
      type: 'CREDIT_NOTE', quantity: ln.quantity, unitCost: ln.unitCost,
      documentType: 'CreditNote', documentRef: ref, batchId: batch.id, notes: ln.reason,
    });
  }
  postMovements(movs);
  return { ok: true, ref };
}

export function postTransfer(input: {
  date: string; fromWarehouseId: string; toWarehouseId: string;
  lines: { productId: string; quantity: number }[];
}): { ok: boolean; error?: string; ref?: string } {
  if (input.fromWarehouseId === input.toWarehouseId) return { ok: false, error: 'Source and destination must differ' };
  for (const ln of input.lines) {
    if (allocateFIFO(ln.productId, input.fromWarehouseId, ln.quantity) === null) {
      return { ok: false, error: `Insufficient stock for product ${ln.productId}` };
    }
  }
  const ref = nextRef('TR');
  const tr: WarehouseTransfer = { id: newId(), ref, date: input.date, fromWarehouseId: input.fromWarehouseId, toWarehouseId: input.toWarehouseId, status: 'Completed', lines: input.lines };
  set(s => ({ ...s, transfers: [tr, ...s.transfers] }));

  const movs: Omit<StockMovement, 'id'>[] = [];
  const batchUpdates: { batchId: string; deltaQty: number }[] = [];
  for (const ln of input.lines) {
    const plan = allocateFIFO(ln.productId, input.fromWarehouseId, ln.quantity)!;
    for (const p of plan) {
      batchUpdates.push({ batchId: p.batchId, deltaQty: -p.qty });
      movs.push({
        date: input.date, productId: ln.productId, warehouseId: input.fromWarehouseId,
        type: 'TRANSFER_OUT', quantity: -p.qty, unitCost: p.unitCost,
        documentType: 'Transfer', documentRef: ref, batchId: p.batchId,
      });
      // create mirror batch in destination
      const dest: StockBatch = {
        id: `B${newId()}`, productId: ln.productId, warehouseId: input.toWarehouseId,
        batchNo: `XFER-${ref}-${ln.productId}`, receivedDate: input.date,
        unitCost: p.unitCost, qtyRemaining: p.qty,
      };
      addBatch(dest);
      movs.push({
        date: input.date, productId: ln.productId, warehouseId: input.toWarehouseId,
        type: 'TRANSFER_IN', quantity: p.qty, unitCost: p.unitCost,
        documentType: 'Transfer', documentRef: ref, batchId: dest.id,
      });
    }
  }
  adjustBatches(batchUpdates);
  postMovements(movs);
  return { ok: true, ref };
}

export function postIssue(input: {
  date: string; costCenter: string; issuedTo: string; warehouseId: string;
  lines: { productId: string; quantity: number }[];
}): { ok: boolean; error?: string; ref?: string } {
  for (const ln of input.lines) {
    if (allocateFIFO(ln.productId, input.warehouseId, ln.quantity) === null) {
      return { ok: false, error: `Insufficient stock for product ${ln.productId}` };
    }
  }
  const ref = nextRef('ISS');
  const iss: Issue = {
    id: newId(), ref, date: input.date, costCenter: input.costCenter, issuedTo: input.issuedTo,
    warehouseId: input.warehouseId, status: 'Issued',
    lines: input.lines.map(l => ({ ...l, returned: 0 })),
  };
  set(s => ({ ...s, issues: [iss, ...s.issues] }));

  const movs: Omit<StockMovement, 'id'>[] = [];
  const batchUpdates: { batchId: string; deltaQty: number }[] = [];
  for (const ln of input.lines) {
    const plan = allocateFIFO(ln.productId, input.warehouseId, ln.quantity)!;
    for (const p of plan) {
      batchUpdates.push({ batchId: p.batchId, deltaQty: -p.qty });
      movs.push({
        date: input.date, productId: ln.productId, warehouseId: input.warehouseId,
        type: 'ISSUE', quantity: -p.qty, unitCost: p.unitCost,
        documentType: 'Issue', documentRef: ref, batchId: p.batchId,
        notes: `Cost center: ${input.costCenter}`,
      });
    }
  }
  adjustBatches(batchUpdates);
  postMovements(movs);
  return { ok: true, ref };
}

export function postIssueReturn(input: {
  date: string; issueRef: string; warehouseId: string; receivedBy: string;
  lines: { productId: string; quantity: number; condition: 'Good' | 'Damaged'; unitCost: number }[];
}): { ok: boolean; ref: string } {
  const ref = nextRef('IRT');
  const irt: IssueReturn = {
    id: newId(), ref, date: input.date, issueRef: input.issueRef, warehouseId: input.warehouseId,
    receivedBy: input.receivedBy,
    lines: input.lines.map(({ productId, quantity, condition }) => ({ productId, quantity, condition })),
  };
  set(s => ({
    ...s,
    issueReturns: [irt, ...s.issueReturns],
    issues: s.issues.map(i => {
      if (i.ref !== input.issueRef) return i;
      const lines = i.lines.map(l => {
        const ret = input.lines.find(x => x.productId === l.productId);
        return ret ? { ...l, returned: l.returned + ret.quantity } : l;
      });
      const fully = lines.every(l => l.returned >= l.quantity);
      const partly = lines.some(l => l.returned > 0);
      return { ...i, lines, status: fully ? 'Returned' : partly ? 'Partially Returned' : i.status };
    }),
  }));

  const movs: Omit<StockMovement, 'id'>[] = [];
  for (const ln of input.lines) {
    if (ln.condition === 'Damaged') continue; // damaged returns excluded from sellable stock
    const batch: StockBatch = {
      id: `B${newId()}`, productId: ln.productId, warehouseId: input.warehouseId,
      batchNo: `IRT-${ref}-${ln.productId}`, receivedDate: input.date,
      unitCost: ln.unitCost, qtyRemaining: ln.quantity,
    };
    addBatch(batch);
    movs.push({
      date: input.date, productId: ln.productId, warehouseId: input.warehouseId,
      type: 'ISSUE_RETURN', quantity: ln.quantity, unitCost: ln.unitCost,
      documentType: 'IssueReturn', documentRef: ref, batchId: batch.id,
      notes: `Return for ${input.issueRef}`,
    });
  }
  postMovements(movs);
  return { ok: true, ref };
}

export function postStockTake(input: {
  date: string; warehouseId: string; countedBy: string;
  lines: { productId: string; systemQty: number; countedQty: number }[];
}) {
  const ref = nextRef('ST');
  const st: StockTake = { id: newId(), ref, date: input.date, warehouseId: input.warehouseId, countedBy: input.countedBy, status: 'Posted', lines: input.lines };
  set(s => ({ ...s, stockTakes: [st, ...s.stockTakes] }));
  const movs: Omit<StockMovement, 'id'>[] = [];
  for (const ln of input.lines) {
    const diff = ln.countedQty - ln.systemQty;
    if (diff === 0) continue;
    const avgCost = (() => {
      const bs = state.batches.filter(b => b.productId === ln.productId && b.warehouseId === input.warehouseId && b.qtyRemaining > 0);
      const total = bs.reduce((s, b) => s + b.qtyRemaining, 0);
      return total ? bs.reduce((s, b) => s + b.qtyRemaining * b.unitCost, 0) / total : 0;
    })();
    if (diff > 0) {
      const batch: StockBatch = {
        id: `B${newId()}`, productId: ln.productId, warehouseId: input.warehouseId,
        batchNo: `ADJ-${ref}-${ln.productId}`, receivedDate: input.date,
        unitCost: avgCost, qtyRemaining: diff,
      };
      addBatch(batch);
      movs.push({ date: input.date, productId: ln.productId, warehouseId: input.warehouseId, type: 'ADJUSTMENT', quantity: diff, unitCost: avgCost, documentType: 'Adjustment', documentRef: ref, batchId: batch.id, notes: 'Stock take +' });
    } else {
      // reduce FIFO
      const plan = allocateFIFO(ln.productId, input.warehouseId, -diff);
      if (plan) {
        const updates = plan.map(p => ({ batchId: p.batchId, deltaQty: -p.qty }));
        adjustBatches(updates);
        for (const p of plan) {
          movs.push({ date: input.date, productId: ln.productId, warehouseId: input.warehouseId, type: 'ADJUSTMENT', quantity: -p.qty, unitCost: p.unitCost, documentType: 'Adjustment', documentRef: ref, batchId: p.batchId, notes: 'Stock take -' });
        }
      }
    }
  }
  postMovements(movs);
  return { ok: true, ref };
}

export function addProduct(p: Omit<Product, 'id'>) {
  set(s => ({ ...s, products: [...s.products, { ...p, id: `P${s.products.length + 1}` }] }));
}

export function addWarehouse(w: Omit<Warehouse, 'id'>) {
  set(s => ({ ...s, warehouses: [...s.warehouses, { ...w, id: `WH${s.warehouses.length + 1}` }] }));
}

// Selectors
export const selectors = {
  productMap: () => Object.fromEntries(state.products.map(p => [p.id, p])),
  warehouseMap: () => Object.fromEntries(state.warehouses.map(w => [w.id, w])),
};
