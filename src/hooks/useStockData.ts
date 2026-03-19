import { useQuery } from '@tanstack/react-query';
import { stockDataAdapter } from '../services/stockDataAdapter';
import type { RawStockData } from '../types';

/**
 * TanStack Query wrapper that fetches stock data for a single ticker.
 * - Retries with exponential backoff (2s, 4s, 8s) to handle 429s
 * - Refetches every 5 minutes (stale data is fine for this use case)
 * - staleTime prevents unnecessary refetches when components remount
 */
export function useStockData(ticker: string): {
  data: RawStockData | null;
  isLoading: boolean;
  isError: boolean;
} {
  const { data, isLoading, isError } = useQuery<RawStockData>({
    queryKey: ['stock', ticker],
    queryFn: ({ signal }) => stockDataAdapter.fetchStock(ticker, signal),
    enabled: ticker.trim().length > 0,
    staleTime: 5 * 60 * 1000,        // 5 min — don't refetch on remount
    refetchInterval: 5 * 60 * 1000,   // 5 min between auto-refreshes
    retry: 3,
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 30000),
  });

  return {
    data: data ?? null,
    isLoading,
    isError,
  };
}
