/**
 * Unit tests for the pure balance-sheet parsing helpers in server/parse.ts.
 * These cover the two bugs fixed in the mclw branch:
 *   1. Yahoo abbreviates figures with K/M/B/T suffixes (not raw thousands).
 *   2. Period columns run oldest -> newest, so the latest column must be
 *      selected via the "Breakdown" header dates, and chart-legend label
 *      occurrences (non-numeric next line) must be skipped.
 */
import { describe, it, expect } from 'vitest';
import { parseNum, getLatestValue, extractBalanceSheetValues } from '../../server/parse';

describe('parseNum', () => {
  it('scales magnitude suffixes to absolute (rounded) integers', () => {
    expect(parseNum('352.76B')).toBe(352_760_000_000);
    expect(parseNum('1.2T')).toBe(1_200_000_000_000);
    expect(parseNum('950.5M')).toBe(950_500_000);
    expect(parseNum('15.94K')).toBe(15_940);
  });

  it('rounds away float artifacts from mantissa * magnitude', () => {
    // 33.38 * 1e9 === 33380000000.000004 without rounding.
    const n = parseNum('33.38B');
    expect(n).toBe(33_380_000_000);
    expect(Number.isInteger(n)).toBe(true);
  });

  it('does NOT round un-suffixed decimal values (e.g. prices)', () => {
    expect(parseNum('42.50')).toBe(42.5);
    expect(parseNum('$3.14')).toBe(3.14);
  });

  it('is case-insensitive on the suffix', () => {
    expect(parseNum('2b')).toBe(2e9);
    expect(parseNum('3.5m')).toBe(3.5e6);
  });

  it('parses plain and comma-grouped numbers', () => {
    expect(parseNum('15940')).toBe(15940);
    expect(parseNum('1,234,567')).toBe(1234567);
    expect(parseNum('$42.50')).toBe(42.5);
  });

  it('handles parenthesised and signed negatives', () => {
    expect(parseNum('(1.2B)')).toBe(-1.2e9);
    expect(parseNum('-500M')).toBe(-500e6);
  });

  it('returns null for missing / placeholder / invalid values', () => {
    expect(parseNum(null)).toBeNull();
    expect(parseNum(undefined)).toBeNull();
    expect(parseNum('')).toBeNull();
    expect(parseNum('--')).toBeNull();
    expect(parseNum('N/A')).toBeNull();
    expect(parseNum('n/a')).toBeNull(); // fails the numeric regex
    expect(parseNum('abc')).toBeNull();
    expect(parseNum('12X')).toBeNull();
  });

  it('does NOT reapply a thousands multiplier (regression: 352.76B != 302080)', () => {
    // The old code did parseFloat("302.08B") -> 302.08, then * 1000 -> 302080.
    expect(parseNum('302.08B')).toBe(302_080_000_000);
  });
});

