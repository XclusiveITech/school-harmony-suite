// Canteen / Dining Halls store
// - Multiple independent dining halls (each managed on its own)
// - Meals chart per hall
// - Staff assignments (linked to Staff module by id + category)
// - Stock transfers from Inventory warehouses
// - Requisitions from Requisitions module
// - Reviews from students (portal)
// - Full audit trail

import { useSyncExternalStore } from 'react';

export type CanteenStaffCategory = 'Manager' | 'Chef' | 'Cook' | 'Server' | 'Cleaner' | 'Cashier' | 'Storekeeper';
export type MealSlot = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface DiningHall {
  id: string;
  name: string;
  location: string;
  capacity: number;
  active: boolean;
  createdAt: string;
}

export interface CanteenStaffAssignment {
  id: string;
  hallId: string;
  staffId: string;      // -> dummy-data staff.id
  category: CanteenStaffCategory;
  assignedAt: string;
}

export interface MealItem {
  id: string;
  hallId: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  slot: MealSlot;
  name: string;
  description?: string;
  calories?: number;
  available: boolean;
}

export interface CanteenStockTransfer {
  id: string;
  hallId: string;
  fromWarehouseId?: string;   // inventory warehouse
  reference: string;
  items: { productId?: string; productName: string; quantity: number; unit: string }[];
  status: 'Pending' | 'Received' | 'Rejected';
  createdAt: string;
  receivedAt?: string;
  notes?: string;
}

export interface CanteenRequisition {
  id: string;
  hallId: string;
  reference: string;   // link to Requisitions module ref (or synthesized)
  requestedBy: string;
  items: { name: string; quantity: number; unit: string }[];
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Fulfilled';
  createdAt: string;
  notes?: string;
}

export interface CanteenReview {
  id: string;
  hallId: string;
  studentId: string;
  studentName?: string;
  mealSlot?: MealSlot;
  mealName?: string;
  rating: number;   // 1..5
  comment?: string;
  createdAt: string;
}

export type CanteenAuditAction =
  | 'HALL_CREATE' | 'HALL_UPDATE' | 'HALL_DELETE'
  | 'STAFF_ASSIGN' | 'STAFF_REMOVE'
  | 'MEAL_ADD' | 'MEAL_UPDATE' | 'MEAL_DELETE'
  | 'TRANSFER_CREATE' | 'TRANSFER_RECEIVE' | 'TRANSFER_REJECT'
  | 'REQUISITION_CREATE' | 'REQUISITION_APPROVE' | 'REQUISITION_REJECT' | 'REQUISITION_FULFILL'
  | 'REVIEW_ADD' | 'REVIEW_DELETE';

export interface CanteenAuditEvent {
  id: string;
  at: string;
  actor: string;
  hallId?: string;
  action: CanteenAuditAction;
  detail?: string;
}

// ---------- Seed --------------------------------------------------------

const seedHalls: DiningHall[] = [
  { id: 'dh1', name: 'Main Dining Hall', location: 'Central Block', capacity: 400, active: true, createdAt: new Date().toISOString() },
  { id: 'dh2', name: 'Junior Cafeteria', location: 'Primary Wing',  capacity: 180, active: true, createdAt: new Date().toISOString() },
];

const seedMeals: MealItem[] = [
  { id: 'm1', hallId: 'dh1', day: 'Mon', slot: 'Breakfast', name: 'Porridge & Tea', calories: 320, available: true },
  { id: 'm2', hallId: 'dh1', day: 'Mon', slot: 'Lunch',     name: 'Sadza & Beef Stew', calories: 720, available: true },
  { id: 'm3', hallId: 'dh1', day: 'Mon', slot: 'Dinner',    name: 'Rice & Chicken',    calories: 640, available: true },
];

// ---------- Reactive store ---------------------------------------------

let halls: DiningHall[] = [...seedHalls];
let staff: CanteenStaffAssignment[] = [];
let meals: MealItem[] = [...seedMeals];
let transfers: CanteenStockTransfer[] = [];
let requisitions: CanteenRequisition[] = [];
let reviews: CanteenReview[] = [];
let audit: CanteenAuditEvent[] = [];

