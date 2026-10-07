// Live Finance report data from the Django backend. These are server-side
// aggregated, read-only endpoints computed from posted journal lines
// (journal entries + GL accounts; invoices/receipts post to GL).
// See BACKEND_REPORTS.md for the Django implementation.
//
// Endpoints:
//   /api/finance/reports/trial-balance/?date_from=&date_to=&branch=
//   /api/finance/reports/balance-sheet/?date_from=&date_to=&branch=
//   /api/finance/reports/income-statement/?date_from=&date_to=&branch=
//   /api/finance/reports/cumulative-income/?date_from=&date_to=
//   /api/finance/reports/fees-statement/?student=<id>&date_from=&date_to=
//   /api/finance/reports/fees-balances/?date_from=&date_to=&branch=

import { api } from './api';
import { safeList, num } from './finance-api';

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  branch?: string | number;
}

function buildQuery(filters: ReportFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters.dateTo) params.set('date_to', filters.dateTo);
  if (filters.branch) params.set('branch', String(filters.branch));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/* ------------------------------------------------------------------ */
/* Trial balance                                                       */
/* ------------------------------------------------------------------ */

export interface TrialBalanceRow {
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
}

export async function getTrialBalance(filters: ReportFilters = {}): Promise<TrialBalanceRow[]> {
  const rows = await safeList<any>(`/api/finance/reports/trial-balance/${buildQuery(filters)}`);
  return rows.map(r => ({ code: r.code, name: r.name, type: r.type, debit: num(r.debit), credit: num(r.credit) }));
}

/* ------------------------------------------------------------------ */
/* Balance sheet                                                       */
/* ------------------------------------------------------------------ */

export interface BalanceSheetLine {
  code: string;
  name: string;
  amount: number;
}

export interface BalanceSheetReport {
  assets: BalanceSheetLine[];
  liabilities: BalanceSheetLine[];
  equity: BalanceSheetLine[];
}

function normaliseLines(arr: any): BalanceSheetLine[] {
  return Array.isArray(arr) ? arr.map((r: any) => ({ code: r.code, name: r.name, amount: num(r.amount) })) : [];
}

export async function getBalanceSheet(filters: ReportFilters = {}): Promise<BalanceSheetReport> {
  const res = await api.get<any>(`/api/finance/reports/balance-sheet/${buildQuery(filters)}`);
  return {
    assets: normaliseLines(res?.assets),
    liabilities: normaliseLines(res?.liabilities),
    equity: normaliseLines(res?.equity),
  };
}

/* ------------------------------------------------------------------ */
/* Income statement                                                    */
/* ------------------------------------------------------------------ */

export interface IncomeStatementLine {
  code: string;
  name: string;
  amount: number;
}

export interface IncomeStatementReport {
  revenue: IncomeStatementLine[];
  expenses: IncomeStatementLine[];
  net: number;
}

export async function getIncomeStatement(filters: ReportFilters = {}): Promise<IncomeStatementReport> {
  const res = await api.get<any>(`/api/finance/reports/income-statement/${buildQuery(filters)}`);
  const revenue = normaliseLines(res?.revenue);
  const expenses = normaliseLines(res?.expenses);
  const net = res?.net !== undefined
    ? num(res.net)
    : revenue.reduce((s, l) => s + l.amount, 0) - expenses.reduce((s, l) => s + l.amount, 0);
  return { revenue, expenses, net };
}

/* ------------------------------------------------------------------ */
/* Cumulative (per-branch) income statement                            */
/* ------------------------------------------------------------------ */

export interface BranchIncomeStatement {
  branch: number | string;
  branch_name: string;
  revenue: IncomeStatementLine[];
  expenses: IncomeStatementLine[];
  net: number;
}

export interface CumulativeIncomeReport {
  branches: BranchIncomeStatement[];
  consolidated: IncomeStatementReport;
}

export async function getCumulativeIncome(filters: ReportFilters = {}): Promise<CumulativeIncomeReport> {
  const qs = buildQuery(filters);
  const res = await api.get<any>(`/api/finance/reports/cumulative-income/${qs}`);
  const branches: BranchIncomeStatement[] = Array.isArray(res?.branches) ? res.branches.map((b: any) => {
    const revenue = normaliseLines(b.revenue);
    const expenses = normaliseLines(b.expenses);
    const net = b.net !== undefined
      ? num(b.net)
      : revenue.reduce((s, l) => s + l.amount, 0) - expenses.reduce((s, l) => s + l.amount, 0);
    return { branch: b.branch, branch_name: b.branch_name, revenue, expenses, net };
  }) : [];
  const consolidatedRaw = res?.consolidated ?? {};
  const consolidated: IncomeStatementReport = {
    revenue: normaliseLines(consolidatedRaw.revenue),
    expenses: normaliseLines(consolidatedRaw.expenses),
    net: consolidatedRaw.net !== undefined ? num(consolidatedRaw.net) : 0,
  };
  return { branches, consolidated };
}

/* ------------------------------------------------------------------ */
/* Fees statement (per student)                                        */
/* ------------------------------------------------------------------ */

export interface FeesStatementLine {
  date: string;
  description: string;
  type: 'Invoice' | 'Receipt' | string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
}

export async function getFeesStatement(studentId: number | string, filters: ReportFilters = {}): Promise<FeesStatementLine[]> {
  const params = new URLSearchParams();
  params.set('student', String(studentId));
  if (filters.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters.dateTo) params.set('date_to', filters.dateTo);
  const rows = await safeList<any>(`/api/finance/reports/fees-statement/?${params.toString()}`);
  return rows.map(r => ({
    date: r.date,
    description: r.description,
    type: r.type,
    reference: r.reference,
    debit: num(r.debit),
    credit: num(r.credit),
    balance: num(r.balance),
  }));
}

/* ------------------------------------------------------------------ */
/* Fees balances (per student)                                         */
/* ------------------------------------------------------------------ */

export interface FeesBalanceRow {
  student: number;
  student_no: string;
  name: string;
  class_name: string;
  invoiced: number;
  paid: number;
  balance: number;
}

export async function getFeesBalances(filters: ReportFilters = {}): Promise<FeesBalanceRow[]> {
  const rows = await safeList<any>(`/api/finance/reports/fees-balances/${buildQuery(filters)}`);
  return rows.map(r => ({
    student: r.student,
    student_no: r.student_no,
    name: r.name,
    class_name: r.class_name,
    invoiced: num(r.invoiced),
    paid: num(r.paid),
    balance: num(r.balance),
  }));
}