describe('getLatestValue', () => {
  const ascending = [
    'Breakdown', '1/31/2023', '1/31/2024', '1/31/2025', '1/31/2026',
    'Total Assets', '41.18B', '65.73B', '111.6B', '206.8B',
    'Share Issued', '24.0B', '24.2B', '24.5B', '24.66B',
  ];

  it('selects the most-recent column when dates ascend left-to-right', () => {
    expect(getLatestValue(ascending, 'Total Assets')).toBe('206.8B');
    expect(getLatestValue(ascending, 'Share Issued')).toBe('24.66B');
  });

  it('selects the most-recent column when dates descend left-to-right', () => {
    const descending = [
      'Breakdown', '1/31/2026', '1/31/2025', '1/31/2024', '1/31/2023',
      'Total Assets', '206.8B', '111.6B', '65.73B', '41.18B',
    ];
    expect(getLatestValue(descending, 'Total Assets')).toBe('206.8B');
  });

  it('treats TTM as the most recent column', () => {
    const withTtm = [
      'Breakdown', '9/30/2023', '9/30/2024', 'TTM',
      'Total Assets', '300B', '340B', '359.24B',
    ];
    expect(getLatestValue(withTtm, 'Total Assets')).toBe('359.24B');
  });

  it('skips chart-legend occurrences whose next line is a label, not a number', () => {
    const withLegend = [
      'Total Assets', 'Total Liabilities', 'Cash', // legend: no numeric next line
      'Breakdown', '1/31/2023', '1/31/2024',
      'Total Assets', '41.18B', '65.73B',          // real row
    ];
    expect(getLatestValue(withLegend, 'Total Assets')).toBe('65.73B');
  });

  it('returns null when the label is absent (e.g. AAPL has no Goodwill row)', () => {
    expect(getLatestValue(ascending, 'Goodwill')).toBeNull();
  });

  it('falls back to the last cell when there is no Breakdown header', () => {
    const noHeader = ['Total Assets', '100B', '200B', '300B'];
    expect(getLatestValue(noHeader, 'Total Assets')).toBe('300B');
  });

  it('returns a "--" cell for the latest period when data is missing', () => {
    const lines = ['Breakdown', '2024', '2025', 'Goodwill', '10B', '--'];
    // Non-date header ("2024"/"2025" are not M/D/YYYY) -> numCols 0 -> last cell.
    expect(getLatestValue(lines, 'Goodwill')).toBe('--');
  });
});

describe('extractBalanceSheetValues', () => {
  // Mirrors a fully-expanded Yahoo balance sheet (MSFT-like) as innerText.
  const body = [
    'Breakdown',
    '6/30/2023', '6/30/2024', '6/30/2025',
    'Total Assets', '411.98B', '512.16B', '619B',
    'Total Liabilities Net Minority Interest', '205.75B', '243.69B', '275.52B',
    'Goodwill And Other Intangible Assets', '77.25B', '78.82B', '80.1B',
    'Goodwill', '67.89B', '67.52B', '67.9B',
    'Other Intangible Assets', '9.36B', '11.3B', '12.2B',
    'Share Issued', '7.5B', '7.46B', '7.43B',
    'Ordinary Shares Number', '7.5B', '7.46B', '7.43B',
  ].join('\n');

  it('extracts the latest-period cells for each metric', () => {
    const v = extractBalanceSheetValues(body);
    expect(v.totalAssets).toBe('619B');
    expect(v.liabilitiesTotal).toBe('275.52B');
    expect(v.goodwillNet).toBe('67.9B');       // exact "Goodwill", not the combined row
    expect(v.intangiblesNet).toBe('12.2B');
    expect(v.sharesOutstanding).toBe('7.43B');
  });

  it('does not confuse "Goodwill" with "Goodwill And Other Intangible Assets"', () => {
    const v = extractBalanceSheetValues(body);
    expect(v.goodwillNet).not.toBe('80.1B'); // that is the combined parent's latest cell
  });

  it('falls back from Share Issued to Ordinary Shares Number', () => {
    const noShareIssued = [
      'Breakdown', '6/30/2025',
      'Total Assets', '619B',
      'Ordinary Shares Number', '7.43B',
    ].join('\n');
    const v = extractBalanceSheetValues(noShareIssued);
    expect(v.sharesOutstanding).toBe('7.43B');
  });

  it('returns null fields for a statement without goodwill (AAPL-like)', () => {
    const aapl = [
      'Breakdown', '9/30/2024', '9/30/2025',
      'Total Assets', '352.76B', '359.24B',
      'Total Liabilities Net Minority Interest', '290B', '285.51B',
      'Share Issued', '15.1B', '14.77B',
    ].join('\n');
    const v = extractBalanceSheetValues(aapl);
    expect(v.totalAssets).toBe('359.24B');
    expect(v.goodwillNet).toBeNull();
    expect(v.intangiblesNet).toBeNull();
    expect(v.sharesOutstanding).toBe('14.77B');
  });

  it('round-trips through parseNum to absolute numbers', () => {
    const v = extractBalanceSheetValues(body);
    expect(parseNum(v.totalAssets)).toBe(619e9);
    expect(parseNum(v.goodwillNet)).toBe(67_900_000_000);
  });
});
