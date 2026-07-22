import { useRef, useState, type ChangeEvent } from 'react';
import { AddTickerForm } from './AddTickerForm';
import ServerStatus from './ServerStatus';
import { parseTickersFromCsv } from '../utils/csvImporter';

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

/**
 * Import tickers from a CSV file. Accepts a Stox export (with a "Ticker"
 * header) or a plain list, and adds the parsed symbols via onAddTicker
 * (which handles validation and de-duplication).
 */
function ImportButton({
  onAddTicker,
}: {
  onAddTicker: (symbol: string) => string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const readText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error ?? new Error('read failed'));
      reader.readAsText(file);
    });

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so the same file can be re-imported
    if (!file) return;
    try {
      const tickers = parseTickersFromCsv(await readText(file));
      if (tickers.length === 0) {
        setStatus('No valid tickers found in file.');
        return;
      }
      const result = onAddTicker(tickers.join(','));
      setStatus(result ?? `Imported ${tickers.length} ticker${tickers.length === 1 ? '' : 's'}.`);
    } catch {
      setStatus('Could not read file.');
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        aria-label="Import tickers from CSV"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Import CSV"
        title="Import tickers from a CSV file (Stox export or a plain list)"
      >
        Import CSV
      </button>
      {status && (
        <span role="status" aria-live="polite" className="gs-import-status" style={{ marginLeft: 8 }}>
          {status}
        </span>
      )}
    </>
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
      <ImportButton onAddTicker={onAddTicker} />
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
