// Live debtors-reconciliation data from the Django backend. No dummy data —
// debtor statement lines persist to MySQL and are matched against receipts.
//
// Endpoint (DRF router):
//   /api/finance/debtorstatementline/

import { api, ApiError } from './api';
import { safeList, num } from './finance-api';

export interface BackendDebtorStatementLine {
  id: number;
  student: number;
  date: string;
  description?: string | null;
  amount: number | string;
  reference?: string | null;
  matched: boolean;
  matched_receipt?: number | null;
}

export async function listDebtorStatementLines(): Promise<BackendDebtorStatementLine[]> {
  return safeList<BackendDebtorStatementLine>('/api/finance/debtorstatementline/?limit=1000');
}

export async function matchDebtorStatementLine(
  id: number,
  matched_receipt: number | null,
): Promise<BackendDebtorStatementLine> {
  return api.patch<BackendDebtorStatementLine>(`/api/finance/debtorstatementline/${id}/`, {
    matched: matched_receipt != null,
    matched_receipt,
  });
}

export { num, ApiError };
