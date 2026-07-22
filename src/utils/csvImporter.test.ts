import { describe, it, expect } from 'vitest';
import { parseCsvRows, parseTickersFromCsv } from './csvImporter';

describe('parseCsvRows', () => {
  it('handles quoted fields containing commas', () => {
    expect(parseCsvRows('a,"b,c",d')).toEqual([['a', 'b,c', 'd']]);
  });

  it('handles escaped double-quotes inside quoted fields', () => {
    expect(parseCsvRows('x,"she said ""hi"""')).toEqual([['x', 'she said "hi"']]);
  });

  it('splits multiple rows and normalises CRLF, BOM, and trailing newline', () => {
    expect(parseCsvRows('\uFEFFa,b\r\nc,d\r\n')).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('returns empty for empty input', () => {
    expect(parseCsvRows('')).toEqual([]);
  });
});

describe('parseTickersFromCsv', () => {
  it('extracts the ticker column from a Stox export (skips header, handles quoted cells)', () => {
    const csv = [
      'Ticker,Price,Sector,Industry',
      'AAPL,$185.50,Technology,Consumer Electronics',
      'MSFT,$420.72,Technology,"Software, Infrastructure"',
      'GOOG,$170.25,Communication Services,Internet Content',
    ].join('\n');
    expect(parseTickersFromCsv(csv)).toEqual(['AAPL', 'MSFT', 'GOOG']);
  });

  it('parses a plain one-per-line list, upper-casing and de-duplicating', () => {
    expect(parseTickersFromCsv('aapl\nMSFT\naapl\n\ngoog')).toEqual(['AAPL', 'MSFT', 'GOOG']);
  });

  it('parses a single comma-separated line as a flat list', () => {
    expect(parseTickersFromCsv('AAPL,MSFT,GOOG')).toEqual(['AAPL', 'MSFT', 'GOOG']);
  });

  it('preserves dotted/hyphenated symbols like BRK.B', () => {
    expect(parseTickersFromCsv('BRK.B\nBF-B')).toEqual(['BRK.B', 'BF-B']);
  });

  it('filters out non-ticker cells (numbers, blanks, over-long)', () => {
    expect(parseTickersFromCsv('AAPL\n185.50\n\nTOOLONGTICKER1\nMSFT')).toEqual(['AAPL', 'MSFT']);
  });

  it('does not treat an export data row as a flat list (price/sector break it)', () => {
    // Single data row (no header) — only the ticker column should be taken.
    expect(parseTickersFromCsv('AAPL,185.50,Technology')).toEqual(['AAPL']);
  });

  it('returns empty for a header-only file or empty input', () => {
    expect(parseTickersFromCsv('Ticker,Price')).toEqual([]);
    expect(parseTickersFromCsv('')).toEqual([]);
  });

  it('accepts a Symbol header alias', () => {
    expect(parseTickersFromCsv('Symbol\nAAPL\nMSFT')).toEqual(['AAPL', 'MSFT']);
  });
});
