// Requisitions module – internal purchase requests workflow.
// Lifecycle: Draft → Submitted → Approved/Rejected → Issued (links to inventory) → Closed.

import { useSyncExternalStore } from 'react';

export type RequisitionStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Issued' | 'Closed';
export type RequisitionPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

export interface RequisitionLine {
  id: string;
  productId?: string;
  description: string;
  unit: string;
  quantity: number;
  estimatedCost?: number;
}

export interface Requisition {
  id: string;
  ref: string;
  date: string;            // ISO date
  requestedBy: string;
  department: string;
  warehouseId?: string;    // delivery destination
  priority: RequisitionPriority;
  reason: string;
  lines: RequisitionLine[];
  status: RequisitionStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  issuedAt?: string;
  notes?: string;
}

interface ReqState { requisitions: Requisition[]; }

const seed: Requisition[] = [
  {
    id: 'r1', ref: 'REQ-0001', date: '2026-04-15',
    requestedBy: 'Mary Chikozho', department: 'Science',
    priority: 'Normal',
    reason: 'Replenish lab consumables for term 2 practicals',
    lines: [
      { id: 'l1', description: 'Beakers 250ml', unit: 'EA', quantity: 24, estimatedCost: 4.5 },
      { id: 'l2', description: 'Litmus paper booklets', unit: 'BOX', quantity: 6, estimatedCost: 12 },
    ],
    status: 'Submitted',
  },
  {
    id: 'r2', ref: 'REQ-0002', date: '2026-04-18',
    requestedBy: 'Joseph Banda', department: 'Sports',
    priority: 'High',
    reason: 'New season football kits',
    lines: [
      { id: 'l3', description: 'Football jerseys (set of 11)', unit: 'SET', quantity: 2, estimatedCost: 320 },
      { id: 'l4', description: 'Match footballs size 5', unit: 'EA', quantity: 8, estimatedCost: 25 },
    ],
    status: 'Approved',
    approvedBy: 'Bursar',
    approvedAt: '2026-04-19T09:00:00Z',
  },
];

let state: ReqState = { requisitions: seed };
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const emit = () => listeners.forEach(l => l());
const set = (u: (s: ReqState) => ReqState) => { state = u(state); emit(); };

export function useRequisitions<T>(selector: (s: ReqState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

let counter = seed.length;
const newId = () => Math.random().toString(36).slice(2, 10);
const newRef = () => `REQ-${(++counter).toString().padStart(4, '0')}`;

export function createRequisition(input: Omit<Requisition, 'id' | 'ref' | 'status'> & { status?: RequisitionStatus }): Requisition {
  const req: Requisition = {
    ...input,
    id: newId(),
    ref: newRef(),
    status: input.status ?? 'Draft',
  };
  set(s => ({ requisitions: [req, ...s.requisitions] }));
  return req;
}

export function updateRequisition(id: string, patch: Partial<Requisition>) {
  set(s => ({ requisitions: s.requisitions.map(r => r.id === id ? { ...r, ...patch } : r) }));
}

export function deleteRequisition(id: string) {
  set(s => ({ requisitions: s.requisitions.filter(r => r.id !== id) }));
}

export function submitRequisition(id: string) { updateRequisition(id, { status: 'Submitted' }); }
export function approveRequisition(id: string, approver: string) {
  updateRequisition(id, { status: 'Approved', approvedBy: approver, approvedAt: new Date().toISOString() });
}
export function rejectRequisition(id: string, reason: string) {
  updateRequisition(id, { status: 'Rejected', rejectedReason: reason });
}
export function issueRequisition(id: string) {
  updateRequisition(id, { status: 'Issued', issuedAt: new Date().toISOString() });
}
export function closeRequisition(id: string) { updateRequisition(id, { status: 'Closed' }); }
