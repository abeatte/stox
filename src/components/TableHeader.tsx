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
 * Renders the sort indicator (arrow + optional priority number) for a column.
 * Returns null if the column is not actively sorted.
 */
function SortIndicator({
  sortCriteria,
  column,
}: {
  sortCriteria: SortCriterion[];
  column: SortKey;
}) {
  const idx = sortCriteria.findIndex((c) => c.column === column);
  if (idx === -1) return null;
  const multiSort = sortCriteria.length > 1;
  return (
    <span aria-hidden="true" className="gs-sort-arrow">
      {sortCriteria[idx].direction === 'asc' ? '▲' : '▼'}
      {multiSort && <sup className="gs-sort-priority">{idx + 1}</sup>}
    </span>
  );
}

/** Resolve aria-sort value for a column, or undefined if not sorted. */
function getAriaSort(sortCriteria: SortCriterion[], column: SortKey): 'ascending' | 'descending' | undefined {
  const criterion = sortCriteria.find((c) => c.column === column);
  if (!criterion) return undefined;
  return criterion.direction === 'asc' ? 'ascending' : 'descending';
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
          {COLUMNS.map((col) => (
            <th
              key={col.key}
              onClick={(e) => handleHeaderClick(col.key, e)}
              aria-sort={getAriaSort(sortCriteria, col.key)}
            >
              <span className="gs-th-content">
                <SortIndicator sortCriteria={sortCriteria} column={col.key} />
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
          ))}
          {/* Star column header */}
          <th
            style={{ width: 36, cursor: 'pointer', paddingLeft: 13 }}
            aria-label="Star"
            onClick={(e) => handleHeaderClick('star', e)}
            aria-sort={getAriaSort(sortCriteria, 'star')}
          >
            <span className="gs-th-content">
              <SortIndicator sortCriteria={sortCriteria} column="star" />
              ★
            </span>
          </th>
          <th />
        </tr>
      </thead>
    </>
  );
}
