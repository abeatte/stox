import { createPortal } from 'react-dom';
import { COLUMNS } from '../columns';
import type { StockRowData } from '../types';
import { formatValue, formatCurrency } from '../utils/formatters';
import { getCellHighlight } from '../utils/cellHighlight';
import { usePopover } from '../hooks/usePopover';

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
  const { position: epsPopover, onMouseEnter: handleEpsMouseEnter, onMouseLeave: handleEpsMouseLeave } = usePopover('top');
  const { position: tickerPopover, onMouseEnter: handleTickerMouseEnter, onMouseLeave: handleTickerMouseLeave } = usePopover('bottom');

  const hasRelated = relatedTickers && relatedTickers.length > 0;

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
          const visibleRelated = (relatedTickers ?? []).slice(0, 10);
          return (
            <td
              key={col.key}
              onMouseEnter={hasRelated ? handleTickerMouseEnter : undefined}
              onMouseLeave={hasRelated ? handleTickerMouseLeave : undefined}
            >
              <a
                href={`https://finance.yahoo.com/quote/${ticker}`}
                target="_blank"
                rel="noopener noreferrer"
                className="gs-ticker-link"
              >
                {ticker}
              </a>
              {tickerPopover && hasRelated && (() => {
                // Estimate popover height: title (~20px) + rows (~26px each) + padding (~16px)
                const estimatedHeight = 20 + visibleRelated.length * 26 + 16;
                const fitsBelow = tickerPopover.y + estimatedHeight <= window.innerHeight;
                const top = fitsBelow ? tickerPopover.y : tickerPopover.triggerTop;
                const flipClass = fitsBelow ? '' : ' gs-related-popover-above';

                return createPortal(
                <div
                  className={`gs-related-popover${flipClass}`}
                  role="tooltip"
                  style={{ left: tickerPopover.x, top }}
                >
                  <div className="gs-related-popover-title">Related Tickers</div>
                  {visibleRelated.map((rt) => {
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
                  {relatedTickers.length > visibleRelated.length && (
                    <div className="gs-related-popover-row" style={{ justifyContent: 'center', color: '#9aa0a6' }}>…</div>
                  )}
                </div>,
                document.body,
              );
              })()}
            </td>
          );
        }

        const isNumeric = col.type !== 'text';
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
