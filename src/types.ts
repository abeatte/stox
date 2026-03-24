/**
 * Raw values returned from the data adapter.
 * All numeric fields are optional (null) to handle fetch failures.
 */
export interface RawStockData {
  ticker: string;
  price: number | null;
  changePercent: number | null;
  date: string | null;
  sector: string | null;
  industry: string | null;
  divYield: number | null;
  eps: number | null;
  totalAssets: number | null;
  goodwillNet: number | null;
  intangiblesNet: number | null;
  liabilitiesTotal: number | null;
  sharesOutstanding: number | null;
  dividendPercent: number | null;
  /** Pre-computed book value per share (from Yahoo). Used as fallback when balance sheet data is unavailable. */
  bookValue?: number | null;
  /** Pre-computed price-to-book ratio (from Yahoo). Used as fallback when balance sheet data is unavailable. */
  priceToBook?: number | null;
  /** Related ticker symbols scraped from Yahoo Finance's "Related Tickers" section. */
  relatedTickers?: string[];
}

/**
 * Computed row data derived from RawStockData via computeStockRow().
 */
export interface StockRowData {
  ticker: string;
  price: number | null;
  changePercent: number | null;
  date: string | null;
  sector: string | null;
  industry: string | null;
  divYield: number | null;
  eps: number | null;
  totalAssets: number | null;
  goodwillNet: number | null;
  intangiblesNet: number | null;
  liabilitiesTotal: number | null;
  sharesOutstanding: number | null;
  bookValue: number | null;
  pBook: number | null;
  tangibleBookValue: number | null;
  pTangbook: number | null;
  dividendPercent: number | null;
  eps20x: number | null;
  eps15x: number | null;
  priceEarnings: number | null;
}

/**
 * Union type of all valid column keys.
 */
export type ColumnKey =
  | 'ticker'
  | 'price'
  | 'sector'
  | 'industry'
  | 'divYield'
  | 'eps'
  | 'totalAssets'
  | 'goodwillNet'
  | 'intangiblesNet'
  | 'liabilitiesTotal'
  | 'sharesOutstanding'
  | 'bookValue'
  | 'pBook'
  | 'tangibleBookValue'
  | 'pTangbook'
  | 'dividendPercent'
  | 'eps20x'
  | 'eps15x'
  | 'priceEarnings';

/**
 * Column definition metadata for rendering and sorting.
 */
export interface ColumnDef {
  key: ColumnKey;
  label: string;
  type: 'text' | 'currency' | 'percent' | 'ratio' | 'large-number' | 'large-count';
  sortType: 'alpha' | 'numeric';
}
