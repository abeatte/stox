import type { RefObject } from 'react';
import { COLUMNS } from '../columns';
import { ColumnKey, SortKey, SortCriterion } from '../types';

export interface TableHeaderProps {
  sortCriteria: SortCriterion[];
  onSort: (col: SortKey, multi?: boolean) => void;
  columnWidths: Record<ColumnKey, number>;
  onResizeStart: (key: ColumnKey, e: React.MouseEvent) => void;
  onAutoFit: (key: ColumnKey) => void;
  isResizingRef: RefObject<boolean>;
}

/**
 * Renders a <colgroup> for column widths, then the header row.
 * Each header cell has a draggable resize handle on its right edge.
 * Supports multi-column sort: shows arrow + priority number when multiple sorts are active.
 */
export function TableHeader({
  sortCriteria,
  onSort,
  columnWidths,
  onResizeStart,
  onAutoFit,
  isResizingRef,
}: TableHeaderProps) {
  const handleHeaderClick = (key: SortKey, e: React.MouseEvent) => {
    if (isResizingRef.current) return;
    onSort(key, e.shiftKey);
  };

  const multiSort = sortCriteria.length > 1;

  return (
    <>
      <colgroup>
        {COLUMNS.map((col) => (
          <col key={col.key} style={{ width: columnWidths[col.key] }} />
        ))}
        <col style={{ width: 36 }} />
        <col style={{ width: 36 }} />
      </colgroup>
      <thead>
        <tr>
          {COLUMNS.map((col) => {
            const sortIdx = sortCriteria.findIndex((c) => c.column === col.key);
            const isActive = sortIdx !== -1;
            const direction = isActive ? sortCriteria[sortIdx].direction : undefined;
            return (
              <th
                key={col.key}
                onClick={(e) => handleHeaderClick(col.key, e)}
                aria-sort={
                  isActive
                    ? direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                <span className="gs-th-content">
                  {isActive && (
                    <span aria-hidden="true" className="gs-sort-arrow">
                      {direction === 'asc' ? '▲' : '▼'}
                      {multiSort && <sup className="gs-sort-priority">{sortIdx + 1}</sup>}
                    </span>
                  )}
                  {col.label}
                </span>
                <span
                  className="gs-resize-handle"
                  onMouseDown={(e) => onResizeStart(col.key, e)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onAutoFit(col.key);
                  }}
                  role="separator"
                  aria-orientation="vertical"
                />
              </th>
            );
          })}
          {/* Star column header */}
          <th
            style={{ width: 36, cursor: 'pointer', paddingLeft: 13 }}
            aria-label="Star"
            onClick={(e) => handleHeaderClick('star', e)}
            aria-sort={
              (() => {
                const idx = sortCriteria.findIndex((c) => c.column === 'star');
                if (idx === -1) return undefined;
                return sortCriteria[idx].direction === 'asc' ? 'ascending' : 'descending';
              })()
            }
          >
            <span className="gs-th-content">
              {(() => {
                const idx = sortCriteria.findIndex((c) => c.column === 'star');
                if (idx === -1) return null;
                return (
                  <span aria-hidden="true" className="gs-sort-arrow">
                    {sortCriteria[idx].direction === 'asc' ? '▲' : '▼'}
                    {multiSort && <sup className="gs-sort-priority">{idx + 1}</sup>}
                  </span>
                );
              })()}
              ★
            </span>
          </th>
          <th />
        </tr>
      </thead>
    </>
  );
}
