import { AddTickerForm } from './AddTickerForm';
import ServerStatus from './ServerStatus';

interface EmptyStateProps {
  onAddTicker: (symbol: string) => string | null;
  onHelpOpen: () => void;
}

/**
 * Displayed when no tickers are configured.
 * Includes an add-ticker form so users can get started.
 */
export function EmptyState({ onAddTicker, onHelpOpen }: EmptyStateProps) {
  return (
    <div role="status" aria-label="Empty state" className="gs-empty">
      <ServerStatus />
      <p>No tickers configured. Add a ticker to get started.</p>
      <AddTickerForm
        onAddTicker={onAddTicker}
        placeholder="Ticker symbol"
        inputLabel="Ticker symbol"
      />
      <button
        type="button"
        className="gs-help-btn"
        onClick={onHelpOpen}
        aria-label="Help"
        title="Help & Tips"
      >
        ?
      </button>
    </div>
  );
}
