import type { ColumnKey } from '../types';

/** Value type for cells that can be highlighted. */
type CellValue = string | number | null;

/**
 * Returns a CSS highlight class for specific cells based on value thresholds.
 *
 * Thresholds:
 * - dividendPercent / divYield: yellow when null or 0
 * - eps: red when negative
 * - pBook / pTangbook: green 0.15–0.85, yellow 0.85–1.15, red otherwise
 * - priceEarnings: green 0–15, yellow 15–20, red >20 or negative
 */
export function getCellHighlight(key: ColumnKey, value: CellValue): string | undefined {
  if (key === 'dividendPercent' || key === 'divYield') {
    if (value === null || value === 0) return 'gs-cell-yellow';
  }

  if (key === 'eps') {
    if (typeof value !== 'number') return undefined;
    if (value < 0) return 'gs-cell-red';
  }

  if (key === 'pBook' || key === 'pTangbook') {
    if (typeof value !== 'number') return undefined;
    if (value >= 0.15 && value <= 0.85) return 'gs-cell-green';
    if (value > 0.85 && value <= 1.15) return 'gs-cell-yellow';
    if (value < 0.15 || value > 1.15) return 'gs-cell-red';
  }

  if (key === 'priceEarnings') {
    if (typeof value !== 'number') return undefined;
    if (value >= 0 && value <= 15) return 'gs-cell-green';
    if (value > 15 && value <= 20) return 'gs-cell-yellow';
    if (value > 20 || value < 0) return 'gs-cell-red';
  }

  return undefined;
}
