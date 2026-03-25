import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPercent,
  formatRatio,
  formatLargeNumber,
  formatLargeCount,
  formatValue,
} from './formatters';

describe('formatCurrency', () => {
  it('formats positive values with $ prefix and 2 decimals', () => {
    expect(formatCurrency(185.5)).toBe('$185.50');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(1234.567)).toBe('$1234.57');
  });

  it('wraps negative values in parentheses', () => {
    expect(formatCurrency(-42.1)).toBe('($42.10)');
    expect(formatCurrency(-0.01)).toBe('($0.01)');
  });
});

describe('formatPercent', () => {
  it('formats with 2 decimals and % suffix', () => {
    expect(formatPercent(3.14159)).toBe('3.14%');
    expect(formatPercent(0)).toBe('0.00%');
    expect(formatPercent(-1.5)).toBe('-1.50%');
    expect(formatPercent(100)).toBe('100.00%');
  });
});

describe('formatRatio', () => {
  it('formats positive values with 2 decimals', () => {
    expect(formatRatio(1.234)).toBe('1.23');
    expect(formatRatio(0)).toBe('0.00');
  });

  it('wraps negative values in parentheses', () => {
    expect(formatRatio(-2.5)).toBe('(2.50)');
  });
});

describe('formatLargeNumber', () => {
  it('formats trillions with $T suffix', () => {
    expect(formatLargeNumber(1.5e12)).toBe('$1.5T');
    expect(formatLargeNumber(-2e12)).toBe('$-2.0T');
  });

  it('formats billions with $B suffix', () => {
    expect(formatLargeNumber(352583e6)).toBe('$352.6B');
    expect(formatLargeNumber(5e9)).toBe('$5.0B');
  });

  it('formats millions with $M suffix', () => {
    expect(formatLargeNumber(1.2e6)).toBe('$1.2M');
  });

  it('formats thousands with $K suffix', () => {
    expect(formatLargeNumber(5000)).toBe('$5.0K');
  });

  it('formats values below 1000 without abbreviation', () => {
    expect(formatLargeNumber(999)).toBe('999');
    expect(formatLargeNumber(0)).toBe('0');
  });
});

describe('formatLargeCount', () => {
  it('formats without $ prefix', () => {
    expect(formatLargeCount(1.5e12)).toBe('1.5T');
    expect(formatLargeCount(5e9)).toBe('5.0B');
    expect(formatLargeCount(1.2e6)).toBe('1.2M');
    expect(formatLargeCount(5000)).toBe('5.0K');
    expect(formatLargeCount(999)).toBe('999');
  });
});

describe('formatValue', () => {
  it('returns N/A for null', () => {
    expect(formatValue(null, 'currency')).toBe('N/A');
  });

  it('returns N/A for undefined', () => {
    expect(formatValue(undefined, 'percent')).toBe('N/A');
  });

  it('returns string value for text type', () => {
    expect(formatValue('Technology', 'text')).toBe('Technology');
  });

  it('delegates to formatCurrency for currency type', () => {
    expect(formatValue(185.5, 'currency')).toBe('$185.50');
  });

  it('delegates to formatPercent for percent type', () => {
    expect(formatValue(3.14, 'percent')).toBe('3.14%');
  });

  it('delegates to formatRatio for ratio type', () => {
    expect(formatValue(1.23, 'ratio')).toBe('1.23');
  });

  it('delegates to formatLargeNumber for large-number type', () => {
    expect(formatValue(5e9, 'large-number')).toBe('$5.0B');
  });

  it('delegates to formatLargeCount for large-count type', () => {
    expect(formatValue(5e9, 'large-count')).toBe('5.0B');
  });

  it('converts non-number values to string for non-text types', () => {
    expect(formatValue('hello', 'currency')).toBe('hello');
  });
});
