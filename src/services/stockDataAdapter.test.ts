import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YahooFinanceAdapter, toNum, normalizeStockData } from './stockDataAdapter';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeApiResponse(overrides: Record<string, unknown> = {}) {
  return {
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
    relatedTickers: ['MSFT', 'GOOG'],
    ...overrides,
  };
}

describe('YahooFinanceAdapter', () => {
  let adapter: YahooFinanceAdapter;

  beforeEach(() => {
    adapter = new YahooFinanceAdapter();
    mockFetch.mockReset();
  });

  describe('fetchStock', () => {
    it('fetches and normalizes stock data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => makeApiResponse(),
      });

      const result = await adapter.fetchStock('aapl');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/stock/AAPL',
        expect.objectContaining({}),
      );
      expect(result.ticker).toBe('AAPL');
      expect(result.price).toBe(185.5);
      expect(result.relatedTickers).toEqual(['MSFT', 'GOOG']);
    });

    it('uppercases and trims the ticker', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => makeApiResponse(),
      });

      await adapter.fetchStock('  msft  ');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/stock/MSFT',
        expect.anything(),
      );
    });

    it('converts non-numeric values to null via toNum', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => makeApiResponse({ price: 'N/A', eps: undefined }),
      });

      const result = await adapter.fetchStock('AAPL');
      expect(result.price).toBeNull();
      expect(result.eps).toBeNull();
    });

    it('handles missing relatedTickers gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => makeApiResponse({ relatedTickers: undefined }),
      });

      const result = await adapter.fetchStock('AAPL');
      expect(result.relatedTickers).toEqual([]);
    });

    it('throws on non-ok response with error body', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Ticker not found' }),
      });

      await expect(adapter.fetchStock('FAKE')).rejects.toThrow('Ticker not found');
    });

    it('throws on non-ok response without error body', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => { throw new Error('parse error'); },
      });

      await expect(adapter.fetchStock('AAPL')).rejects.toThrow('Failed to fetch data for AAPL: 500');
    });

    it('passes abort signal to fetch', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => makeApiResponse(),
      });

      const controller = new AbortController();
      await adapter.fetchStock('AAPL', controller.signal);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('refreshStocks', () => {
    it('posts tickers and returns normalized results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            makeApiResponse({ ticker: 'AAPL' }),
            makeApiResponse({ ticker: 'MSFT', price: 420 }),
          ],
        }),
      });

      const results = await adapter.refreshStocks(['AAPL', 'MSFT']);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/refresh-stocks',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers: ['AAPL', 'MSFT'] }),
        }),
      );
      expect(results).toHaveLength(2);
      expect(results[0].ticker).toBe('AAPL');
      expect(results[1].ticker).toBe('MSFT');
    });

    it('passes through error results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { ticker: 'FAKE', error: 'Not found' },
          ],
        }),
      });

      const results = await adapter.refreshStocks(['FAKE']);
      expect(results[0].error).toBe('Not found');
      expect(results[0].ticker).toBe('FAKE');
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      await expect(adapter.refreshStocks(['AAPL'])).rejects.toThrow('Server error');
    });
  });
});

describe('toNum', () => {
  it('returns null for null', () => {
    expect(toNum(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(toNum(undefined)).toBeNull();
  });

  it('returns null for non-finite values', () => {
    expect(toNum('N/A')).toBeNull();
    expect(toNum(Infinity)).toBeNull();
    expect(toNum(NaN)).toBeNull();
  });

  it('converts numeric strings', () => {
    expect(toNum('42.5')).toBe(42.5);
  });

  it('passes through numbers', () => {
    expect(toNum(185.5)).toBe(185.5);
    expect(toNum(0)).toBe(0);
  });
});

describe('normalizeStockData', () => {
  it('normalizes a complete API response', () => {
    const raw = {
      ticker: 'AAPL',
      price: 185.5,
      eps: 6.42,
      relatedTickers: ['MSFT'],
    };
    const result = normalizeStockData(raw);
    expect(result.ticker).toBe('AAPL');
    expect(result.price).toBe(185.5);
    expect(result.eps).toBe(6.42);
    expect(result.relatedTickers).toEqual(['MSFT']);
  });

  it('uses fallbackTicker when ticker is missing', () => {
    const result = normalizeStockData({}, 'FALLBACK');
    expect(result.ticker).toBe('FALLBACK');
  });

  it('defaults relatedTickers to empty array when not an array', () => {
    const result = normalizeStockData({ relatedTickers: 'not-array' });
    expect(result.relatedTickers).toEqual([]);
  });

  it('converts non-numeric fields to null', () => {
    const result = normalizeStockData({ price: 'N/A', eps: undefined });
    expect(result.price).toBeNull();
    expect(result.eps).toBeNull();
  });
});
