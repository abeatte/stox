import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { COLUMNS } from '../columns';
import { StockRowData, ColumnKey } from '../types';
import { formatValue, formatCurrency } from '../utils/formatters';

/** Value type for cells that can be highlighted. */
type CellValue = string | number | null;

/**
 * Returns a CSS highlight class for specific cells based on value thresholds.
 */
export function getCellHighlight(key: ColumnKey, value: CellValue): string | undefined {
  if (key === 'dividendPercent' || key === 'divYield') {
    if (value === null || value === 0) return 'gs-cell-yellow';
  }

  if (key === 'eps') {
    if (typeof value !== 'number') return undefined;
    if (value < 0) return 'gs-cell-red';
  }

  if (key === 'pBook' || key === 'pTangbook') {
    if (typeof value !== 'number') return undefined;
    if (value >= 0.15 && value <= 0.85) return 'gs-cell-green';
    if (value > 0.85 && value <= 1.15) return 'gs-cell-yellow';
    if (value < 0.15 || value > 1.15) return 'gs-cell-red';
  }

  if (key === 'priceEarnings') {
    if (typeof value !== 'number') return undefined;
    if (value >= 0 && value <= 15) return 'gs-cell-green';
    if (value > 15 && value <= 20) return 'gs-cell-yellow';
    if (value > 20 || value < 0) return 'gs-cell-red';
  }

  return undefined;
}

export interface StockRowProps {
  ticker: string;
  data: StockRowData | null;
  isLoading: boolean;
  isError: boolean;
  onRemove: (ticker: string) => void;
  relatedTickers?: string[];
  allTickers: string[];
  onAddTicker: (ticker: string) => void;
  isStarred: boolean;
  onToggleStar: (ticker: string) => void;
}

const NUMERIC_TYPES = new Set(['currency', 'percent', 'ratio', 'large-number']);

/** Reusable star + remove action cells rendered at the end of every row. */
function RowActions({
  ticker,
  isStarred,
  onToggleStar,
  onRemove,
}: {
  ticker: string;
  isStarred: boolean;
  onToggleStar: (ticker: string) => void;
  onRemove: (ticker: string) => void;
}) {
  return (
    <>
      <td>
        <button
          onClick={() => onToggleStar(ticker)}
          aria-label={isStarred ? `Unstar ${ticker}` : `Star ${ticker}`}
          type="button"
          className="gs-star-btn"
        >
          {isStarred ? '★' : '☆'}
        </button>
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
    </>
  );
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
  onRemove,
  relatedTickers,
  allTickers,
  onAddTicker,
  isStarred,
  onToggleStar,
}: StockRowProps) {
  const [epsPopover, setEpsPopover] = useState<{ x: number; y: number } | null>(null);
  const [tickerPopover, setTickerPopover] = useState<{ x: number; y: number } | null>(null);

  const handleEpsMouseEnter = useCallback((e: React.MouseEvent<HTMLTableCellElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setEpsPopover({ x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const handleEpsMouseLeave = useCallback(() => {
    setEpsPopover(null);
  }, []);

  const hasRelated = relatedTickers && relatedTickers.length > 0;

  const handleTickerMouseEnter = useCallback((e: React.MouseEvent<HTMLTableCellElement>) => {
    if (!hasRelated) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTickerPopover({ x: rect.left + rect.width / 2, y: rect.bottom });
  }, [hasRelated]);

  const handleTickerMouseLeave = useCallback(() => {
    setTickerPopover(null);
  }, []);

  const totalColumns = COLUMNS.length + 1; // +1 for the remove button column
  const actions = (
    <RowActions
      ticker={ticker}
      isStarred={isStarred}
      onToggleStar={onToggleStar}
      onRemove={onRemove}
    />
  );

  // Loading / error placeholder rows share the same shell
  if ((isLoading || isError) && !data) {
    return (
      <tr>
        <td>{ticker}</td>
        <td
          colSpan={totalColumns - 2}
          className={isLoading ? 'gs-cell-loading' : 'gs-cell-error'}
        >
          {isLoading ? 'Loading…' : 'Error loading data'}
        </td>
        {actions}
      </tr>
    );
  }

  return (
    <tr>
      {COLUMNS.map((col) => {
        const value = data ? data[col.key] : null;

        if (col.key === 'ticker') {
          const allTickersUpper = allTickers.map((t) => t.toUpperCase());
          return (
            <td
              key={col.key}
              onMouseEnter={handleTickerMouseEnter}
              onMouseLeave={handleTickerMouseLeave}
            >
              <a
                href={`https://finance.yahoo.com/quote/${ticker}`}
                target="_blank"
                rel="noopener noreferrer"
                className="gs-ticker-link"
              >
                {ticker}
              </a>
              {tickerPopover && hasRelated && createPortal(
                <div
                  className="gs-related-popover"
                  role="tooltip"
                  style={{ left: tickerPopover.x, top: tickerPopover.y }}
                >
                  <div className="gs-related-popover-title">Related Tickers</div>
                  {relatedTickers.map((rt) => {
                    const inList = allTickersUpper.includes(rt.toUpperCase());
                    return (
                      <div key={rt} className="gs-related-popover-row">
                        <span>{rt}</span>
                        {!inList && (
                          <button
                            className="gs-related-add-btn"
                            aria-label={`Add ${rt}`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              onAddTicker(rt);
                            }}
                            type="button"
                          >
                            +
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>,
                document.body,
              )}
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
              onMouseEnter={handleEpsMouseEnter}
              onMouseLeave={handleEpsMouseLeave}
            >
              {formatValue(value, col.type)}
              {epsPopover && createPortal(
                <div
                  className="gs-eps-popover"
                  role="tooltip"
                  style={{ left: epsPopover.x, top: epsPopover.y }}
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
      {actions}
    </tr>
  );
}
