import type { RawStockData, StockRowData } from '../types';

/**
 * Safely divides two numbers, returning null if the divisor is 0 or either input is null.
 */
function safeDivide(
  numerator: number | null,
  denominator: number | null,
): number | null {
  if (numerator === null || denominator === null || denominator === 0) {
    return null;
  }
  return numerator / denominator;
}

/**
 * Computes derived financial metrics from raw stock data.
 *
 * Returns null for any computed field when a required input is null or a divisor is zero.
 */
export function computeStockRow(
  raw: RawStockData,
  interest: string,
): StockRowData {
  const {
    ticker,
    price,
    date,
    divYield,
    eps,
    totalAssets,
    goodwillNet,
    intangiblesNet,
    liabilitiesTotal,
    sharesOutstanding,
    dividendPercent,
  } = raw;

  // bookValue = (totalAssets - liabilitiesTotal) / sharesOutstanding
  // Falls back to Yahoo's pre-computed bookValue per share when balance sheet data is unavailable
  let bookValue: number | null =
    totalAssets !== null &&
    liabilitiesTotal !== null &&
    sharesOutstanding !== null &&
    sharesOutstanding !== 0
      ? (totalAssets - liabilitiesTotal) / sharesOutstanding
      : null;

  if (bookValue === null && raw.bookValue != null) {
    bookValue = raw.bookValue;
  }

  // pBook = price / bookValue
  // Falls back to Yahoo's pre-computed priceToBook when computed value is unavailable
  let pBook: number | null = safeDivide(price, bookValue);
  if (pBook === null && raw.priceToBook != null) {
    pBook = raw.priceToBook;
  }

  // tangibleBookValue = bookValue - (goodwillNet + intangiblesNet) / sharesOutstanding
  // null when any input is null or sharesOutstanding is 0
  const tangibleBookValue: number | null =
    bookValue !== null &&
    sharesOutstanding !== null &&
    sharesOutstanding !== 0
      ? bookValue - ((goodwillNet ?? 0) + (intangiblesNet ?? 0)) / sharesOutstanding
      : null;

  // pTangbook = price / tangibleBookValue
  // null when tangibleBookValue is 0 or null, or price is null
  const pTangbook: number | null = safeDivide(price, tangibleBookValue);

  // eps20x = 20 * eps (null when eps is null)
  const eps20x: number | null = eps !== null ? 20 * eps : null;

  // eps15x = 15 * eps (null when eps is null)
  const eps15x: number | null = eps !== null ? 15 * eps : null;

  // priceEarnings = price / eps (null when eps is 0 or null, or price is null)
  const priceEarnings: number | null = safeDivide(price, eps);

  return {
    ticker,
    price,
    date,
    divYield,
    eps,
    totalAssets,
    goodwillNet,
    intangiblesNet,
    liabilitiesTotal,
    sharesOutstanding,
    bookValue,
    pBook,
    tangibleBookValue,
    pTangbook,
    dividendPercent,
    eps20x,
    eps15x,
    priceEarnings,
    interest,
  };
}
