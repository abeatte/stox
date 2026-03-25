/**
 * Number formatting utilities for the Stox stock ticker app.
 *
 * Formatting rules:
 * - currency:      $X.XX or ($X.XX) for negatives
 * - percent:       X.XX%
 * - ratio:         X.XX or (X.XX) for negatives
 * - large-number:  Abbreviated K/M/B/T with $ prefix
 * - large-count:   Abbreviated K/M/B/T without $ prefix
 * - null/undefined → "N/A"
 */

/**
 * Format a number as currency: $X.XX, with parentheses for negatives.
 */
export function formatCurrency(value: number): string {
  if (value < 0) {
    return '($' + Math.abs(value).toFixed(2) + ')';
  }
  return '$' + value.toFixed(2);
}

/**
 * Format a number as a percentage: X.XX%
 */
export function formatPercent(value: number): string {
  return value.toFixed(2) + '%';
}

/**
 * Format a number as a ratio: X.XX, with parentheses for negatives.
 */
export function formatRatio(value: number): string {
  if (value < 0) {
    return '(' + Math.abs(value).toFixed(2) + ')';
  }
  return value.toFixed(2);
}

/** Abbreviation thresholds in descending order. */
const ABBREVIATIONS: [number, string][] = [
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

/**
 * Core abbreviation logic shared by formatLargeNumber and formatLargeCount.
 * Abbreviates values >= 1000 with K/M/B/T suffix.
 */
function abbreviate(value: number, prefix: string): string {
  const abs = Math.abs(value);
  for (const [threshold, suffix] of ABBREVIATIONS) {
    if (abs >= threshold) {
      return prefix + (value / threshold).toFixed(1) + suffix;
    }
  }
  return String(value);
}

/**
 * Format a large number with abbreviated K/M/B/T suffix and $ prefix.
 * Values below 1000 are displayed without abbreviation.
 */
export function formatLargeNumber(value: number): string {
  return abbreviate(value, '$');
}

/**
 * Format a large number with abbreviated K/M/B/T suffix without $ prefix.
 * Used for non-monetary counts like shares outstanding.
 */
export function formatLargeCount(value: number): string {
  return abbreviate(value, '');
}

/** All supported format types. */
export type FormatType = 'text' | 'currency' | 'percent' | 'ratio' | 'large-number' | 'large-count';

/** Map from format type to its formatter function. */
const FORMATTERS: Record<Exclude<FormatType, 'text'>, (v: number) => string> = {
  currency: formatCurrency,
  percent: formatPercent,
  ratio: formatRatio,
  'large-number': formatLargeNumber,
  'large-count': formatLargeCount,
};

/**
 * Dispatcher that formats a value based on its column type.
 * Returns "N/A" for null or undefined values.
 */
export function formatValue(
  value: number | string | null | undefined,
  type: FormatType,
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

  const formatter = FORMATTERS[type];
  return formatter ? formatter(value) : String(value);
}
