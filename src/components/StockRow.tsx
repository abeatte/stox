import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { COLUMNS } from '../columns';
import { StockRowData, ColumnKey } from '../types';
import { formatValue, formatCurrency } from '../utils/formatters';

/**
 * Returns a CSS highlight class for specific cells based on value thresholds.
 */
function getCellHighlight(key: ColumnKey, value: unknown): string | undefined {
  if (key === 'dividendPercent' || key === 'divYield') {
    if (value === null || value === undefined || value === 0) return 'gs-cell-yellow';
  }

  if (key === 'eps') {
    const n = value as number | null;
    if (n === null || n === undefined) return undefined;
    if (n < 0) return 'gs-cell-red';
  }

  if (key === 'pBook' || key === 'pTangbook') {
    const n = value as number | null;
    if (n === null || n === undefined) return undefined;
    if (n >= 0.15 && n <= 0.85) return 'gs-cell-green';
    if (n > 0.85 && n <= 1.15) return 'gs-cell-yellow';
    if (n < 0.15 || n > 1.15) return 'gs-cell-red';
  }

  if (key === 'priceEarnings') {
    const n = value as number | null;
    if (n === null || n === undefined) return undefined;
    if (n >= 0 && n <= 15) return 'gs-cell-green';
    if (n > 15 && n <= 20) return 'gs-cell-yellow';
    if (n > 20 || n < 0) return 'gs-cell-red';
  }

  return undefined;
}

export interface StockRowProps {
  ticker: string;
  data: StockRowData | null;
  isLoading: boolean;
  isError: boolean;
  onRemove: (ticker: string) => void;
}

const NUMERIC_TYPES = new Set(['currency', 'percent', 'ratio', 'large-number']);

/**
 * Renders a single stock row in the ticker table.
 * Shows loading/error states when appropriate, otherwise renders
 * formatted values for each column using the COLUMNS definition.
 */
export function StockRow({
  ticker,
  data,
  isLoading,
  isError,
  onRemove,
}: StockRowProps) {
  const [popover, setPopover] = useState<{ x: number; y: number } | null>(null);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLTableCellElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover({ x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setPopover(null);
  }, []);

  const totalColumns = COLUMNS.length + 1; // +1 for the remove button column

  if (isLoading && !data) {
    return (
      <tr>
        <td>{ticker}</td>
        <td colSpan={totalColumns - 2} className="gs-cell-loading">
          Loading…
        </td>
        <td>
          <button
            onClick={() => onRemove(ticker)}
            aria-label={`Remove ${ticker}`}
            type="button"
            className="gs-remove-btn"
          >
            ✕
          </button>
        </td>
      </tr>
    );
  }

  if (isError && !data) {
    return (
      <tr>
        <td>{ticker}</td>
        <td colSpan={totalColumns - 2} className="gs-cell-error">
          Error loading data
        </td>
        <td>
          <button
            onClick={() => onRemove(ticker)}
            aria-label={`Remove ${ticker}`}
            type="button"
            className="gs-remove-btn"
          >
            ✕
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      {COLUMNS.map((col) => {
        const value = data ? data[col.key] : null;

        if (col.key === 'ticker') {
          return (
            <td key={col.key}>
              <a
                href={`https://finance.yahoo.com/quote/${ticker}`}
                target="_blank"
                rel="noopener noreferrer"
                className="gs-ticker-link"
              >
                {ticker}
              </a>
            </td>
          );
        }

        const isNumeric = NUMERIC_TYPES.has(col.type);
        const highlight = data ? getCellHighlight(col.key, value) : undefined;
        const className = [isNumeric ? 'gs-cell-number' : '', highlight ?? ''].filter(Boolean).join(' ') || undefined;

        if (col.key === 'eps' && data) {
          const eps15x = data.eps15x;
          const eps20x = data.eps20x;
          return (
            <td
              key={col.key}
              className={className}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {formatValue(value, col.type)}
              {popover && createPortal(
                <div
                  className="gs-eps-popover"
                  role="tooltip"
                  style={{ left: popover.x, top: popover.y }}
                >
                  <div>15x EPS: {eps15x != null ? formatCurrency(eps15x) : 'N/A'}</div>
                  <div>20x EPS: {eps20x != null ? formatCurrency(eps20x) : 'N/A'}</div>
                </div>,
                document.body,
              )}
            </td>
          );
        }

        return (
          <td key={col.key} className={className}>
            {formatValue(value, col.type)}
          </td>
        );
      })}
      <td>
        <button
          onClick={() => onRemove(ticker)}
          aria-label={`Remove ${ticker}`}
          type="button"
          className="gs-remove-btn"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}
