/**
 * Number formatting utilities for the Stox stock ticker app.
 *
 * Formatting rules:
 * - currency:      $X.XX or ($X.XX) for negatives
 * - percent:       X.XX%
 * - ratio:         X.XX or (X.XX) for negatives
 * - large-number:  Abbreviated K/M/B/T with $ prefix
 * - null/undefined → "N/A"
 */

/**
 * Format a number as currency: $X.XX, with parentheses for negatives.
 */
export function formatCurrency(value: number): string {
  if (value < 0) {
    return `($${Math.abs(value).toFixed(2)})`;
  }
  return `$${value.toFixed(2)}`;
}

/**
 * Format a number as a percentage: X.XX%
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Format a number as a ratio: X.XX, with parentheses for negatives.
 */
export function formatRatio(value: number): string {
  if (value < 0) {
    return `(${Math.abs(value).toFixed(2)})`;
  }
  return value.toFixed(2);
}

/**
 * Format a large number with abbreviated K/M/B/T suffix and $ prefix.
 * Values below 1000 are displayed without abbreviation.
 */
export function formatLargeNumber(value: number): string {
  const abs = Math.abs(value);

  if (abs >= 1e12) {
    return `$${(value / 1e12).toFixed(1)}T`;
  }
  if (abs >= 1e9) {
    return `$${(value / 1e9).toFixed(1)}B`;
  }
  if (abs >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  }
  if (abs >= 1e3) {
    return `$${(value / 1e3).toFixed(1)}K`;
  }

  return `${value}`;
}

/**
 * Dispatcher that formats a value based on its column type.
 * Returns "N/A" for null or undefined values.
 */
export function formatValue(
  value: number | string | null | undefined,
  type: 'text' | 'currency' | 'percent' | 'ratio' | 'large-number',
): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  if (type === 'text') {
    return String(value);
  }

  if (typeof value !== 'number') {
    return String(value);
  }

  switch (type) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return formatPercent(value);
    case 'ratio':
      return formatRatio(value);
    case 'large-number':
      return formatLargeNumber(value);
    default:
      return String(value);
  }
}
