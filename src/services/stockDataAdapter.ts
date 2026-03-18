import type { RawStockData } from '../types';

/**
 * Abstract interface for fetching stock data.
 * Concrete implementations can swap the underlying data source
 * (Yahoo Finance, Google Finance, etc.) without affecting consumers.
 */
export interface StockDataAdapter {
  fetchStock(ticker: string): Promise<RawStockData>;
}

/**
 * Yahoo Finance adapter using the Vite dev-proxy.
 * Proxies requests through `/api/yahoo` → `https://query1.finance.yahoo.com`.
 */
export class YahooFinanceAdapter implements StockDataAdapter {
  async fetchStock(ticker: string): Promise<RawStockData> {
    const symbol = ticker.toUpperCase().trim();
    const url = `/api/yahoo/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data for ${symbol}: ${response.status}`);
    }

    const json = await response.json();
    return parseYahooResponse(symbol, json);
  }
}

/**
 * Parse Yahoo Finance chart API response into RawStockData.
 */
function parseYahooResponse(ticker: string, json: unknown): RawStockData {
  const empty: RawStockData = {
    ticker,
    price: null,
    date: null,
    divYield: null,
    eps: null,
    totalAssets: null,
    goodwillNet: null,
    intangiblesNet: null,
    liabilitiesTotal: null,
    sharesOutstanding: null,
    dividendPercent: null,
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = json as any;
    const result = data?.chart?.result?.[0];
    if (!result) return empty;

    const meta = result.meta ?? {};
    const price = meta.regularMarketPrice ?? null;
    const timestamp = meta.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString().split('T')[0]
      : null;

    return {
      ticker,
      price: toNum(price),
      date: timestamp,
      divYield: toNum(meta.dividendYield),
      eps: toNum(meta.epsTrailingTwelveMonths),
      totalAssets: null,       // not available from chart endpoint
      goodwillNet: null,       // not available from chart endpoint
      intangiblesNet: null,    // not available from chart endpoint
      liabilitiesTotal: null,  // not available from chart endpoint
      sharesOutstanding: toNum(meta.sharesOutstanding),
      dividendPercent: toNum(meta.dividendRate),
    };
  } catch {
    return empty;
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
