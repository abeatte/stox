import { useState, useCallback } from 'react';
import { ColumnKey, SortKey, SortCriterion, StockRowData } from '../types';
import { COLUMNS } from '../columns';

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
          // Third shift-click: remove this criterion
          return prev.filter((_, i) => i !== idx);
        }

        // Plain click: single-column sort with 3-click cycle
        if (idx !== -1 && prev.length === 1) {
          if (prev[0].direction === 'asc') {
            return [{ column: col, direction: 'desc' }];
          }
          // Third click: clear
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