const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export const useDiningHalls    = () => useSyncExternalStore(subscribe, () => halls, () => halls);
export const useCanteenStaff   = () => useSyncExternalStore(subscribe, () => staff, () => staff);
export const useMeals          = () => useSyncExternalStore(subscribe, () => meals, () => meals);
export const useCanteenTransfers    = () => useSyncExternalStore(subscribe, () => transfers, () => transfers);
export const useCanteenRequisitions = () => useSyncExternalStore(subscribe, () => requisitions, () => requisitions);
export const useCanteenReviews = () => useSyncExternalStore(subscribe, () => reviews, () => reviews);
export const useCanteenAudit   = () => useSyncExternalStore(subscribe, () => audit, () => audit);

// ---------- Audit -------------------------------------------------------

const actorName = () => {
  try {
    const s = localStorage.getItem('brainstar_user');
    if (s) return JSON.parse(s).name || 'System';
    const st = localStorage.getItem('brainstar_student');
    if (st) { const p = JSON.parse(st); return `${p.firstName} ${p.lastName} (Student)`; }
  } catch {}
  return 'System';
};

const log = (e: Omit<CanteenAuditEvent, 'id' | 'at' | 'actor'>) => {
  audit = [{
    id: `ca${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    actor: actorName(),
    ...e,
  }, ...audit];
};

// ---------- Halls -------------------------------------------------------

export const createHall = (data: Omit<DiningHall, 'id' | 'createdAt' | 'active'> & { active?: boolean }) => {
  const hall: DiningHall = {
    id: `dh${Date.now()}`,
    name: data.name, location: data.location, capacity: data.capacity,
    active: data.active ?? true,
    createdAt: new Date().toISOString(),
  };
  halls = [...halls, hall];
  log({ action: 'HALL_CREATE', hallId: hall.id, detail: hall.name });
  emit();
  return hall;
};

export const updateHall = (id: string, patch: Partial<DiningHall>) => {
  halls = halls.map(h => h.id === id ? { ...h, ...patch } : h);
  log({ action: 'HALL_UPDATE', hallId: id, detail: JSON.stringify(patch) });
  emit();
};

export const deleteHall = (id: string) => {
  halls = halls.filter(h => h.id !== id);
  staff = staff.filter(s => s.hallId !== id);
  meals = meals.filter(m => m.hallId !== id);
  log({ action: 'HALL_DELETE', hallId: id });
  emit();
};

// ---------- Staff -------------------------------------------------------

export const assignStaff = (hallId: string, staffId: string, category: CanteenStaffCategory) => {
  const a: CanteenStaffAssignment = {
    id: `cs${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
    hallId, staffId, category, assignedAt: new Date().toISOString(),
  };
  staff = [...staff, a];
  log({ action: 'STAFF_ASSIGN', hallId, detail: `${category} staff #${staffId}` });
  emit();
};

export const removeStaff = (id: string) => {
  const a = staff.find(s => s.id === id);
  staff = staff.filter(s => s.id !== id);
  if (a) log({ action: 'STAFF_REMOVE', hallId: a.hallId, detail: `${a.category} staff #${a.staffId}` });
  emit();
};

// ---------- Meals -------------------------------------------------------

export const addMeal = (m: Omit<MealItem, 'id' | 'available'> & { available?: boolean }) => {
  const item: MealItem = { id: `m${Date.now()}${Math.random().toString(36).slice(2, 4)}`, available: m.available ?? true, ...m };
  meals = [...meals, item];
  log({ action: 'MEAL_ADD', hallId: item.hallId, detail: `${item.day} ${item.slot}: ${item.name}` });
  emit();
};

export const updateMeal = (id: string, patch: Partial<MealItem>) => {
  const m = meals.find(x => x.id === id);
  meals = meals.map(x => x.id === id ? { ...x, ...patch } : x);
  log({ action: 'MEAL_UPDATE', hallId: m?.hallId, detail: JSON.stringify(patch) });
  emit();
};

export const deleteMeal = (id: string) => {
  const m = meals.find(x => x.id === id);
  meals = meals.filter(x => x.id !== id);
  log({ action: 'MEAL_DELETE', hallId: m?.hallId, detail: m?.name });
  emit();
};

// ---------- Transfers ---------------------------------------------------

let transferSeq = 1;
export const createTransfer = (data: Omit<CanteenStockTransfer, 'id' | 'reference' | 'status' | 'createdAt'>) => {
  const t: CanteenStockTransfer = {
    id: `tr${Date.now()}`,
    reference: `CT-${String(transferSeq++).padStart(4, '0')}`,
    status: 'Pending',
    createdAt: new Date().toISOString(),
    ...data,
  };
  transfers = [t, ...transfers];
  log({ action: 'TRANSFER_CREATE', hallId: t.hallId, detail: `${t.reference} · ${t.items.length} items` });
  emit();
  return t;
};

export const receiveTransfer = (id: string) => {
  const t = transfers.find(x => x.id === id);
  transfers = transfers.map(x => x.id === id ? { ...x, status: 'Received', receivedAt: new Date().toISOString() } : x);
  if (t) log({ action: 'TRANSFER_RECEIVE', hallId: t.hallId, detail: t.reference });
  emit();
};

export const rejectTransfer = (id: string, reason: string) => {
  const t = transfers.find(x => x.id === id);
  transfers = transfers.map(x => x.id === id ? { ...x, status: 'Rejected', notes: reason } : x);
  if (t) log({ action: 'TRANSFER_REJECT', hallId: t.hallId, detail: `${t.reference}: ${reason}` });
  emit();
};

// ---------- Requisitions -----------------------------------------------

let reqSeq = 1;
export const createCanteenRequisition = (data: Omit<CanteenRequisition, 'id' | 'reference' | 'status' | 'createdAt'>) => {
  const r: CanteenRequisition = {
    id: `cr${Date.now()}`,
    reference: `CANT-REQ-${String(reqSeq++).padStart(4, '0')}`,
    status: 'Submitted',
    createdAt: new Date().toISOString(),
    ...data,
  };
  requisitions = [r, ...requisitions];
  log({ action: 'REQUISITION_CREATE', hallId: r.hallId, detail: r.reference });
  emit();
  return r;
};

export const setRequisitionStatus = (id: string, status: CanteenRequisition['status']) => {
  const r = requisitions.find(x => x.id === id);
  requisitions = requisitions.map(x => x.id === id ? { ...x, status } : x);
  if (r) {
    const map: Record<string, CanteenAuditAction> = {
      Approved: 'REQUISITION_APPROVE', Rejected: 'REQUISITION_REJECT', Fulfilled: 'REQUISITION_FULFILL',
    };
    if (map[status]) log({ action: map[status], hallId: r.hallId, detail: r.reference });
  }
  emit();
};

// ---------- Reviews -----------------------------------------------------

export const addReview = (r: Omit<CanteenReview, 'id' | 'createdAt'>) => {
  const rev: CanteenReview = { id: `rv${Date.now()}`, createdAt: new Date().toISOString(), ...r };
  reviews = [rev, ...reviews];
  log({ action: 'REVIEW_ADD', hallId: rev.hallId, detail: `${rev.rating}★ by ${rev.studentName || rev.studentId}` });
  emit();
  return rev;
};

export const deleteReview = (id: string) => {
  const r = reviews.find(x => x.id === id);
  reviews = reviews.filter(x => x.id !== id);
  if (r) log({ action: 'REVIEW_DELETE', hallId: r.hallId, detail: r.id });
  emit();
};

// ---------- Selectors ---------------------------------------------------

export const getHallStaff = (hallId: string) => staff.filter(s => s.hallId === hallId);
export const getHallMeals = (hallId: string) => meals.filter(m => m.hallId === hallId);
export const getHallReviews = (hallId: string) => reviews.filter(r => r.hallId === hallId);
export const getAverageRating = (hallId: string) => {
  const rs = reviews.filter(r => r.hallId === hallId);
  if (rs.length === 0) return 0;
  return rs.reduce((s, r) => s + r.rating, 0) / rs.length;
};
