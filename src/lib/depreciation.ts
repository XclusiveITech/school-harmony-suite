import type { Asset } from './dummy-data';

export type DepreciationMethod = 'straight-line' | 'reducing-balance';

export interface DepreciationYear {
  year: number;
  openingValue: number;
  depreciation: number;
  accumulated: number;
  closingValue: number;
}

export interface AssetDepreciation {
  asset: Asset;
  method: DepreciationMethod;
  usefulLife: number; // years
  salvageValue: number;
  purchaseYear: number;
  currentYear: number;
  yearsHeld: number;
  schedule: DepreciationYear[];
  bookValue: number; // computed current
  accumulatedDepreciation: number;
  annualDepreciation: number; // current period charge
  fullyDepreciated: boolean;
}

export function computeUsefulLife(rate: number): number {
  if (!rate || rate <= 0) return 10;
  return Math.max(1, Math.round(100 / rate));
}

export function buildSchedule(
  asset: Asset,
  method: DepreciationMethod = 'straight-line',
  asOfYear: number = new Date().getFullYear(),
  salvageValue = 0,
): AssetDepreciation {
  const purchaseYear = new Date(asset.purchaseDate).getFullYear();
  const rate = asset.depreciationRate / 100;
  const usefulLife = computeUsefulLife(asset.depreciationRate);
  const schedule: DepreciationYear[] = [];

  let opening = asset.cost;
  let accumulated = 0;
  const totalYears = Math.max(usefulLife, asOfYear - purchaseYear + 1);

  for (let i = 0; i < totalYears; i++) {
    const year = purchaseYear + i;
    let depreciation = 0;
    if (method === 'straight-line') {
      const annual = (asset.cost - salvageValue) / usefulLife;
      depreciation = i < usefulLife ? annual : 0;
    } else {
      depreciation = opening * rate;
      if (opening - depreciation < salvageValue) depreciation = Math.max(0, opening - salvageValue);
    }
    depreciation = Math.max(0, Math.min(depreciation, opening - salvageValue));
    const closing = opening - depreciation;
    accumulated += depreciation;
    schedule.push({
      year,
      openingValue: round(opening),
      depreciation: round(depreciation),
      accumulated: round(accumulated),
      closingValue: round(closing),
    });
    opening = closing;
    if (closing <= salvageValue) break;
  }

  const currentRow = schedule.find(r => r.year === asOfYear) || schedule[schedule.length - 1];
  const bookValue = currentRow?.closingValue ?? asset.cost;
  const accumulatedDepreciation = currentRow?.accumulated ?? 0;
  const annualDepreciation = currentRow?.depreciation ?? 0;

  return {
    asset,
    method,
    usefulLife,
    salvageValue,
    purchaseYear,
    currentYear: asOfYear,
    yearsHeld: Math.max(0, asOfYear - purchaseYear),
    schedule,
    bookValue,
    accumulatedDepreciation,
    annualDepreciation,
    fullyDepreciated: bookValue <= salvageValue,
  };
}

function round(n: number) { return Math.round(n * 100) / 100; }
