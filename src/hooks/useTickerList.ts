import { useState, useCallback } from 'react';
import { getTickerList, setTickerList } from '../services/localStorageService';

type AddTickerResult = string | null;

export function useTickerList(): [string[], (symbol: string) => AddTickerResult, (symbol: string) => void] {
  const [tickers, setTickers] = useState<string[]>(() => getTickerList());

  const addTicker = useCallback((symbol: string): AddTickerResult => {
    const trimmed = symbol.trim();
    if (trimmed === '') {
      return 'Ticker symbol cannot be empty.';
    }

    const upper = trimmed.toUpperCase();

    // Check current state for duplicates
    const current = getTickerList();
    if (current.includes(upper)) {
      return 'Ticker already in list.';
    }

    const updated = [...current, upper];
    setTickerList(updated);
    setTickers(updated);
    return null;
  }, []);

  const removeTicker = useCallback((symbol: string): void => {
    const current = getTickerList();
    const updated = current.filter((t) => t !== symbol);
    setTickerList(updated);
    setTickers(updated);
  }, []);

  return [tickers, addTicker, removeTicker];
}
