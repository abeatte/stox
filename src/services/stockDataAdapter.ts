import type { RawStockData } from '../types';

/**
 * Abstract interface for fetching stock data.
 * Concrete implementations can swap the underlying data source
 * without affecting consumers.
 */
export interface StockDataAdapter {
  fetchStock(ticker: string, signal?: AbortSignal): Promise<RawStockData>;
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
      const body = await response.json().catch(() => ({}));
      throw new Error(
        body.error || `Failed to fetch data for ${symbol}: ${response.status}`
      );
    }

    const data = await response.json();
    return {
      ticker: data.ticker ?? symbol,
      price: toNum(data.price),
      date: data.date ?? null,
      divYield: toNum(data.divYield),
      eps: toNum(data.eps),
      totalAssets: toNum(data.totalAssets),
      goodwillNet: toNum(data.goodwillNet),
      intangiblesNet: toNum(data.intangiblesNet),
      liabilitiesTotal: toNum(data.liabilitiesTotal),
      sharesOutstanding: toNum(data.sharesOutstanding),
      dividendPercent: toNum(data.dividendPercent),
    };
  }
}

/** Safely coerce a value to number or null. */
function toNum(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Default adapter instance for the app. */
export const stockDataAdapter: StockDataAdapter = new YahooFinanceAdapter();
