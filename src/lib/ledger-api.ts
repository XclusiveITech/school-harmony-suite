// Live General Ledger / Cashbook / Journals / Bank Reconciliation data from
// the Django backend. No dummy data — everything persists to MySQL.
//
// Endpoints (DRF routers — see BACKEND_LEDGER.md):
//   /api/finance/glaccount/              (extended with `balance`)
//   /api/finance/journalentry/           (nested `lines`)
//   /api/finance/journalentry/<id>/post/
//   /api/finance/journalentry/<id>/cancel/
//   /api/finance/cashbookentry/
//   /api/finance/cashbookentry/<id>/process/
//   /api/finance/bankstatementline/
//   /api/finance/bankstatementline/auto_match/

import { api, ApiError } from './api';
import { safeList, num, unwrap } from './finance-api';

export { safeList, num, unwrap };

/* ------------------------------------------------------------------ */
/* GL accounts                                                         */
/* ------------------------------------------------------------------ */

export interface LedgerGLAccount {
  id: number;
  code: string;
  name: string;
  type: string;
  balance?: number | string;
}

export async function listLedgerAccounts(): Promise<LedgerGLAccount[]> {
  return safeList<LedgerGLAccount>('/api/finance/glaccount/?limit=500');
}

/* ------------------------------------------------------------------ */
/* Journal entries                                                      */
/* ------------------------------------------------------------------ */

export type JournalStatus = 'Draft' | 'Posted' | 'Cancelled';

export interface JournalLine {
  id?: number;
  account: number;
  account_code?: string;
  account_name?: string;
  debit: number | string;
  credit: number | string;
  memo?: string;
}

export interface JournalEntry {
  id: number;
  date: string;
  reference: string;
  description: string;
  status: JournalStatus;
  source?: string;
  lines: JournalLine[];
}

export interface JournalEntryInput {
  date: string;
  reference: string;
  description: string;
  status: JournalStatus;
  source?: string;
  lines: { account: number; debit: number; credit: number; memo?: string }[];
}

export async function listJournalEntries(): Promise<JournalEntry[]> {
  return safeList<JournalEntry>('/api/finance/journalentry/?limit=500');
}

export async function createJournalEntry(input: JournalEntryInput): Promise<JournalEntry> {
  return api.post<JournalEntry>('/api/finance/journalentry/', input);
}

export async function postJournalEntry(id: number) {
  return api.post(`/api/finance/journalentry/${id}/post/`, {});
}

export async function cancelJournalEntry(id: number) {
  return api.post(`/api/finance/journalentry/${id}/cancel/`, {});
}

/* ------------------------------------------------------------------ */
/* Cashbook                                                             */
/* ------------------------------------------------------------------ */

export type CashbookType = 'Receipt' | 'Payment' | 'Transfer';
export type CashbookStatus = 'Pending' | 'Processed';

export interface CashbookEntry {
  id: number;
  date: string;
  type: CashbookType;
  account: number;
  account_code?: string;
  account_name?: string;
  contra_account: number | null;
  contra_account_code?: string;
  contra_account_name?: string;
  amount: number | string;
  currency: string;
  method: string;
  reference?: string;
  description?: string;
  status: CashbookStatus;
  counterparty?: string;
}

export interface CashbookEntryInput {
  date: string;
  type: CashbookType;
  account: number;
  contra_account: number | null;
  amount: number;
  currency: string;
  method: string;
  reference?: string;
  description?: string;
  status: CashbookStatus;
  counterparty?: string;
}

export async function listCashbookEntries(): Promise<CashbookEntry[]> {
  return safeList<CashbookEntry>('/api/finance/cashbookentry/?limit=1000');
}

export async function createCashbookEntry(input: CashbookEntryInput): Promise<CashbookEntry> {
  return api.post<CashbookEntry>('/api/finance/cashbookentry/', input);
}

export async function processCashbookEntry(id: number) {
  return api.post(`/api/finance/cashbookentry/${id}/process/`, {});
}

export async function deleteCashbookEntry(id: number) {
  return api.delete(`/api/finance/cashbookentry/${id}/`);
}

/* ------------------------------------------------------------------ */
/* Bank reconciliation                                                  */
/* ------------------------------------------------------------------ */

export interface BankStatementLine {
  id: number;
  date: string;
  description: string;
  amount: number | string;
  reference?: string;
  matched_entry: number | null;
}

export interface BankStatementLineInput {
  date: string;
  description: string;
  amount: number;
  reference?: string;
  matched_entry?: number | null;
}

export async function listBankStatementLines(): Promise<BankStatementLine[]> {
  return safeList<BankStatementLine>('/api/finance/bankstatementline/?limit=1000');
}

export async function createBankStatementLine(input: BankStatementLineInput): Promise<BankStatementLine> {
  return api.post<BankStatementLine>('/api/finance/bankstatementline/', input);
}

export async function matchBankStatementLine(id: number, matched_entry: number | null) {
  return api.patch<BankStatementLine>(`/api/finance/bankstatementline/${id}/`, { matched_entry });
}

export async function autoMatchBankStatementLines(): Promise<BankStatementLine[]> {
  return api.post<BankStatementLine[]>('/api/finance/bankstatementline/auto_match/', {});
}

export { ApiError };
