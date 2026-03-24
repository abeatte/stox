import { useState, useCallback } from 'react';
import { ColumnKey, SortKey, StockRowData } from '../types';
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
 * Sorts StockRowData[] by the given column and direction.
 * Uses numeric comparison for numeric sortType columns, alpha for text columns.
 * Returns a new array — does NOT modify the input.
 */
export function sortRows(
  rows: StockRowData[],
  column: ColumnKey | null,
  direction: 'asc' | 'desc',
): StockRowData[] {
  if (!column) return rows;

  const colDef = COLUMNS.find((c) => c.key === column);
  if (!colDef) return rows;

  const sorted = [...rows];
  const dir = direction === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    const aVal = a[column];
    const bVal = b[column];

    // Nulls always sort to the end regardless of direction
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    if (colDef.sortType === 'numeric') {
      return ((aVal as number) - (bVal as number)) * dir;
    }

    // Alpha sort
    return String(aVal).localeCompare(String(bVal)) * dir;
  });

  return sorted;
}

/**
 * Hook that manages table search query, sort column, and sort direction state.
 */
export function useTableState() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const onSort = useCallback(
    (col: SortKey) => {
      if (sortColumn === col) {
        if (sortDirection === 'asc') {
          setSortDirection('desc');
        } else {
          // Third click: clear the sort
          setSortColumn(null);
          setSortDirection('asc');
        }
      } else {
        setSortColumn(col);
        setSortDirection('asc');
      }
    },
    [sortColumn, sortDirection],
  );

  const onSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  return {
    searchQuery,
    onSearchChange,
    sortColumn,
    sortDirection,
    onSort,
    filterTickers,
    sortRows,
  };
}
