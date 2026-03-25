import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTickerList } from '../hooks/useTickerList';
import { useStarredTickers } from '../hooks/useStarredTickers';
import { useStockData } from '../hooks/useStockData';
import { useTableState } from '../hooks/useTableState';
import { useColumnResize } from '../hooks/useColumnResize';
import { computeStockRow } from '../utils/computeStockRow';
import { generateCsv, buildExportFilename, downloadCsv } from '../utils/csvExporter';
import { stockDataAdapter } from '../services/stockDataAdapter';
import { ToolBar } from './ToolBar';
import { TableHeader } from './TableHeader';
import { StockRow } from './StockRow';
import type { StockRowData, RawStockData } from '../types';

/**
 * Helper component that calls useStockData for a single ticker,
 * computes the StockRowData, and renders a StockRow.
 * This avoids calling hooks inside a loop.
 */
function StockRowWithData({
  ticker,
  onRemove,
  onData,
  allTickers,
  onAddTicker,
  isStarred,
  onToggleStar,
}: {
  ticker: string;
  onRemove: (ticker: string) => void;
  onData: (ticker: string, row: StockRowData | null) => void;
  allTickers: string[];
  onAddTicker: (ticker: string) => void;
  isStarred: boolean;
  onToggleStar: (ticker: string) => void;
}) {
  const { data, isLoading, isError } = useStockData(ticker);

  const computed = useMemo(() => {
    if (!data) return null;
    return computeStockRow(data);
  }, [data]);

  // Report computed data up to parent for sorting/export.
  // Safe to call during render since onData writes to a mutable ref.
  onData(ticker, computed);

  return (
    <StockRow
      ticker={ticker}
      data={computed}
      isLoading={isLoading}
      isError={isError}
      onRemove={onRemove}
      relatedTickers={data?.relatedTickers}
      allTickers={allTickers}
      onAddTicker={onAddTicker}
      isStarred={isStarred}
      onToggleStar={onToggleStar}
    />
  );
}

/**
 * Main TickerTable component.
 * Composes ToolBar, TableHeader, and StockRow[] in a horizontally scrollable table.
 * Wires useTickerList, useInterestMap, useStockData (via StockRowWithData), and useTableState.
 */
export function TickerTable({ onHelpOpen }: { onHelpOpen: () => void }) {
  const [tickers, addTicker, removeTicker] = useTickerList();
  const [starredTickers, toggleStar] = useStarredTickers();
  const {
    searchQuery,
    onSearchChange,
    sortCriteria,
    onSort,
    filterTickers,
    sortRows,
  } = useTableState();

  const { widths, onResizeStart, onAutoFit, isResizingRef, tableRef } = useColumnResize();

  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Collect computed row data from child components for sorting and export.
  // Using a ref so mutations don't trigger re-renders.
  const rowDataMapRef = useRef(new Map<string, StockRowData | null>());
  const rowDataMap = rowDataMapRef.current;

  const [hasData, setHasData] = useState(false);

  // Reset hasData when all tickers are removed
  useEffect(() => {
    if (tickers.length === 0) {
      rowDataMap.clear();
      setHasData(false);
    }
  }, [tickers.length, rowDataMap]);

  const handleRowData = useCallback(
    (ticker: string, row: StockRowData | null) => {
      rowDataMap.set(ticker, row);
      if (row && !hasData) setHasData(true);
    },
    [rowDataMap, hasData],
  );

  // Apply search filter
  const filteredTickers = useMemo(
    () => filterTickers(tickers, searchQuery),
    [tickers, searchQuery, filterTickers],
  );

  // Build sorted ticker order using collected row data.
  // Tickers still loading / errored are appended at the bottom.
  const sortedTickers = useMemo(() => {
    if (sortCriteria.length === 0) return filteredTickers;

    const withData: StockRowData[] = [];
    const withoutData: string[] = [];

    for (const t of filteredTickers) {
      const row = rowDataMap.get(t);
      if (row) {
        withData.push(row);
      } else {
        withoutData.push(t);
      }
    }

    // Handle star sort by pre-sorting tickers, then applying data-based criteria
    const starCriterion = sortCriteria.find((c) => c.column === 'star');
    const dataCriteria = sortCriteria.filter((c) => c.column !== 'star');

    let sortedWithData: StockRowData[];
    if (dataCriteria.length > 0) {
      sortedWithData = sortRows(withData, dataCriteria);
    } else {
      sortedWithData = withData;
    }

    let result = [...sortedWithData.map((r) => r.ticker), ...withoutData];

    if (starCriterion) {
      const dir = starCriterion.direction === 'asc' ? 1 : -1;
      // Stable sort: starred items float to top (or bottom) while preserving relative order
      result = [...result].sort((a, b) => {
        const aStarred = starredTickers.has(a) ? 1 : 0;
        const bStarred = starredTickers.has(b) ? 1 : 0;
        return (bStarred - aStarred) * dir;
      });
    }

    return result;
  }, [filteredTickers, sortCriteria, sortRows, rowDataMap, starredTickers]);

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

  const abortControllerRef = useRef<AbortController | null>(null);

  // Abort any in-flight refresh when the component unmounts (browser refresh, navigation, etc.)
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    if (tickers.length === 0) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsRefreshing(true);
    try {
      const results = await stockDataAdapter.refreshPrices(tickers, controller.signal);
      for (const { ticker, price, changePercent } of results) {
        queryClient.setQueryData<RawStockData>(['stock', ticker], (old) => {
          if (!old) return old;
          return { ...old, price, changePercent };
        });
      }
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') {
        console.log('Price refresh aborted');
        return;
      }
      console.error('Price refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [tickers, queryClient]);

  return (
    <div>
      <ToolBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onAddTicker={addTicker}
        onExport={handleExport}
        hasData={hasData}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onHelpOpen={onHelpOpen}
      />
      <div className="gs-table-wrap">
        <table className="gs-table" role="table" aria-label="Ticker table" ref={tableRef}>
          <TableHeader
            sortCriteria={sortCriteria}
            onSort={onSort}
            columnWidths={widths}
            onResizeStart={onResizeStart}
            onAutoFit={onAutoFit}
            isResizingRef={isResizingRef}
          />
          <tbody>
            {sortedTickers.map((ticker) => (
              <StockRowWithData
                key={ticker}
                ticker={ticker}
                onRemove={removeTicker}
                onData={handleRowData}
                allTickers={tickers}
                onAddTicker={addTicker}
                isStarred={starredTickers.has(ticker)}
                onToggleStar={toggleStar}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
