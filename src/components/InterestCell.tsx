export interface InterestCellProps {
  ticker: string;
  value: string;
  onChange: (ticker: string, value: string) => void;
}

/**
 * Editable inline text input for the Interest column.
 * Renders a text input that calls onChange with the ticker and new value.
 */
export function InterestCell({ ticker, value, onChange }: InterestCellProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(ticker, e.target.value)}
      aria-label={`Interest for ${ticker}`}
      style={{ width: '80px' }}
    />
  );
}
