import { COLUMNS } from '../columns';
import { StockRowData, ColumnKey } from '../types';
import { formatValue } from '../utils/formatters';
import { InterestCell } from './InterestCell';

/**
 * Returns a CSS highlight class for specific cells based on value thresholds.
 */
function getCellHighlight(key: ColumnKey, value: unknown): string | undefined {
  if (key === 'dividendPercent') {
    if (value === null || value === undefined || value === 0) return 'gs-cell-yellow';
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
    if (n > 20) return 'gs-cell-red';
  }

  return undefined;
}

export interface StockRowProps {
  ticker: string;
  data: StockRowData | null;
  isLoading: boolean;
  isError: boolean;
  interest: string;
  onInterestChange: (ticker: string, value: string) => void;
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
  interest,
  onInterestChange,
  onRemove,
}: StockRowProps) {
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
        if (col.key === 'interest') {
          return (
            <td key={col.key}>
              <InterestCell
                ticker={ticker}
                value={interest}
                onChange={onInterestChange}
              />
            </td>
          );
        }

        const value = data ? data[col.key] : null;
        const isNumeric = NUMERIC_TYPES.has(col.type);
        const highlight = data ? getCellHighlight(col.key, value) : undefined;
        const className = [isNumeric ? 'gs-cell-number' : '', highlight ?? ''].filter(Boolean).join(' ') || undefined;
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
