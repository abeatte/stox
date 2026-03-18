import type { RefObject } from 'react';
import { COLUMNS } from '../columns';
import { ColumnKey } from '../types';

export interface TableHeaderProps {
  sortColumn: ColumnKey | null;
  sortDirection: 'asc' | 'desc';
  onSort: (col: ColumnKey) => void;
  columnWidths: Record<ColumnKey, number>;
  onResizeStart: (key: ColumnKey, e: React.MouseEvent) => void;
  isResizingRef: RefObject<boolean>;
}

/**
 * Renders a <colgroup> for column widths, then the header row.
 * Each header cell has a draggable resize handle on its right edge.
 */
export function TableHeader({
  sortColumn,
  sortDirection,
  onSort,
  columnWidths,
  onResizeStart,
  isResizingRef,
}: TableHeaderProps) {
  const handleHeaderClick = (key: ColumnKey) => {
    // Suppress sort when a column resize just finished
    if (isResizingRef.current) return;
    onSort(key);
  };

  return (
    <>
      <colgroup>
        {COLUMNS.map((col) => (
          <col key={col.key} style={{ width: columnWidths[col.key] }} />
        ))}
        {/* col for the remove-button column */}
        <col style={{ width: 36 }} />
      </colgroup>
      <thead>
        <tr>
          {COLUMNS.map((col) => {
            const isActive = sortColumn === col.key;
            return (
              <th
                key={col.key}
                onClick={() => handleHeaderClick(col.key)}
                aria-sort={
                  isActive
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                <span className="gs-th-content">
                  {col.label}
                  {isActive && (
                    <span aria-hidden="true" className="gs-sort-arrow">
                      {sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </span>
                {/* Resize handle */}
                <span
                  className="gs-resize-handle"
                  onMouseDown={(e) => onResizeStart(col.key, e)}
                  role="separator"
                  aria-orientation="vertical"
                />
              </th>
            );
          })}
          {/* Empty header for remove column */}
          <th />
        </tr>
      </thead>
    </>
  );
}
