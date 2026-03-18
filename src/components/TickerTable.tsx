import { useCallback, useMemo, useRef } from 'react';
import { useTickerList } from '../hooks/useTickerList';
import { useInterestMap } from '../hooks/useInterestMap';
import { useStockData } from '../hooks/useStockData';
import { useTableState } from '../hooks/useTableState';
import { useColumnResize } from '../hooks/useColumnResize';
import { computeStockRow } from '../utils/computeStockRow';
import { generateCsv, buildExportFilename, downloadCsv } from '../utils/csvExporter';
import { ToolBar } from './ToolBar';
import { TableHeader } from './TableHeader';
import { StockRow } from './StockRow';
import type { StockRowData } from '../types';

/**
 * Helper component that calls useStockData for a single ticker,
 * computes the StockRowData, and renders a StockRow.
 * This avoids calling hooks inside a loop.
 */
function StockRowWithData({
  ticker,
  interest,
  onInterestChange,
  onRemove,
  onData,
}: {
  ticker: string;
  interest: string;
  onInterestChange: (ticker: string, value: string) => void;
  onRemove: (ticker: string) => void;
  onData: (ticker: string, row: StockRowData | null) => void;
}) {
  const { data, isLoading, isError } = useStockData(ticker);

  const computed = useMemo(() => {
    if (!data) return null;
    return computeStockRow(data, interest);
  }, [data, interest]);

  // Report computed data up to parent for sorting/export.
  // Safe to call during render since onData writes to a mutable ref.
  onData(ticker, computed);

  return (
    <StockRow
      ticker={ticker}
      data={computed}
      isLoading={isLoading}
      isError={isError}
      interest={interest}
      onInterestChange={onInterestChange}
      onRemove={onRemove}
    />
  );
}

/**
 * Main TickerTable component.
 * Composes ToolBar, TableHeader, and StockRow[] in a horizontally scrollable table.
 * Wires useTickerList, useInterestMap, useStockData (via StockRowWithData), and useTableState.
 */
export function TickerTable() {
  const [tickers, addTicker, removeTicker] = useTickerList();
  const [interestMap, setInterest] = useInterestMap();
  const {
    searchQuery,
    onSearchChange,
    sortColumn,
    sortDirection,
    onSort,
    filterTickers,
    sortRows,
  } = useTableState();

  const { widths, onResizeStart, isResizingRef } = useColumnResize();

  // Collect computed row data from child components for sorting and export.
  // Using a ref so mutations don't trigger re-renders.
  const rowDataMapRef = useRef(new Map<string, StockRowData | null>());
  const rowDataMap = rowDataMapRef.current;

  const handleRowData = useCallback(
    (ticker: string, row: StockRowData | null) => {
      rowDataMap.set(ticker, row);
    },
    [rowDataMap],
  );

  // Apply search filter
  const filteredTickers = useMemo(
    () => filterTickers(tickers, searchQuery),
    [tickers, searchQuery, filterTickers],
  );

  // Build sorted ticker order using collected row data
  const sortedTickers = useMemo(() => {
    if (!sortColumn) return filteredTickers;

    const rows = filteredTickers
      .map((t) => rowDataMap.get(t))
      .filter((r): r is StockRowData => r !== null && r !== undefined);

    const sorted = sortRows(rows, sortColumn, sortDirection);
    return sorted.map((r) => r.ticker);
  }, [filteredTickers, sortColumn, sortDirection, sortRows, rowDataMap]);

  // Export handler
  const handleExport = useCallback(() => {
    const rows = tickers
      .map((t) => rowDataMap.get(t))
      .filter((r): r is StockRowData => r !== null && r !== undefined);

    if (rows.length === 0) return;

    const csv = generateCsv(rows);
    const filename = buildExportFilename();
    downloadCsv(csv, filename);
  }, [tickers, rowDataMap]);

  const hasData = tickers.some((t) => rowDataMap.get(t) != null);

  return (
    <div>
      <ToolBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onAddTicker={addTicker}
        onExport={handleExport}
        hasData={hasData}
      />
      <div className="gs-table-wrap">
        <table className="gs-table" role="table" aria-label="Ticker table">
          <TableHeader
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
            columnWidths={widths}
            onResizeStart={onResizeStart}
            isResizingRef={isResizingRef}
          />
          <tbody>
            {sortedTickers.map((ticker) => (
              <StockRowWithData
                key={ticker}
                ticker={ticker}
                interest={interestMap[ticker] ?? ''}
                onInterestChange={setInterest}
                onRemove={removeTicker}
                onData={handleRowData}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
