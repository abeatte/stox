import { useQuery } from '@tanstack/react-query';
import { stockDataAdapter } from '../services/stockDataAdapter';
import { useLiveMode } from './useLiveMode';
import type { RawStockData } from '../types';

/**
 * TanStack Query wrapper that fetches stock data for a single ticker.
 * - Retries with exponential backoff (2s, 4s, 8s) to handle 429s
 * - Refetches every 5 minutes (stale data is fine for this use case)
 * - staleTime prevents unnecessary refetches when components remount
 * - When live mode is off, fetches cache-only data and disables auto-refresh
 */
export function useStockData(ticker: string): {
  data: RawStockData | null;
  isLoading: boolean;
  isError: boolean;
} {
  const { isLive } = useLiveMode();

  const { data, isLoading, isError } = useQuery<RawStockData>({
    queryKey: ['stock', ticker, isLive ? 'live' : 'cached'],
    queryFn: ({ signal }) => stockDataAdapter.fetchStock(ticker, signal, !isLive),
    enabled: ticker.trim().length > 0,
    staleTime: 5 * 60 * 1000,
    refetchInterval: isLive ? 5 * 60 * 1000 : false,
    retry: isLive ? 3 : 1,
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 30000),
  });

  return {
    data: data ?? null,
    isLoading,
    isError,
  };
}
