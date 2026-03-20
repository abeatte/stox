import { ColumnDef } from './types';

/**
 * The 19-column definitions in display order, matching Requirement 2.2.
 */
export const COLUMNS: ColumnDef[] = [
  { key: 'ticker', label: 'Ticker', type: 'text', sortType: 'alpha' },
  { key: 'price', label: 'Price', type: 'currency', sortType: 'numeric' },
  { key: 'divYield', label: 'Div Yield', type: 'currency', sortType: 'numeric' },
  { key: 'eps', label: 'EPS', type: 'currency', sortType: 'numeric' },
  { key: 'totalAssets', label: 'Total Assets', type: 'large-number', sortType: 'numeric' },
  { key: 'goodwillNet', label: 'Goodwill, Net', type: 'large-number', sortType: 'numeric' },
  { key: 'intangiblesNet', label: 'Intangibles, Net', type: 'large-number', sortType: 'numeric' },
  { key: 'liabilitiesTotal', label: 'Liabilities (Total)', type: 'large-number', sortType: 'numeric' },
  { key: 'sharesOutstanding', label: 'Shares (Total Common Outstanding)', type: 'large-count', sortType: 'numeric' },
  { key: 'bookValue', label: 'Book Value', type: 'currency', sortType: 'numeric' },
  { key: 'pBook', label: 'P:Book', type: 'ratio', sortType: 'numeric' },
  { key: 'tangibleBookValue', label: 'Tangable Book Value', type: 'currency', sortType: 'numeric' },
  { key: 'pTangbook', label: 'P:Tangbook', type: 'ratio', sortType: 'numeric' },
  { key: 'dividendPercent', label: 'Dividend Percent', type: 'percent', sortType: 'numeric' },
  { key: 'priceEarnings', label: 'Price/Earnings', type: 'ratio', sortType: 'numeric' },
];
