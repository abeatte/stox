import { describe, it, expect } from 'vitest';
import { computeStockRow } from './computeStockRow';
import type { RawStockData } from '../types';

function makeRaw(overrides: Partial<RawStockData> = {}): RawStockData {
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
    dividendPercent: 0.96,
    ...overrides,
  };
}

describe('computeStockRow', () => {
  it('passes through raw fields unchanged', () => {
    const result = computeStockRow(makeRaw());
    expect(result.ticker).toBe('AAPL');
    expect(result.price).toBe(185.5);
    expect(result.changePercent).toBe(1.25);
    expect(result.date).toBe('2025-03-18');
    expect(result.sector).toBe('Technology');
    expect(result.industry).toBe('Consumer Electronics');
    expect(result.divYield).toBe(0.52);
    expect(result.eps).toBe(6.42);
    expect(result.dividendPercent).toBe(0.96);
  });

  describe('bookValue', () => {
    it('computes bookValue = (totalAssets - liabilitiesTotal) / sharesOutstanding', () => {
      const result = computeStockRow(makeRaw());
      const expected = (352583000000 - 290437000000) / 15460000000;
      expect(result.bookValue).toBeCloseTo(expected, 5);
    });

    it('returns null when sharesOutstanding is 0', () => {
      const result = computeStockRow(makeRaw({ sharesOutstanding: 0 }));
      expect(result.bookValue).toBeNull();
    });

    it('returns null when totalAssets is null', () => {
      const result = computeStockRow(makeRaw({ totalAssets: null }));
      expect(result.bookValue).toBeNull();
    });

    it('falls back to raw bookValue when balance sheet data is unavailable', () => {
      const result = computeStockRow(makeRaw({
        totalAssets: null,
        bookValue: 4.02,
      }));
      expect(result.bookValue).toBe(4.02);
    });
  });

  describe('pBook', () => {
    it('computes pBook = price / bookValue', () => {
      const result = computeStockRow(makeRaw());
      const bookValue = (352583000000 - 290437000000) / 15460000000;
      expect(result.pBook).toBeCloseTo(185.5 / bookValue, 4);
    });

    it('returns null when bookValue is null and no fallback', () => {
      const result = computeStockRow(makeRaw({ totalAssets: null }));
      expect(result.pBook).toBeNull();
    });

    it('falls back to raw priceToBook when computed is null', () => {
      const result = computeStockRow(makeRaw({
        totalAssets: null,
        priceToBook: 46.14,
      }));
      expect(result.pBook).toBe(46.14);
    });
  });

  describe('tangibleBookValue', () => {
    it('computes tangibleBookValue = bookValue - (goodwillNet + intangiblesNet) / sharesOutstanding', () => {
      const raw = makeRaw({ goodwillNet: 1000000, intangiblesNet: 500000 });
      const result = computeStockRow(raw);
      const bookValue = (352583000000 - 290437000000) / 15460000000;
      const expected = bookValue - (1000000 + 500000) / 15460000000;
      expect(result.tangibleBookValue).toBeCloseTo(expected, 5);
    });

    it('treats null goodwillNet and intangiblesNet as 0', () => {
      const raw = makeRaw({ goodwillNet: null, intangiblesNet: null });
      const result = computeStockRow(raw);
      const bookValue = (352583000000 - 290437000000) / 15460000000;
      expect(result.tangibleBookValue).toBeCloseTo(bookValue, 5);
    });

    it('returns null when bookValue is null', () => {
      const result = computeStockRow(makeRaw({ totalAssets: null }));
      expect(result.tangibleBookValue).toBeNull();
    });

    it('returns null when sharesOutstanding is 0', () => {
      const result = computeStockRow(makeRaw({ sharesOutstanding: 0 }));
      expect(result.tangibleBookValue).toBeNull();
    });
  });

  describe('pTangbook', () => {
    it('computes pTangbook = price / tangibleBookValue', () => {
      const result = computeStockRow(makeRaw());
      expect(result.pTangbook).not.toBeNull();
      expect(result.pTangbook).toBeCloseTo(185.5 / result.tangibleBookValue!, 4);
    });

    it('returns null when tangibleBookValue is null', () => {
      const result = computeStockRow(makeRaw({ totalAssets: null }));
      expect(result.pTangbook).toBeNull();
    });
  });

  describe('EPS multiples', () => {
    it('computes eps20x = 20 * eps', () => {
      const result = computeStockRow(makeRaw());
      expect(result.eps20x).toBe(20 * 6.42);
    });

    it('computes eps15x = 15 * eps', () => {
      const result = computeStockRow(makeRaw());
      expect(result.eps15x).toBe(15 * 6.42);
    });

    it('returns null for eps multiples when eps is null', () => {
      const result = computeStockRow(makeRaw({ eps: null }));
      expect(result.eps20x).toBeNull();
      expect(result.eps15x).toBeNull();
    });
  });

  describe('priceEarnings', () => {
    it('computes priceEarnings = price / eps', () => {
      const result = computeStockRow(makeRaw());
      expect(result.priceEarnings).toBeCloseTo(185.5 / 6.42, 4);
    });

    it('returns null when eps is 0', () => {
      const result = computeStockRow(makeRaw({ eps: 0 }));
      expect(result.priceEarnings).toBeNull();
    });

    it('returns null when eps is null', () => {
      const result = computeStockRow(makeRaw({ eps: null }));
      expect(result.priceEarnings).toBeNull();
    });

    it('returns null when price is null', () => {
      const result = computeStockRow(makeRaw({ price: null }));
      expect(result.priceEarnings).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles all null numeric fields', () => {
      const result = computeStockRow(makeRaw({
        price: null,
        changePercent: null,
        divYield: null,
        eps: null,
        totalAssets: null,
        goodwillNet: null,
        intangiblesNet: null,
        liabilitiesTotal: null,
        sharesOutstanding: null,
        dividendPercent: null,
      }));
      expect(result.bookValue).toBeNull();
      expect(result.pBook).toBeNull();
      expect(result.tangibleBookValue).toBeNull();
      expect(result.pTangbook).toBeNull();
      expect(result.eps20x).toBeNull();
      expect(result.eps15x).toBeNull();
      expect(result.priceEarnings).toBeNull();
      expect(result.dividendPercent).toBe(0);
    });

    it('defaults dividendPercent to 0 when null', () => {
      const result = computeStockRow(makeRaw({ dividendPercent: null }));
      expect(result.dividendPercent).toBe(0);
    });

    it('defaults changePercent to null when undefined in raw', () => {
      const raw = makeRaw();
      raw.changePercent = null;
      const result = computeStockRow(raw);
      expect(result.changePercent).toBeNull();
    });
  });
});
