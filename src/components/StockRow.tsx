import { COLUMNS } from '../columns';
import { StockRowData } from '../types';
import { formatValue } from '../utils/formatters';
import { InterestCell } from './InterestCell';

export interface StockRowProps {
  ticker: string;
  data: StockRowData | null;
  isLoading: boolean;
  isError: boolean;
  interest: string;
  onInterestChange: (ticker: string, value: string) => void;
  onRemove: (ticker: string) => void;
}

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
        <td colSpan={totalColumns - 1} style={{ textAlign: 'center' }}>
          Loading…
        </td>
      </tr>
    );
  }

  if (isError && !data) {
    return (
      <tr>
        <td>{ticker}</td>
        <td colSpan={totalColumns - 1} style={{ textAlign: 'center', color: 'red' }}>
          Error loading data
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
        return (
          <td key={col.key}>
            {formatValue(value, col.type)}
          </td>
        );
      })}
      <td>
        <button
          onClick={() => onRemove(ticker)}
          aria-label={`Remove ${ticker}`}
          type="button"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}
