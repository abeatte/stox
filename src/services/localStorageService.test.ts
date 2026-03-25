import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTickerList,
  setTickerList,
  getStarredTickers,
  setStarredTickers,
} from './localStorageService';

describe('localStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getTickerList / setTickerList', () => {
    it('returns empty array when nothing is stored', () => {
      expect(getTickerList()).toEqual([]);
    });

    it('round-trips a ticker list', () => {
      const tickers = ['AAPL', 'MSFT', 'GOOG'];
      setTickerList(tickers);
      expect(getTickerList()).toEqual(tickers);
    });

    it('returns empty array for corrupted JSON', () => {
      localStorage.setItem('stox:tickers', '{not valid json');
      expect(getTickerList()).toEqual([]);
    });

    it('returns empty array when stored value is not an array', () => {
      localStorage.setItem('stox:tickers', '"hello"');
      expect(getTickerList()).toEqual([]);
    });

    it('overwrites previous ticker list', () => {
      setTickerList(['AAPL']);
      setTickerList(['MSFT', 'GOOG']);
      expect(getTickerList()).toEqual(['MSFT', 'GOOG']);
    });
  });

  describe('getStarredTickers / setStarredTickers', () => {
    it('returns empty array when nothing is stored', () => {
      expect(getStarredTickers()).toEqual([]);
    });

    it('round-trips a starred list', () => {
      const starred = ['AAPL', 'MSFT'];
      setStarredTickers(starred);
      expect(getStarredTickers()).toEqual(starred);
    });

    it('returns empty array for corrupted JSON', () => {
      localStorage.setItem('stox:starred', '{not valid json');
      expect(getStarredTickers()).toEqual([]);
    });

    it('returns empty array when stored value is not an array', () => {
      localStorage.setItem('stox:starred', '"hello"');
      expect(getStarredTickers()).toEqual([]);
    });

    it('overwrites previous starred list', () => {
      setStarredTickers(['AAPL']);
      setStarredTickers(['MSFT', 'GOOG']);
      expect(getStarredTickers()).toEqual(['MSFT', 'GOOG']);
    });
  });
});
