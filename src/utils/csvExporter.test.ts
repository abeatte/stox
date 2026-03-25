import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateCsv, buildExportFilename, downloadCsv } from './csvExporter';
import type { StockRowData } from '../types';

function makeRow(overrides: Partial<StockRowData> = {}): StockRowData {
  return {
    ticker: 'AAPL',
    price: 185.5,
    changePercent: 1.25,
    date: '2025-03-18',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    divYield: 0.52,
    eps: 6.42,
    totalAssets: 352583000000,
    goodwillNet: 0,
    intangiblesNet: 0,
    liabilitiesTotal: 290437000000,
    sharesOutstanding: 15460000000,
    bookValue: 4.02,
    pBook: 46.14,
    tangibleBookValue: 4.02,
    pTangbook: 46.14,
    dividendPercent: 0.96,
    eps20x: 128.4,
    eps15x: 96.3,
    priceEarnings: 28.89,
    ...overrides,
  };
}

describe('generateCsv', () => {
  it('generates header row from column labels', () => {
    const csv = generateCsv([]);
    const header = csv.split('\n')[0];
    expect(header).toContain('Ticker');
    expect(header).toContain('Price');
    expect(header).toContain('EPS');
    expect(header).toContain('Book Value');
  });

  it('generates data rows with formatted values', () => {
    const csv = generateCsv([makeRow()]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2); // header + 1 data row
    expect(lines[1]).toContain('AAPL');
    expect(lines[1]).toContain('$185.50');
    expect(lines[1]).toContain('$6.42');
  });

  it('handles multiple rows', () => {
    const rows = [
      makeRow({ ticker: 'AAPL' }),
      makeRow({ ticker: 'MSFT', price: 420.72 }),
    ];
    const csv = generateCsv(rows);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('AAPL');
    expect(lines[2]).toContain('MSFT');
  });

  it('shows N/A for null values', () => {
    const csv = generateCsv([makeRow({ price: null, eps: null })]);
    const dataLine = csv.split('\n')[1];
    // Price and EPS should be N/A
    expect(dataLine).toContain('N/A');
  });

  it('escapes values containing commas', () => {
    const csv = generateCsv([makeRow({ sector: 'Tech, Media' })]);
    const dataLine = csv.split('\n')[1];
    expect(dataLine).toContain('"Tech, Media"');
  });

  it('escapes values containing double quotes', () => {
    const csv = generateCsv([makeRow({ sector: 'Tech "Big"' })]);
    const dataLine = csv.split('\n')[1];
    expect(dataLine).toContain('"Tech ""Big"""');
  });

  it('escapes values containing newlines', () => {
    const csv = generateCsv([makeRow({ sector: 'Tech\nMedia' })]);
    const dataLine = csv.split('\n').slice(1).join('\n');
    expect(dataLine).toContain('"Tech\nMedia"');
  });
});

describe('buildExportFilename', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns filename with stox-export prefix and .csv extension', () => {
    vi.setSystemTime(new Date('2025-03-18T12:00:00.000Z'));
    const filename = buildExportFilename();
    expect(filename).toBe('stox-export-2025-03-18T12:00:00.000Z.csv');
  });

  it('includes ISO 8601 timestamp', () => {
    const filename = buildExportFilename();
    expect(filename).toMatch(/^stox-export-\d{4}-\d{2}-\d{2}T.+\.csv$/);
  });
});

describe('downloadCsv', () => {
  it('creates a blob link and triggers download', () => {
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    const clickSpy = vi.fn();
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true });

    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreateElement(tag);
      if (tag === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    downloadCsv('test,data', 'test.csv');

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
