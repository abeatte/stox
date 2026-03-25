import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStarredTickers } from './useStarredTickers';

describe('useStarredTickers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with empty set when nothing is stored', () => {
    const { result } = renderHook(() => useStarredTickers());
    const [starred] = result.current;
    expect(starred.size).toBe(0);
  });

  it('initializes with stored starred tickers', () => {
    localStorage.setItem('stox:starred', JSON.stringify(['AAPL', 'MSFT']));
    const { result } = renderHook(() => useStarredTickers());
    const [starred] = result.current;
    expect(starred.has('AAPL')).toBe(true);
    expect(starred.has('MSFT')).toBe(true);
    expect(starred.size).toBe(2);
  });

  it('toggleStar adds a ticker when not starred', () => {
    const { result } = renderHook(() => useStarredTickers());
    act(() => {
      result.current[1]('AAPL');
    });
    expect(result.current[0].has('AAPL')).toBe(true);
  });

  it('toggleStar removes a ticker when already starred', () => {
    localStorage.setItem('stox:starred', JSON.stringify(['AAPL']));
    const { result } = renderHook(() => useStarredTickers());
    expect(result.current[0].has('AAPL')).toBe(true);

    act(() => {
      result.current[1]('AAPL');
    });
    expect(result.current[0].has('AAPL')).toBe(false);
  });

  it('persists changes to localStorage', () => {
    const { result } = renderHook(() => useStarredTickers());
    act(() => {
      result.current[1]('GOOG');
    });
    const stored = JSON.parse(localStorage.getItem('stox:starred')!);
    expect(stored).toContain('GOOG');
  });

  it('handles multiple toggles correctly', () => {
    const { result } = renderHook(() => useStarredTickers());
    act(() => {
      result.current[1]('AAPL');
    });
    act(() => {
      result.current[1]('MSFT');
    });
    expect(result.current[0].has('AAPL')).toBe(true);
    expect(result.current[0].has('MSFT')).toBe(true);
    expect(result.current[0].size).toBe(2);

    act(() => {
      result.current[1]('AAPL');
    });
    expect(result.current[0].has('AAPL')).toBe(false);
    expect(result.current[0].has('MSFT')).toBe(true);
    expect(result.current[0].size).toBe(1);
  });
});
