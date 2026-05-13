// Enterprise Requisition & Procurement store.
// Modules: requisitions, multi-level approvals, suppliers, quotations,
// purchase orders, goods received notes (GRN), budgets, audit log, attachments.
// All client-side, reactive via useSyncExternalStore.

import { useSyncExternalStore } from 'react';

// ---------- Core enums ----------
export type RequisitionStatus =
  | 'Draft' | 'Submitted' | 'UnderReview' | 'PendingApproval'
  | 'Approved' | 'Rejected' | 'Returned'
  | 'Procurement' | 'Ordered' | 'Delivered' | 'Received'
  | 'Issued' | 'Closed' | 'Cancelled';

export type RequisitionPriority = 'Low' | 'Normal' | 'High' | 'Urgent' | 'Emergency';
export type ApprovalDecision = 'Pending' | 'Approved' | 'Rejected' | 'Returned' | 'Skipped';
export type POStatus = 'Draft' | 'Sent' | 'PartiallyReceived' | 'Received' | 'Cancelled';

// ---------- Interfaces ----------
export interface Attachment {
  id: string; name: string; size: number; type: string; uploadedAt: string; uploadedBy: string;
}
export interface RequisitionLine {
  id: string;
  productId?: string;
  description: string;
  category?: string;
  unit: string;
  quantity: number;
  estimatedCost?: number;
  receivedQty?: number;
}
export interface ApprovalStep {
  id: string;
  level: number;
  role: string;            // e.g. 'HOD', 'Finance', 'Procurement', 'Principal'
  approver?: string;
  decision: ApprovalDecision;
  comment?: string;
  decidedAt?: string;
  signature?: string;
  slaHours?: number;
}
export interface Requisition {
  id: string;
  ref: string;
  date: string;
  requestedBy: string;
  requestedByRole?: string;
  department: string;
  warehouseId?: string;
  budgetCode?: string;
  priority: RequisitionPriority;
  emergency?: boolean;
  reason: string;
  notes?: string;
  requiredBy?: string;
  supplierSuggestionId?: string;
  lines: RequisitionLine[];
  attachments: Attachment[];
  approvals: ApprovalStep[];
  status: RequisitionStatus;
  approvedAt?: string;
  approvedBy?: string;
  rejectedReason?: string;
  poId?: string;
  issuedAt?: string;
  recurring?: { interval: 'Weekly' | 'Monthly' | 'Termly'; nextDue?: string };
  createdAt: string;
}

export interface Supplier {
  id: string; code: string; name: string; category: string;
  contactPerson?: string; email?: string; phone?: string; address?: string;
  taxId?: string; bank?: string; accountNo?: string;
  rating: number;          // 0-5
  status: 'Active' | 'Preferred' | 'Blacklisted' | 'Suspended';
  notes?: string;
  createdAt: string;
}

export interface Quotation {
  id: string; ref: string; requisitionId?: string; supplierId: string;
  date: string; validUntil?: string;
  lines: { description: string; unit: string; quantity: number; unitPrice: number }[];
  taxRate?: number;
  status: 'Received' | 'Selected' | 'Rejected';
  notes?: string;
}

