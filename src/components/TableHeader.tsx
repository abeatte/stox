import { COLUMNS } from '../columns';
import { ColumnKey } from '../types';

export interface TableHeaderProps {
  sortColumn: ColumnKey | null;
  sortDirection: 'asc' | 'desc';
  onSort: (col: ColumnKey) => void;
}

/**
 * Renders the 19 column headers from the COLUMNS array.
 * Clicking a header sorts by that column; clicking again toggles direction.
 * The active sort column shows a ▲ (asc) or ▼ (desc) indicator.
 */
export function TableHeader({ sortColumn, sortDirection, onSort }: TableHeaderProps) {
  return (
    <thead>
      <tr>
        {COLUMNS.map((col) => {
          const isActive = sortColumn === col.key;
          return (
            <th
              key={col.key}
              onClick={() => onSort(col.key)}
              style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
              aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
            >
              {col.label}
              {isActive && (
                <span aria-hidden="true" style={{ marginLeft: 4 }}>
                  {sortDirection === 'asc' ? '▲' : '▼'}
                </span>
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
