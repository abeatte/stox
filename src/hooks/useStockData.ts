import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeStockData } from '../services/stockDataAdapter';
import type { RawStockData } from '../types';

export interface StockProgress {
  stage: number;
  totalStages: number;
  stageLabel: string;
}

export interface StockDataState {
  data: RawStockData | null;
  isLoading: boolean;
  isError: boolean;
  progress: StockProgress | null;
  refetch: () => void;
}

/**
 * Fetches stock data via a single SSE stream that delivers both progress
 * updates and the final data payload. This eliminates the race condition
 * between a separate fetch and a separate SSE progress connection.
 *
 * Stream event shapes from the server:
 *   { type: 'progress', stage, totalStages, stageLabel }
 *   { type: 'data', payload: <stock object> }
 *   { type: 'error', message }
 */
export function useStockData(ticker: string): StockDataState {
  const [state, setState] = useState<Omit<StockDataState, 'refetch'>>({
    data: null,
    isLoading: false,
    isError: false,
    progress: null,
  });
  const [fetchCount, setFetchCount] = useState(0);

  const refetch = useCallback(() => setFetchCount((n) => n + 1), []);

  // Keep a ref to the current ticker so the effect cleanup can check if it's stale
  const tickerRef = useRef(ticker);
  tickerRef.current = ticker;

  useEffect(() => {
    if (!ticker.trim()) return;

    const symbol = ticker.toUpperCase().trim();
    const url = `http://localhost:3001/api/stock/${encodeURIComponent(symbol)}/stream`;

    setState({ data: null, isLoading: true, isError: false, progress: null });

    if (typeof EventSource === 'undefined') {
      // SSE not available (e.g. test environment) — fall back to plain fetch
      fetch(`http://localhost:3001/api/stock/${encodeURIComponent(symbol)}`)
        .then((r) => r.json())
        .then((raw) => {
          if (tickerRef.current !== ticker) return;
          setState({ data: normalizeStockData(raw as Record<string, unknown>, symbol), isLoading: false, isError: false, progress: null });
        })
        .catch(() => {
          if (tickerRef.current !== ticker) return;
          setState({ data: null, isLoading: false, isError: true, progress: null });
        });
      return;
    }

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as
          | { type: 'progress'; stage: number; totalStages: number; stageLabel: string }
          | { type: 'data'; payload: Record<string, unknown> }
          | { type: 'error'; message: string };

        if (msg.type === 'progress') {
          setState((prev) => ({
            ...prev,
            progress: { stage: msg.stage, totalStages: msg.totalStages, stageLabel: msg.stageLabel },
          }));
        } else if (msg.type === 'data') {
          eventSource.close();
          setState({
            data: normalizeStockData(msg.payload, symbol),
            isLoading: false,
            isError: false,
            progress: null,
          });
        } else if (msg.type === 'error') {
          eventSource.close();
          setState({ data: null, isLoading: false, isError: true, progress: null });
        }
      } catch {
        // ignore malformed messages
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setState({ data: null, isLoading: false, isError: true, progress: null });
    };

    return () => {
      eventSource.close();
    };
  // fetchCount in deps so refetch() re-runs the effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, fetchCount]);

  return { ...state, refetch };
}
