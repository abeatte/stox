import { describe, it, expect } from 'vitest';
import { filterTickers, sortRows } from './useTableState';
import { StockRowData } from '../types';

function makeRow(overrides: Partial<StockRowData>): StockRowData {
  return {
    ticker: '',
    price: null,
    changePercent: null,
    date: null,
    sector: null,
    industry: null,
    divYield: null,
    eps: null,
    totalAssets: null,
    goodwillNet: null,
    intangiblesNet: null,
    liabilitiesTotal: null,
    sharesOutstanding: null,
    bookValue: null,
    pBook: null,
    tangibleBookValue: null,
    pTangbook: null,
    dividendPercent: null,
    eps20x: null,
    eps15x: null,
    priceEarnings: null,
    ...overrides,
  };
}

describe('filterTickers', () => {
  it('returns all tickers when query is empty', () => {
    const tickers = ['AAPL', 'MSFT', 'GOOG'];
    expect(filterTickers(tickers, '')).toEqual(['AAPL', 'MSFT', 'GOOG']);
  });

  it('filters case-insensitively', () => {
    const tickers = ['AAPL', 'MSFT', 'AMZN'];
    expect(filterTickers(tickers, 'a')).toEqual(['AAPL', 'AMZN']);
    expect(filterTickers(tickers, 'A')).toEqual(['AAPL', 'AMZN']);
  });

  it('matches substring anywhere in ticker', () => {
    const tickers = ['AAPL', 'MSFT', 'GOOG'];
    expect(filterTickers(tickers, 'SF')).toEqual(['MSFT']);
  });

  it('returns empty array when nothing matches', () => {
    expect(filterTickers(['AAPL', 'MSFT'], 'XYZ')).toEqual([]);
  });

  it('does not modify the original array', () => {
    const tickers = ['AAPL', 'MSFT', 'GOOG'];
    const original = [...tickers];
    filterTickers(tickers, 'A');
    expect(tickers).toEqual(original);
  });
});

describe('sortRows', () => {
  const rows = [
    makeRow({ ticker: 'MSFT', price: 400 }),
    makeRow({ ticker: 'AAPL', price: 200 }),
    makeRow({ ticker: 'GOOG', price: 150 }),
  ];

  it('returns rows unchanged when criteria is empty', () => {
    expect(sortRows(rows, [])).toEqual(rows);
  });

  it('sorts alphabetically ascending by text column', () => {
    const sorted = sortRows(rows, [{ column: 'ticker', direction: 'asc' }]);
    expect(sorted.map((r) => r.ticker)).toEqual(['AAPL', 'GOOG', 'MSFT']);
  });

  it('sorts alphabetically descending by text column', () => {
    const sorted = sortRows(rows, [{ column: 'ticker', direction: 'desc' }]);
    expect(sorted.map((r) => r.ticker)).toEqual(['MSFT', 'GOOG', 'AAPL']);
  });

  it('sorts numerically ascending by numeric column', () => {
    const sorted = sortRows(rows, [{ column: 'price', direction: 'asc' }]);
    expect(sorted.map((r) => r.price)).toEqual([150, 200, 400]);
  });

  it('sorts numerically descending by numeric column', () => {
    const sorted = sortRows(rows, [{ column: 'price', direction: 'desc' }]);
    expect(sorted.map((r) => r.price)).toEqual([400, 200, 150]);
  });

  it('pushes null values to the end regardless of direction', () => {
    const withNulls = [
      makeRow({ ticker: 'A', price: null }),
      makeRow({ ticker: 'B', price: 100 }),
      makeRow({ ticker: 'C', price: 50 }),
    ];
    const asc = sortRows(withNulls, [{ column: 'price', direction: 'asc' }]);
    expect(asc.map((r) => r.price)).toEqual([50, 100, null]);

    const desc = sortRows(withNulls, [{ column: 'price', direction: 'desc' }]);
    expect(desc.map((r) => r.price)).toEqual([100, 50, null]);
  });

  it('does not modify the original array', () => {
    const original = [...rows];
    sortRows(rows, [{ column: 'price', direction: 'asc' }]);
    expect(rows).toEqual(original);
  });

  it('sorts by multiple columns with correct priority', () => {
    const multiRows = [
      makeRow({ ticker: 'AAPL', sector: 'Tech', price: 200 }),
      makeRow({ ticker: 'MSFT', sector: 'Tech', price: 400 }),
      makeRow({ ticker: 'JPM', sector: 'Finance', price: 150 }),
      makeRow({ ticker: 'GS', sector: 'Finance', price: 350 }),
    ];
    const sorted = sortRows(multiRows, [
      { column: 'sector', direction: 'asc' },
      { column: 'price', direction: 'desc' },
    ]);
    expect(sorted.map((r) => r.ticker)).toEqual(['GS', 'JPM', 'MSFT', 'AAPL']);
  });
});
