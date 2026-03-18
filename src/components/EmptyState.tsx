import { useState, type FormEvent } from 'react';

interface EmptyStateProps {
  onAddTicker: (symbol: string) => string | null;
}

/**
 * Displayed when no tickers are configured.
 * Includes an add-ticker form so users can get started.
 */
export function EmptyState({ onAddTicker }: EmptyStateProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = onAddTicker(input);
    if (result) {
      setError(result);
    } else {
      setError(null);
      setInput('');
    }
  };

  return (
    <div role="status" aria-label="Empty state">
      <p>No tickers configured. Add a ticker to get started.</p>
      <form onSubmit={handleSubmit} aria-label="Add ticker">
        <input
          type="text"
          placeholder="Ticker symbol"
          aria-label="Ticker symbol"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (error) setError(null);
          }}
        />
        <button type="submit">Add</button>
        {error && (
          <span role="alert" style={{ color: 'red', marginLeft: 8 }}>
            {error}
          </span>
        )}
      </form>
    </div>
  );
}
