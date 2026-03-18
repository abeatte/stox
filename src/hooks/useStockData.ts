import { useQuery } from '@tanstack/react-query';
import { stockDataAdapter } from '../services/stockDataAdapter';
import type { RawStockData } from '../types';

/**
 * TanStack Query wrapper that fetches stock data for a single ticker.
 * Automatically refreshes every 60 seconds.
 */
export function useStockData(ticker: string): {
  data: RawStockData | null;
  isLoading: boolean;
  isError: boolean;
} {
  const { data, isLoading, isError } = useQuery<RawStockData>({
    queryKey: ['stock', ticker],
    queryFn: () => stockDataAdapter.fetchStock(ticker),
    refetchInterval: 60000,
    enabled: ticker.trim().length > 0,
  });

  return {
    data: data ?? null,
    isLoading,
    isError,
  };
}
