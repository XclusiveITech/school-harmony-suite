// Brainstar Accounting Store – central journal posting layer.
// Receives postings from operational modules (tuckshop today; extendable)
// and feeds GL / Cashbook / Journals views and dedicated printable reports.

import { useSyncExternalStore } from 'react';

export type JournalSource =
  | 'TUCKSHOP_SALE'
  | 'TUCKSHOP_REFUND'
  | 'TUCKSHOP_VOID'
  | 'TUCKSHOP_WASTAGE'
  | 'MANUAL';

export interface JournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string;          // ISO datetime
  ref: string;           // e.g. JNL-TUCK-0001
  source: JournalSource;
  sourceRef?: string;    // originating doc ref (sale ref, etc.)
  description: string;
  lines: JournalLine[];
  cashImpact?: {         // populated when entry hits a cash/bank account
    accountCode: string;
    accountName: string;
    amount: number;      // positive = receipt (DR cash), negative = payment
  };
}

// ---------- Tuckshop chart-of-accounts additions ----------
export const TUCK_ACCOUNTS = {
  CASH:           { code: '1110', name: 'Tuckshop Cash on Hand' },
  STUDENT_CARD:   { code: '1210', name: 'Student Card Receivable' },
  PARENT_ACCOUNT: { code: '1220', name: 'Parent Account Receivable' },
  INVENTORY:      { code: '1400', name: 'Inventory - Tuckshop' },
  SALES:          { code: '4300', name: 'Tuckshop Sales Revenue' },
  COGS:           { code: '5500', name: 'Tuckshop Cost of Sales' },
  WASTAGE:        { code: '5600', name: 'Tuckshop Wastage Expense' },
  REFUNDS:        { code: '4310', name: 'Tuckshop Sales Refunds' },
} as const;

const CASH_LIKE_CODES = new Set([
  TUCK_ACCOUNTS.CASH.code,
  TUCK_ACCOUNTS.STUDENT_CARD.code,
  TUCK_ACCOUNTS.PARENT_ACCOUNT.code,
  '1000', '1100', '1150',
]);

interface AcctState { entries: JournalEntry[]; }
let state: AcctState = { entries: [] };
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const emit = () => listeners.forEach(l => l());
const set = (u: (s: AcctState) => AcctState) => { state = u(state); emit(); };

export function useAccounting<T>(selector: (s: AcctState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

let counter = 0;
const newRef = () => `JNL-TUCK-${(++counter).toString().padStart(4, '0')}`;
const newId = () => Math.random().toString(36).slice(2, 10);

function paymentToAccount(method: 'Cash' | 'Student Card' | 'Parent Account') {
  if (method === 'Cash') return TUCK_ACCOUNTS.CASH;
  if (method === 'Student Card') return TUCK_ACCOUNTS.STUDENT_CARD;
  return TUCK_ACCOUNTS.PARENT_ACCOUNT;
}

function post(entry: Omit<JournalEntry, 'id' | 'ref'> & { ref?: string }): JournalEntry {
  const cashLine = entry.lines.find(l => CASH_LIKE_CODES.has(l.accountCode));
  const full: JournalEntry = {
    id: newId(),
    ref: entry.ref ?? newRef(),
    ...entry,
    cashImpact: cashLine
      ? {
          accountCode: cashLine.accountCode,
          accountName: cashLine.accountName,
          amount: cashLine.debit - cashLine.credit,
        }
      : undefined,
  };
  set(s => ({ entries: [full, ...s.entries] }));
  return full;
}

// ---------- Public posting API ----------
export function postTuckshopSale(input: {
  date: string; saleRef: string;
  paymentMethod: 'Cash' | 'Student Card' | 'Parent Account';
  amount: number; cogs: number;
  studentName?: string;
}) {
  const pay = paymentToAccount(input.paymentMethod);
  return post({
    date: input.date,
    source: 'TUCKSHOP_SALE',
    sourceRef: input.saleRef,
    description: `Tuckshop sale ${input.saleRef}${input.studentName ? ` – ${input.studentName}` : ''} (${input.paymentMethod})`,
    lines: [
      { accountCode: pay.code, accountName: pay.name, debit: input.amount, credit: 0 },
      { accountCode: TUCK_ACCOUNTS.SALES.code, accountName: TUCK_ACCOUNTS.SALES.name, debit: 0, credit: input.amount },
      { accountCode: TUCK_ACCOUNTS.COGS.code, accountName: TUCK_ACCOUNTS.COGS.name, debit: input.cogs, credit: 0 },
      { accountCode: TUCK_ACCOUNTS.INVENTORY.code, accountName: TUCK_ACCOUNTS.INVENTORY.name, debit: 0, credit: input.cogs },
    ],
  });
}

export function postTuckshopRefund(input: {
  date: string; saleRef: string; kind: 'Refund' | 'Void';
  paymentMethod: 'Cash' | 'Student Card' | 'Parent Account';
  amount: number; cogs: number;
}) {
  const pay = paymentToAccount(input.paymentMethod);
  return post({
    date: input.date,
    source: input.kind === 'Refund' ? 'TUCKSHOP_REFUND' : 'TUCKSHOP_VOID',
    sourceRef: input.saleRef,
    description: `Tuckshop ${input.kind.toLowerCase()} of ${input.saleRef} (${input.paymentMethod})`,
    lines: [
      { accountCode: TUCK_ACCOUNTS.REFUNDS.code, accountName: TUCK_ACCOUNTS.REFUNDS.name, debit: input.amount, credit: 0 },
      { accountCode: pay.code, accountName: pay.name, debit: 0, credit: input.amount },
      { accountCode: TUCK_ACCOUNTS.INVENTORY.code, accountName: TUCK_ACCOUNTS.INVENTORY.name, debit: input.cogs, credit: 0 },
      { accountCode: TUCK_ACCOUNTS.COGS.code, accountName: TUCK_ACCOUNTS.COGS.name, debit: 0, credit: input.cogs },
    ],
  });
}

export function postTuckshopWastage(input: {
  date: string; ref: string; cost: number; reason?: string;
}) {
  return post({
    date: input.date,
    source: 'TUCKSHOP_WASTAGE',
    sourceRef: input.ref,
    description: `Tuckshop wastage ${input.ref}${input.reason ? ` – ${input.reason}` : ''}`,
    lines: [
      { accountCode: TUCK_ACCOUNTS.WASTAGE.code, accountName: TUCK_ACCOUNTS.WASTAGE.name, debit: input.cost, credit: 0 },
      { accountCode: TUCK_ACCOUNTS.INVENTORY.code, accountName: TUCK_ACCOUNTS.INVENTORY.name, debit: 0, credit: input.cost },
    ],
  });
}

// ---------- Selectors ----------
export const selectEntries = (s: AcctState) => s.entries;

export function getEntriesBySource(source: JournalSource | 'ALL', from?: string, to?: string) {
  return state.entries.filter(e => {
    if (source !== 'ALL' && e.source !== source) return false;
    const d = e.date.slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}

export function getAccountBalances() {
  const map = new Map<string, { code: string; name: string; debit: number; credit: number }>();
  for (const e of state.entries) {
    for (const l of e.lines) {
      const cur = map.get(l.accountCode) ?? { code: l.accountCode, name: l.accountName, debit: 0, credit: 0 };
      cur.debit += l.debit;
      cur.credit += l.credit;
      map.set(l.accountCode, cur);
    }
  }
  return Array.from(map.values());
}
