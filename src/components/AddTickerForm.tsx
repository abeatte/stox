import { useState, type FormEvent } from 'react';

export interface AddTickerFormProps {
  onAddTicker: (symbol: string) => string | null;
  /** Placeholder text for the input field. */
  placeholder?: string;
  /** Accessible label for the input field. */
  inputLabel?: string;
  disabled?: boolean;
}

/**
 * Reusable add-ticker form with validation error display.
 * Used by both EmptyState and ToolBar.
 */
export function AddTickerForm({
  onAddTicker,
  placeholder = 'AAPL, MSFT, GOOG',
  inputLabel = 'Ticker symbols, comma separated',
  disabled = false,
}: AddTickerFormProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = onAddTicker(input);
    if (result) {
      setError(result);
    } else {
      setError(null);
    }
    // Clear input unless nothing was added (empty or all duplicates with no new adds)
    if (!result || result.startsWith('Added')) {
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Add ticker">
      <input
        name='ticker'
        type="text"
        placeholder={placeholder}
        aria-label={inputLabel}
        value={input}
        disabled={disabled}
        onChange={(e) => {
          setInput(e.target.value);
          if (error) setError(null);
        }}
      />
      <button type="submit" disabled={disabled}>Add</button>
      {error && (
        <span role="alert" style={{ color: 'red', marginLeft: 8 }}>
          {error}
        </span>
      )}
    </form>
  );
}
