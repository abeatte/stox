import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTickerList } from './useTickerList';
import { getTickerList, setTickerList } from '../services/localStorageService';

describe('useTickerList', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with empty list when localStorage is empty', () => {
    const { result } = renderHook(() => useTickerList());
    expect(result.current[0]).toEqual([]);
  });

  it('initializes with existing tickers from localStorage', () => {
    setTickerList(['AAPL', 'MSFT']);
    const { result } = renderHook(() => useTickerList());
    expect(result.current[0]).toEqual(['AAPL', 'MSFT']);
  });

  describe('addTicker', () => {
    it('adds a valid ticker and returns null', () => {
      const { result } = renderHook(() => useTickerList());
      let error: string | null;
      act(() => {
        error = result.current[1]('AAPL');
      });
      expect(error!).toBeNull();
      expect(result.current[0]).toEqual(['AAPL']);
      expect(getTickerList()).toEqual(['AAPL']);
    });

    it('uppercases the ticker symbol', () => {
      const { result } = renderHook(() => useTickerList());
      act(() => {
        result.current[1]('aapl');
      });
      expect(result.current[0]).toEqual(['AAPL']);
    });

    it('trims whitespace from input', () => {
      const { result } = renderHook(() => useTickerList());
      act(() => {
        result.current[1]('  MSFT  ');
      });
      expect(result.current[0]).toEqual(['MSFT']);
    });

    it('rejects empty string with validation message', () => {
      const { result } = renderHook(() => useTickerList());
      let error: string | null;
      act(() => {
        error = result.current[1]('');
      });
      expect(error!).toBe('Ticker symbol cannot be empty.');
      expect(result.current[0]).toEqual([]);
    });

    it('rejects whitespace-only string with validation message', () => {
      const { result } = renderHook(() => useTickerList());
      let error: string | null;
      act(() => {
        error = result.current[1]('   ');
      });
      expect(error!).toBe('Ticker symbol cannot be empty.');
      expect(result.current[0]).toEqual([]);
    });

    it('rejects duplicate ticker with validation message', () => {
      setTickerList(['AAPL']);
      const { result } = renderHook(() => useTickerList());
      let error: string | null;
      act(() => {
        error = result.current[1]('AAPL');
      });
      expect(error!).toBe('Ticker already in list.');
      expect(result.current[0]).toEqual(['AAPL']);
    });

    it('persists added ticker to localStorage', () => {
      const { result } = renderHook(() => useTickerList());
      act(() => {
        result.current[1]('GOOG');
      });
      expect(getTickerList()).toEqual(['GOOG']);
    });
  });

  describe('removeTicker', () => {
    it('removes an existing ticker', () => {
      setTickerList(['AAPL', 'MSFT', 'GOOG']);
      const { result } = renderHook(() => useTickerList());
      act(() => {
        result.current[2]('MSFT');
      });
      expect(result.current[0]).toEqual(['AAPL', 'GOOG']);
    });

    it('persists removal to localStorage', () => {
      setTickerList(['AAPL', 'MSFT']);
      const { result } = renderHook(() => useTickerList());
      act(() => {
        result.current[2]('AAPL');
      });
      expect(getTickerList()).toEqual(['MSFT']);
    });

    it('does nothing when removing a non-existent ticker', () => {
      setTickerList(['AAPL']);
      const { result } = renderHook(() => useTickerList());
      act(() => {
        result.current[2]('NOPE');
      });
      expect(result.current[0]).toEqual(['AAPL']);
    });
  });
});
