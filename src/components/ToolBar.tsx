import { useState, type FormEvent } from 'react';

export interface ToolBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddTicker: (symbol: string) => string | null; // returns validation error or null
  onExport: () => void;
  hasData: boolean;
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (q: string) => void;
}) {
  return (
    <input
      type="text"
      placeholder="Search tickers…"
      aria-label="Search tickers"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function AddTickerForm({
  onAddTicker,
}: {
  onAddTicker: (symbol: string) => string | null;
}) {
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
  );
}

function ExportButton({
  onExport,
  hasData,
}: {
  onExport: () => void;
  hasData: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onExport}
      disabled={!hasData}
      title={!hasData ? 'No data to export.' : undefined}
      aria-label="Export CSV"
    >
      Export CSV
    </button>
  );
}

export function ToolBar({
  searchQuery,
  onSearchChange,
  onAddTicker,
  onExport,
  hasData,
}: ToolBarProps) {
  return (
    <div role="toolbar" aria-label="Toolbar">
      <SearchInput value={searchQuery} onChange={onSearchChange} />
      <AddTickerForm onAddTicker={onAddTicker} />
      <ExportButton onExport={onExport} hasData={hasData} />
    </div>
  );
}
