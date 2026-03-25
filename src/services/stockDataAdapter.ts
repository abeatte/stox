import type { RawStockData } from '../types';

/**
 * Abstract interface for fetching stock data.
 * Concrete implementations can swap the underlying data source
 * without affecting consumers.
 */
export interface StockDataAdapter {
  fetchStock(ticker: string, signal?: AbortSignal): Promise<RawStockData>;
  refreshStocks(tickers: string[], signal?: AbortSignal): Promise<(RawStockData & { error?: string })[]>;
}

/** Safely coerce a value to number or null. */
export function toNum(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalize a raw API response object into a RawStockData shape.
 * Shared by fetchStock and refreshStocks to avoid field-mapping duplication.
 */
export function normalizeStockData(data: Record<string, unknown>, fallbackTicker = ''): RawStockData {
  return {
    ticker: (data.ticker as string) ?? fallbackTicker,
    price: toNum(data.price),
    changePercent: toNum(data.changePercent),
    date: (data.date as string) ?? null,
    sector: (data.sector as string) ?? null,
    industry: (data.industry as string) ?? null,
    divYield: toNum(data.divYield),
    eps: toNum(data.eps),
    totalAssets: toNum(data.totalAssets),
    goodwillNet: toNum(data.goodwillNet),
    intangiblesNet: toNum(data.intangiblesNet),
    liabilitiesTotal: toNum(data.liabilitiesTotal),
    sharesOutstanding: toNum(data.sharesOutstanding),
    dividendPercent: toNum(data.dividendPercent),
    bookValue: toNum(data.bookValue),
    priceToBook: toNum(data.priceToBook),
    relatedTickers: Array.isArray(data.relatedTickers) ? data.relatedTickers : [],
  };
}

/**
 * Throw a descriptive error from a non-ok fetch response.
 */
async function throwResponseError(response: Response, fallbackMessage: string): Promise<never> {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || fallbackMessage);
}

/**
 * Yahoo Finance adapter that fetches data from our local Express proxy.
 * The proxy uses Puppeteer to scrape Yahoo Finance quote + balance sheet pages.
 */
export class YahooFinanceAdapter implements StockDataAdapter {
  async fetchStock(ticker: string, signal?: AbortSignal): Promise<RawStockData> {
    const symbol = ticker.toUpperCase().trim();
    const url = `http://localhost:3001/api/stock/${encodeURIComponent(symbol)}`;

    const response = await fetch(url, { signal });
    if (!response.ok) {
      await throwResponseError(response, `Failed to fetch data for ${symbol}: ${response.status}`);
    }

    const data = await response.json();
    return normalizeStockData(data, symbol);
  }

  async refreshStocks(tickers: string[], signal?: AbortSignal): Promise<(RawStockData & { error?: string })[]> {
    const response = await fetch('http://localhost:3001/api/refresh-stocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickers }),
      signal,
    });
    if (!response.ok) {
      await throwResponseError(response, `Refresh failed: ${response.status}`);
    }

    const { results } = await response.json();
    return results.map((r: Record<string, unknown>) => {
      if (r.error) {
        return { ticker: r.ticker as string, error: r.error as string } as RawStockData & { error: string };
      }
      return normalizeStockData(r);
    });
  }
}

/** Default adapter instance for the app. */
export const stockDataAdapter: StockDataAdapter = new YahooFinanceAdapter();
