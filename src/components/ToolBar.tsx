import { useState, type FormEvent } from 'react';

export interface ToolBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddTicker: (symbol: string) => string | null; // returns validation error or null
  onExport: () => void;
  hasData: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
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
    }
    // Clear input unless nothing was added (empty or all duplicates with no new adds)
    if (!result || result.startsWith('Added')) {
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Add ticker">
      <input
        type="text"
        placeholder="AAPL, MSFT, GOOG"
        aria-label="Ticker symbols, comma separated"
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
  onRefresh,
  isRefreshing,
}: ToolBarProps) {
  return (
    <div role="toolbar" aria-label="Toolbar" className="gs-toolbar">
      <SearchInput value={searchQuery} onChange={onSearchChange} />
      <AddTickerForm onAddTicker={onAddTicker} />
      <ExportButton onExport={onExport} hasData={hasData} />
      <div style={{ marginLeft: 'auto' }}>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing || !hasData}
          aria-label="Refresh prices"
          title="Refresh current prices"
          className="gs-btn-refresh"
        >
          {isRefreshing ? <><span style={{ fontSize: '1.6em', verticalAlign: 'middle', position: 'relative', top: '-2px' }}>⟳</span> Refreshing…</> : <><span style={{ fontSize: '1.6em', verticalAlign: 'middle', position: 'relative', top: '-2px' }}>⟳</span> Refresh</>}
        </button>
      </div>
    </div>
  );
}
