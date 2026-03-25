import { AddTickerForm } from './AddTickerForm';

export interface ToolBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddTicker: (symbol: string) => string | null;
  onExport: () => void;
  hasData: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  onHelpOpen: () => void;
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
  onHelpOpen,
}: ToolBarProps) {
  return (
    <div role="toolbar" aria-label="Toolbar" className="gs-toolbar">
      <SearchInput value={searchQuery} onChange={onSearchChange} />
      <AddTickerForm onAddTicker={onAddTicker} />
      <ExportButton onExport={onExport} hasData={hasData} />
      <button
        type="button"
        className="gs-help-btn"
        onClick={onHelpOpen}
        aria-label="Help"
        title="Help & Tips"
      >
        ?
      </button>
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
