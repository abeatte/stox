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
      changePercent: toNum(data.changePercent),
      date: data.date ?? null,
      sector: data.sector ?? null,
      industry: data.industry ?? null,
      divYield: toNum(data.divYield),
      eps: toNum(data.eps),
      totalAssets: toNum(data.totalAssets),
      goodwillNet: toNum(data.goodwillNet),
      intangiblesNet: toNum(data.intangiblesNet),
      liabilitiesTotal: toNum(data.liabilitiesTotal),
      sharesOutstanding: toNum(data.sharesOutstanding),
      dividendPercent: toNum(data.dividendPercent),
      relatedTickers: Array.isArray(data.relatedTickers) ? data.relatedTickers : [],
    };
  }

  async refreshStocks(tickers: string[], signal?: AbortSignal): Promise<(RawStockData & { error?: string })[]> {
    const response = await fetch('http://localhost:3001/api/refresh-stocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickers }),
      signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Refresh failed: ${response.status}`);
    }
    const { results } = await response.json();
    return results.map((r: Record<string, unknown>) => {
      if (r.error) {
        return { ticker: r.ticker as string, error: r.error as string } as any;
      }
      return {
        ticker: (r.ticker as string) ?? '',
        price: toNum(r.price),
        changePercent: toNum(r.changePercent),
        date: (r.date as string) ?? null,
        sector: (r.sector as string) ?? null,
        industry: (r.industry as string) ?? null,
        divYield: toNum(r.divYield),
        eps: toNum(r.eps),
        totalAssets: toNum(r.totalAssets),
        goodwillNet: toNum(r.goodwillNet),
        intangiblesNet: toNum(r.intangiblesNet),
        liabilitiesTotal: toNum(r.liabilitiesTotal),
        sharesOutstanding: toNum(r.sharesOutstanding),
        dividendPercent: toNum(r.dividendPercent),
        bookValue: toNum(r.bookValue),
        priceToBook: toNum(r.priceToBook),
        relatedTickers: Array.isArray(r.relatedTickers) ? r.relatedTickers : [],
      };
    });
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
