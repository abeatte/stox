import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useStockData } from './useStockData';
import type { RawStockData } from '../types';

const mockFetchStock = vi.fn<(ticker: string, signal?: AbortSignal) => Promise<RawStockData>>();

vi.mock('../services/stockDataAdapter', () => ({
  stockDataAdapter: {
    fetchStock: (...args: unknown[]) => mockFetchStock(args[0] as string, args[1] as AbortSignal),
  },
}));

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockData: RawStockData = {
  ticker: 'AAPL',
  price: 185.5,
  changePercent: 1.25,
  date: '2025-03-18',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  divYield: 0.52,
  eps: 6.42,
  totalAssets: 352583000000,
  goodwillNet: 0,
  intangiblesNet: 0,
  liabilitiesTotal: 290437000000,
  sharesOutstanding: 15460000000,
  dividendPercent: 0.96,
};

describe('useStockData', () => {
  beforeEach(() => {
    mockFetchStock.mockReset();
  });

  it('returns loading state initially', () => {
    mockFetchStock.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useStockData('AAPL'), { wrapper: makeWrapper() });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('returns data after successful fetch', async () => {
    mockFetchStock.mockResolvedValue(mockData);
    const { result } = renderHook(() => useStockData('AAPL'), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });
    expect(result.current.data!.ticker).toBe('AAPL');
    expect(result.current.data!.price).toBe(185.5);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('returns error state on fetch failure', async () => {
    mockFetchStock.mockRejectedValue(new Error('Network error'));

    // The hook has retry: 3 with exponential backoff.
    // Use a QueryClient that disables retries at the client level,
    // but useStockData overrides retry in its own options.
    // Instead, we create a wrapper that forces retry: false at the query level.
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    // Override the default to ensure no retries
    queryClient.setDefaultOptions({
      queries: { retry: false },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useStockData('AAPL'), { wrapper });

    // The hook specifies retry: 3, which overrides the client default.
    // We need to wait long enough for all retries to exhaust.
    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 30000 },
    );
    expect(result.current.data).toBeNull();
  }, 35000);

  it('does not fetch when ticker is empty', () => {
    const { result } = renderHook(() => useStockData(''), { wrapper: makeWrapper() });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(mockFetchStock).not.toHaveBeenCalled();
  });

  it('does not fetch when ticker is whitespace only', () => {
    const { result } = renderHook(() => useStockData('   '), { wrapper: makeWrapper() });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(mockFetchStock).not.toHaveBeenCalled();
  });
});
