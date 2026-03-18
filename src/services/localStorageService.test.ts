import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getTickerList,
  setTickerList,
  getInterestMap,
  setInterestMap,
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

  describe('getInterestMap / setInterestMap', () => {
    it('returns empty object when nothing is stored', () => {
      expect(getInterestMap()).toEqual({});
    });

    it('round-trips an interest map', () => {
      const map = { AAPL: 'BUY', MSFT: 'WATCH' };
      setInterestMap(map);
      expect(getInterestMap()).toEqual(map);
    });

    it('returns empty object for corrupted JSON', () => {
      localStorage.setItem('stox:interest', 'not json');
      expect(getInterestMap()).toEqual({});
    });

    it('returns empty object when stored value is an array', () => {
      localStorage.setItem('stox:interest', '["a","b"]');
      expect(getInterestMap()).toEqual({});
    });

    it('overwrites previous interest map', () => {
      setInterestMap({ AAPL: 'BUY' });
      setInterestMap({ GOOG: 'SELL' });
      expect(getInterestMap()).toEqual({ GOOG: 'SELL' });
    });
  });
});
