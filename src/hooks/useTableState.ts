import { useState, useCallback } from 'react';
import { ColumnKey, SortKey, SortCriterion, StockRowData, INTRINSIC_COLUMNS } from '../types';
import { COLUMNS } from '../columns';
import { getCellHighlight } from '../utils/cellHighlight';

/**
 * Filters ticker symbols by case-insensitive substring match on the query.
 * Returns a new array — does NOT modify the input.
 */
export function filterTickers(tickers: string[], query: string): string[] {
  if (!query) return tickers;
  const lower = query.toLowerCase();
  return tickers.filter((t) => t.toLowerCase().includes(lower));
}

/**
 * Returns a numeric rank for intrinsic sorting.
 * Lower rank = more beneficial (sorted first).
 *
 * Ranking: green (0) → yellow (1) → red non-negative (2) → red negative (3) → null (4)
 */
export function getIntrinsicRank(key: ColumnKey, value: number | null): number {
  if (value === null) return 4;
  const highlight = getCellHighlight(key, value);
  if (highlight === 'gs-cell-green') return 0;
  if (highlight === 'gs-cell-yellow') return 1;
  // Red zone: negative values sink to the very bottom
  if (highlight === 'gs-cell-red') return value < 0 ? 3 : 2;
  return 2; // no highlight = neutral, treat as mid-tier
}

/**
 * Sorts StockRowData[] by multiple sort criteria (multi-column sort).
 * Earlier criteria in the array take higher priority.
 * Returns a new array — does NOT modify the input.
 */
export function sortRows(
  rows: StockRowData[],
  criteria: SortCriterion[],
): StockRowData[] {
  if (criteria.length === 0) return rows;

  const sorted = [...rows];

  sorted.sort((a, b) => {
    for (const { column, direction } of criteria) {
      // Skip the virtual 'star' column — handled separately in TickerTable
      if (column === 'star') continue;

      const colKey = column as ColumnKey;
      const colDef = COLUMNS.find((c) => c.key === colKey);
      if (!colDef) continue;

      const aVal = a[colKey];
      const bVal = b[colKey];

      // Nulls always sort to the end regardless of direction
      if (aVal == null && bVal == null) continue;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const dir = direction === 'asc' ? 1 : -1;
      let cmp = 0;

      if (direction === 'intr') {
        const aRank = getIntrinsicRank(colKey, typeof aVal === 'number' ? aVal : null);
        const bRank = getIntrinsicRank(colKey, typeof bVal === 'number' ? bVal : null);
        cmp = aRank - bRank;
        if (cmp !== 0) return cmp;
        // Within the same rank, sort by value ascending (lower ratio = more undervalued)
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          cmp = aVal - bVal;
        }
        if (cmp !== 0) return cmp;
        continue;
      }

      if (colDef.sortType === 'numeric') {
        cmp = Number(aVal) - Number(bVal);
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }

      if (cmp !== 0) return cmp * dir;
    }
    return 0;
  });

  return sorted;
}

/**
 * Hook that manages table search query and multi-column sort state.
 *
 * - Plain click: replaces all sort criteria with the clicked column.
 * - Shift+click: adds the column as a secondary (or further) sort criterion,
 *   or toggles its direction if already present, or removes it on third shift-click.
 */
export function useTableState() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCriteria, setSortCriteria] = useState<SortCriterion[]>([]);

  const onSort = useCallback(
    (col: SortKey, multi = false) => {
      setSortCriteria((prev) => {
        const idx = prev.findIndex((c) => c.column === col);

        const hasIntrinsic = INTRINSIC_COLUMNS.has(col);

        if (multi) {
          // Shift+click: add, toggle, or remove from the list
          if (idx === -1) {
            return [...prev, { column: col, direction: 'asc' }];
          }
          if (prev[idx].direction === 'asc') {
            const next = [...prev];
            next[idx] = { column: col, direction: 'desc' };
            return next;
          }
          if (prev[idx].direction === 'desc' && hasIntrinsic) {
            const next = [...prev];
            next[idx] = { column: col, direction: 'intr' };
            return next;
          }
          // Remove this criterion
          return prev.filter((_, i) => i !== idx);
        }

        // Plain click: single-column sort cycle
        if (idx !== -1 && prev.length === 1) {
          if (prev[0].direction === 'asc') {
            return [{ column: col, direction: 'desc' }];
          }
          if (prev[0].direction === 'desc' && hasIntrinsic) {
            return [{ column: col, direction: 'intr' }];
          }
          // Clear
          return [];
        }
        return [{ column: col, direction: 'asc' }];
      });
    },
    [],
  );

  const onSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  return {
    searchQuery,
    onSearchChange,
    sortCriteria,
    onSort,
    filterTickers,
    sortRows,
  };
}