export interface PurchaseOrderLine {
  id: string; description: string; unit: string;
  quantity: number; unitPrice: number; receivedQty: number;
  productId?: string;
}
export interface PurchaseOrder {
  id: string; ref: string; requisitionId?: string; supplierId: string;
  date: string; deliveryDate?: string; paymentTerms?: string; deliveryTerms?: string;
  taxRate: number;
  lines: PurchaseOrderLine[];
  status: POStatus;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface GRN {
  id: string; ref: string; poId: string; date: string;
  receivedBy: string; warehouseId?: string;
  lines: { poLineId: string; description: string; quantity: number; condition: 'Good' | 'Damaged' | 'Partial' }[];
  notes?: string;
}

export interface Budget {
  id: string; department: string; fiscalYear: string;
  category: string; allocated: number; committed: number; spent: number;
}

export interface AuditEntry {
  id: string; ts: string; user: string; action: string; entity: string; entityRef: string; details?: string;
}

interface State {
  requisitions: Requisition[];
  suppliers: Supplier[];
  quotations: Quotation[];
  purchaseOrders: PurchaseOrder[];
  grns: GRN[];
  budgets: Budget[];
  audit: AuditEntry[];
  approvalChains: Record<string, { role: string; slaHours: number; threshold?: number }[]>;
}

// ---------- Helpers ----------
const newId = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

// ---------- Approval chain config (by department or amount tier) ----------
const defaultChains: State['approvalChains'] = {
  Default:    [{ role: 'HOD', slaHours: 24 }, { role: 'Finance', slaHours: 24 }, { role: 'Procurement', slaHours: 48 }],
  HighValue:  [{ role: 'HOD', slaHours: 24 }, { role: 'Finance', slaHours: 24 }, { role: 'Procurement', slaHours: 48 }, { role: 'Principal', slaHours: 48, threshold: 5000 }],
  Emergency:  [{ role: 'HOD', slaHours: 4 }, { role: 'Principal', slaHours: 4 }],
  Hostel:     [{ role: 'Admin', slaHours: 24 }, { role: 'Finance', slaHours: 24 }],
};

// ---------- Seed ----------
const seedSuppliers: Supplier[] = [
  { id: 's1', code: 'SUP-0001', name: 'Office Plus Stationers', category: 'Stationery', contactPerson: 'Tafara M.', email: 'sales@officeplus.co.zw', phone: '+263 77 234 0011', address: 'Harare', taxId: 'TIN-12345', bank: 'CABS', accountNo: '1100250011', rating: 4.6, status: 'Preferred', createdAt: now() },
  { id: 's2', code: 'SUP-0002', name: 'Lab Glassware Africa', category: 'Lab Supplies', contactPerson: 'Dr. Moyo', email: 'orders@labglass.africa', phone: '+263 77 776 9001', address: 'Bulawayo', taxId: 'TIN-22941', rating: 4.2, status: 'Active', createdAt: now() },
  { id: 's3', code: 'SUP-0003', name: 'Champion Sportswear', category: 'Sports', email: 'team@champion.co.zw', phone: '+263 71 444 5566', rating: 3.9, status: 'Active', createdAt: now() },
];

const seedBudgets: Budget[] = [
  { id: 'b1', department: 'Science', fiscalYear: '2026', category: 'Consumables', allocated: 5000, committed: 350, spent: 1200 },
  { id: 'b2', department: 'Sports',  fiscalYear: '2026', category: 'Equipment',   allocated: 8000, committed: 840, spent: 2100 },
  { id: 'b3', department: 'Admin',   fiscalYear: '2026', category: 'Stationery',  allocated: 3000, committed: 0,   spent: 540  },
];

const seedRequisitions: Requisition[] = [
  {
    id: 'r1', ref: 'REQ-0001', date: '2026-04-15', createdAt: now(),
    requestedBy: 'Mary Chikozho', requestedByRole: 'Teacher', department: 'Science',
    priority: 'Normal', reason: 'Replenish lab consumables for term 2 practicals',
    budgetCode: 'SCI-CONS-26', requiredBy: '2026-05-10',
    lines: [
      { id: 'l1', description: 'Beakers 250ml', unit: 'EA', quantity: 24, estimatedCost: 4.5, category: 'Lab' },
      { id: 'l2', description: 'Litmus paper booklets', unit: 'BOX', quantity: 6, estimatedCost: 12, category: 'Lab' },
    ],
    attachments: [],
    approvals: [
      { id: 'a1', level: 1, role: 'HOD', decision: 'Approved', approver: 'Mr. Sibanda', comment: 'Needed for practicals', decidedAt: '2026-04-16T08:00:00Z' },
      { id: 'a2', level: 2, role: 'Finance', decision: 'Pending' },
      { id: 'a3', level: 3, role: 'Procurement', decision: 'Pending' },
    ],
    status: 'PendingApproval',
  },
  {
    id: 'r2', ref: 'REQ-0002', date: '2026-04-18', createdAt: now(),
    requestedBy: 'Joseph Banda', requestedByRole: 'HOD', department: 'Sports',
    priority: 'High', reason: 'New season football kits',
    budgetCode: 'SPRT-EQP-26',
    lines: [
      { id: 'l3', description: 'Football jerseys (set of 11)', unit: 'SET', quantity: 2, estimatedCost: 320 },
      { id: 'l4', description: 'Match footballs size 5', unit: 'EA', quantity: 8, estimatedCost: 25 },
    ],
    attachments: [],
    approvals: [
      { id: 'a4', level: 1, role: 'HOD', decision: 'Approved', approver: 'Joseph Banda', decidedAt: '2026-04-18T09:00:00Z' },
      { id: 'a5', level: 2, role: 'Finance', decision: 'Approved', approver: 'Bursar', decidedAt: '2026-04-19T10:00:00Z' },
      { id: 'a6', level: 3, role: 'Procurement', decision: 'Approved', approver: 'Procurement Officer', decidedAt: '2026-04-20T11:00:00Z' },
    ],
    status: 'Approved', approvedBy: 'Procurement Officer', approvedAt: '2026-04-20T11:00:00Z',
  },
];

const seedAudit: AuditEntry[] = [
  { id: 'au1', ts: now(), user: 'system', action: 'SEED', entity: 'Requisition', entityRef: 'REQ-0001', details: 'Initial seed' },
];

let state: State = {
  requisitions: seedRequisitions,
  suppliers: seedSuppliers,
  quotations: [],
  purchaseOrders: [],
  grns: [],
  budgets: seedBudgets,
  audit: seedAudit,
  approvalChains: defaultChains,
};

// ---------- Reactive plumbing ----------
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const emit = () => listeners.forEach(l => l());
const set = (u: (s: State) => State) => { state = u(state); emit(); };

export function useRequisitions<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

let reqCounter = seedRequisitions.length;
let supCounter = seedSuppliers.length;
let quoteCounter = 0, poCounter = 0, grnCounter = 0;
const refReq = () => `REQ-${(++reqCounter).toString().padStart(4, '0')}`;
const refSup = () => `SUP-${(++supCounter).toString().padStart(4, '0')}`;
const refQuote = () => `QUO-${(++quoteCounter).toString().padStart(4, '0')}`;
const refPO = () => `PO-${(++poCounter).toString().padStart(4, '0')}`;
const refGRN = () => `GRN-${(++grnCounter).toString().padStart(4, '0')}`;

const audit = (user: string, action: string, entity: string, entityRef: string, details?: string) => {
  set(s => ({ ...s, audit: [{ id: newId(), ts: now(), user, action, entity, entityRef, details }, ...s.audit].slice(0, 500) }));
};

// ---------- Approval chain selection ----------
function chainFor(req: Pick<Requisition, 'priority' | 'department' | 'lines'>): { role: string; slaHours: number }[] {
  const total = req.lines.reduce((s, l) => s + (l.estimatedCost ?? 0) * l.quantity, 0);
  if (req.priority === 'Emergency') return state.approvalChains.Emergency;
  if (req.department === 'Hostel') return state.approvalChains.Hostel;
  if (total >= 5000) return state.approvalChains.HighValue;
  return state.approvalChains.Default;
}

function buildApprovals(req: Pick<Requisition, 'priority' | 'department' | 'lines'>): ApprovalStep[] {
  return chainFor(req).map((c, i) => ({
    id: newId(), level: i + 1, role: c.role, decision: 'Pending' as ApprovalDecision, slaHours: c.slaHours,
  }));
}

// ---------- Requisition CRUD ----------
export function createRequisition(
  input: Omit<Requisition, 'id' | 'ref' | 'status' | 'approvals' | 'attachments' | 'createdAt'>
    & { status?: RequisitionStatus; attachments?: Attachment[]; approvals?: ApprovalStep[] },
  user = 'system',
): Requisition {
  const approvals = input.approvals ?? buildApprovals(input);
  const req: Requisition = {
    ...input,
    id: newId(),
    ref: refReq(),
    status: input.status ?? 'Draft',
    approvals,
    attachments: input.attachments ?? [],
    createdAt: now(),
  };
  set(s => ({ ...s, requisitions: [req, ...s.requisitions] }));
  audit(user, 'CREATE', 'Requisition', req.ref);
  return req;
}

export function updateRequisition(id: string, patch: Partial<Requisition>, user = 'system') {
  set(s => ({ ...s, requisitions: s.requisitions.map(r => r.id === id ? { ...r, ...patch } : r) }));
  const r = state.requisitions.find(x => x.id === id);
  if (r) audit(user, 'UPDATE', 'Requisition', r.ref, Object.keys(patch).join(','));
}
export function deleteRequisition(id: string, user = 'system') {
  const r = state.requisitions.find(x => x.id === id);
  set(s => ({ ...s, requisitions: s.requisitions.filter(x => x.id !== id) }));
  if (r) audit(user, 'DELETE', 'Requisition', r.ref);
}
export function cloneRequisition(id: string, user = 'system'): Requisition | null {
  const r = state.requisitions.find(x => x.id === id);
  if (!r) return null;
  return createRequisition({
    date: today(), requestedBy: r.requestedBy, requestedByRole: r.requestedByRole,
    department: r.department, warehouseId: r.warehouseId, budgetCode: r.budgetCode,
    priority: r.priority, reason: `(Clone) ${r.reason}`, notes: r.notes,
    lines: r.lines.map(l => ({ ...l, id: newId(), receivedQty: 0 })),
  }, user);
}

// ---------- Workflow actions ----------
export function submitRequisition(id: string, user = 'system') {
  const r = state.requisitions.find(x => x.id === id);
  if (!r) return;
  const approvals = r.approvals.length ? r.approvals : buildApprovals(r);
  updateRequisition(id, { status: 'PendingApproval', approvals }, user);
  audit(user, 'SUBMIT', 'Requisition', r.ref);
}

export function decideApproval(reqId: string, stepId: string, decision: 'Approved' | 'Rejected' | 'Returned', approver: string, comment?: string) {
  const r = state.requisitions.find(x => x.id === reqId);
  if (!r) return;
  const approvals = r.approvals.map(a => a.id === stepId ? { ...a, decision, approver, comment, decidedAt: now(), signature: `~${approver}` } : a);
  let status: RequisitionStatus = r.status;
  if (decision === 'Rejected') status = 'Rejected';
  else if (decision === 'Returned') status = 'Returned';
  else if (approvals.every(a => a.decision === 'Approved' || a.decision === 'Skipped')) {
    status = 'Approved';
  } else status = 'PendingApproval';
  updateRequisition(reqId, { status, approvals,
    approvedBy: status === 'Approved' ? approver : r.approvedBy,
    approvedAt: status === 'Approved' ? now() : r.approvedAt,
    rejectedReason: decision === 'Rejected' ? comment : r.rejectedReason,
  }, approver);
  audit(approver, decision.toUpperCase(), 'Requisition', r.ref, comment);
}

// Legacy compatibility helpers
export function approveRequisition(id: string, approver: string, comment?: string) {
  const r = state.requisitions.find(x => x.id === id);
  if (!r) return;
  const next = r.approvals.find(a => a.decision === 'Pending');
  if (next) decideApproval(id, next.id, 'Approved', approver, comment);
  else updateRequisition(id, { status: 'Approved', approvedBy: approver, approvedAt: now() }, approver);
}
export function rejectRequisition(id: string, reason: string, user = 'system') {
  const r = state.requisitions.find(x => x.id === id);
  if (!r) return;
  const next = r.approvals.find(a => a.decision === 'Pending');
  if (next) decideApproval(id, next.id, 'Rejected', user, reason);
  else updateRequisition(id, { status: 'Rejected', rejectedReason: reason }, user);
}
export function issueRequisition(id: string, user = 'system') {
  updateRequisition(id, { status: 'Issued', issuedAt: now() }, user);
}
export function closeRequisition(id: string, user = 'system') { updateRequisition(id, { status: 'Closed' }, user); }
export function cancelRequisition(id: string, user = 'system') { updateRequisition(id, { status: 'Cancelled' }, user); }

// ---------- Suppliers ----------
export function createSupplier(input: Omit<Supplier, 'id' | 'code' | 'createdAt'> & { code?: string }, user = 'system'): Supplier {
  const sup: Supplier = { ...input, id: newId(), code: input.code ?? refSup(), createdAt: now() };
  set(s => ({ ...s, suppliers: [sup, ...s.suppliers] }));
  audit(user, 'CREATE', 'Supplier', sup.code);
  return sup;
}
export function updateSupplier(id: string, patch: Partial<Supplier>, user = 'system') {
  set(s => ({ ...s, suppliers: s.suppliers.map(x => x.id === id ? { ...x, ...patch } : x) }));
  const sup = state.suppliers.find(x => x.id === id);
  if (sup) audit(user, 'UPDATE', 'Supplier', sup.code);
}
export function deleteSupplier(id: string, user = 'system') {
  const sup = state.suppliers.find(x => x.id === id);
  set(s => ({ ...s, suppliers: s.suppliers.filter(x => x.id !== id) }));
  if (sup) audit(user, 'DELETE', 'Supplier', sup.code);
}

// ---------- Quotations ----------
export function createQuotation(input: Omit<Quotation, 'id' | 'ref'>, user = 'system'): Quotation {
  const q: Quotation = { ...input, id: newId(), ref: refQuote() };
  set(s => ({ ...s, quotations: [q, ...s.quotations] }));
  audit(user, 'CREATE', 'Quotation', q.ref);
  return q;
}
export function selectQuotation(id: string, user = 'system') {
  const q = state.quotations.find(x => x.id === id);
  if (!q) return;
  set(s => ({ ...s, quotations: s.quotations.map(x => x.id === id ? { ...x, status: 'Selected' } :
    x.requisitionId && x.requisitionId === q.requisitionId ? { ...x, status: 'Rejected' } : x) }));
  audit(user, 'SELECT', 'Quotation', q.ref);
}

// ---------- Purchase Orders ----------
export function createPurchaseOrder(input: Omit<PurchaseOrder, 'id' | 'ref' | 'createdAt' | 'status'> & { status?: POStatus }, user = 'system'): PurchaseOrder {
  const po: PurchaseOrder = {
    ...input,
    id: newId(),
    ref: refPO(),
    status: input.status ?? 'Draft',
    createdAt: now(),
    lines: input.lines.map(l => ({ ...l, receivedQty: l.receivedQty ?? 0 })),
  };
  set(s => ({ ...s, purchaseOrders: [po, ...s.purchaseOrders] }));
  if (po.requisitionId) updateRequisition(po.requisitionId, { poId: po.id, status: 'Ordered' }, user);
  audit(user, 'CREATE', 'PurchaseOrder', po.ref);
  return po;
}
export function updatePurchaseOrder(id: string, patch: Partial<PurchaseOrder>, user = 'system') {
  set(s => ({ ...s, purchaseOrders: s.purchaseOrders.map(x => x.id === id ? { ...x, ...patch } : x) }));
  const po = state.purchaseOrders.find(x => x.id === id);
  if (po) audit(user, 'UPDATE', 'PurchaseOrder', po.ref);
}

// ---------- GRN ----------
export function createGRN(input: Omit<GRN, 'id' | 'ref'>, user = 'system'): GRN {
  const grn: GRN = { ...input, id: newId(), ref: refGRN() };
  set(s => ({ ...s, grns: [grn, ...s.grns] }));

  // Update PO line received quantities and status
  const po = state.purchaseOrders.find(p => p.id === input.poId);
  if (po) {
    const lines = po.lines.map(l => {
      const rec = input.lines.find(x => x.poLineId === l.id);
      return rec ? { ...l, receivedQty: l.receivedQty + rec.quantity } : l;
    });
    const fully = lines.every(l => l.receivedQty >= l.quantity);
    const any = lines.some(l => l.receivedQty > 0);
    updatePurchaseOrder(po.id, { lines, status: fully ? 'Received' : any ? 'PartiallyReceived' : po.status }, user);
    if (po.requisitionId) {
      updateRequisition(po.requisitionId, { status: fully ? 'Received' : 'Delivered' }, user);
    }
  }
  audit(user, 'CREATE', 'GRN', grn.ref);
  return grn;
}

// ---------- Budget ----------
export function commitBudget(department: string, category: string, amount: number, user = 'system') {
  set(s => ({ ...s, budgets: s.budgets.map(b => b.department === department && b.category === category ? { ...b, committed: b.committed + amount } : b) }));
  audit(user, 'COMMIT', 'Budget', `${department}/${category}`, `${amount}`);
}
export function spendBudget(department: string, category: string, amount: number, user = 'system') {
  set(s => ({ ...s, budgets: s.budgets.map(b => b.department === department && b.category === category ? { ...b, spent: b.spent + amount, committed: Math.max(0, b.committed - amount) } : b) }));
  audit(user, 'SPEND', 'Budget', `${department}/${category}`, `${amount}`);
}
export function upsertBudget(b: Omit<Budget, 'id'> & { id?: string }, user = 'system'): Budget {
  if (b.id) {
    set(s => ({ ...s, budgets: s.budgets.map(x => x.id === b.id ? { ...x, ...b } as Budget : x) }));
    audit(user, 'UPDATE', 'Budget', `${b.department}/${b.category}`);
    return state.budgets.find(x => x.id === b.id)!;
  }
  const nb: Budget = { ...b, id: newId() };
  set(s => ({ ...s, budgets: [nb, ...s.budgets] }));
  audit(user, 'CREATE', 'Budget', `${nb.department}/${nb.category}`);
  return nb;
}

export function checkBudget(department: string, category: string, amount: number): { ok: boolean; remaining: number } {
  const b = state.budgets.find(x => x.department === department && x.category === category);
  if (!b) return { ok: true, remaining: Infinity };
  const remaining = b.allocated - b.committed - b.spent;
  return { ok: amount <= remaining, remaining };
}

// ---------- Attachments ----------
export function addAttachment(reqId: string, att: Omit<Attachment, 'id' | 'uploadedAt'>, user = 'system') {
  const a: Attachment = { ...att, id: newId(), uploadedAt: now() };
  set(s => ({ ...s, requisitions: s.requisitions.map(r => r.id === reqId ? { ...r, attachments: [...r.attachments, a] } : r) }));
  audit(user, 'ATTACH', 'Requisition', state.requisitions.find(r => r.id === reqId)?.ref ?? '', a.name);
}
export function removeAttachment(reqId: string, attId: string, user = 'system') {
  set(s => ({ ...s, requisitions: s.requisitions.map(r => r.id === reqId ? { ...r, attachments: r.attachments.filter(a => a.id !== attId) } : r) }));
  audit(user, 'DETACH', 'Requisition', state.requisitions.find(r => r.id === reqId)?.ref ?? '');
}

// ---------- RBAC helpers ----------
export type RbacAction = 'view' | 'create' | 'edit' | 'approve' | 'delete' | 'procure' | 'receive' | 'audit';
const rolePermissions: Record<string, RbacAction[]> = {
  superadmin: ['view', 'create', 'edit', 'approve', 'delete', 'procure', 'receive', 'audit'],
  admin:      ['view', 'create', 'edit', 'approve', 'delete', 'procure', 'receive', 'audit'],
  accountant: ['view', 'approve', 'audit'],
  hr:         ['view', 'create'],
  teacher:    ['view', 'create'],
  student:    ['view'],
  parent:     ['view'],
};
export function canDo(role: string | undefined, action: RbacAction): boolean {
  if (!role) return false;
  return (rolePermissions[role] ?? ['view']).includes(action);
}
