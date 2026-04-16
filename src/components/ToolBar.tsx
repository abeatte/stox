import { AddTickerForm } from './AddTickerForm';
import ServerStatus from './ServerStatus';

export interface ToolBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddTicker: (symbol: string) => string | null;
  onExport: () => void;
  hasData: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  onHelpOpen: () => void;
  onAddStarred: () => void;
  hasStarred: boolean;
  isLive: boolean;
  onToggleLive: (live: boolean) => void;
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
  onAddStarred,
  hasStarred,
  isLive,
  onToggleLive,
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
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
        <ServerStatus />
        <label className="gs-rocker-label" title={isLive ? 'Live data — click to use cached data' : 'Cached data — click to go live'}>
          <span className="gs-rocker-text">{isLive ? 'Live' : 'Cached'}</span>
          <span
            role="switch"
            aria-checked={isLive}
            aria-label="Toggle live data"
            tabIndex={0}
            className={`gs-rocker ${isLive ? 'gs-rocker-on' : 'gs-rocker-off'}`}
            onClick={() => onToggleLive(!isLive)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleLive(!isLive); } }}
          >
            <span className="gs-rocker-thumb" />
          </span>
        </label>
        <button
          type="button"
          onClick={onAddStarred}
          disabled={!hasStarred}
          aria-label="Add starred tickers"
          title="Add all starred tickers to the list"
          className="gs-btn-add-starred"
        >
          ★ Add Starred
        </button>
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
