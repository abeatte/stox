import { useState, useCallback } from 'react';
import { getTickerList, setTickerList } from '../services/localStorageService';

type AddTickerResult = string | null;

export function useTickerList(): [string[], (symbol: string) => AddTickerResult, (symbol: string) => void] {
  const [tickers, setTickers] = useState<string[]>(() => getTickerList());

  const addTicker = useCallback((symbol: string): AddTickerResult => {
    const symbols = symbol.split(',').map((s) => s.trim()).filter((s) => s !== '');
    if (symbols.length === 0) {
      return 'Ticker symbol cannot be empty.';
    }

    const current = getTickerList();
    const skipped: string[] = [];
    const toAdd: string[] = [];

    for (const s of symbols) {
      const upper = s.toUpperCase();
      if (current.includes(upper) || toAdd.includes(upper)) {
        skipped.push(upper);
      } else {
        toAdd.push(upper);
      }
    }

    if (toAdd.length > 0) {
      const updated = [...current, ...toAdd];
      setTickerList(updated);
      setTickers(updated);
    }

    if (skipped.length > 0 && toAdd.length === 0) {
      return `Already in list: ${skipped.join(', ')}`;
    }
    if (skipped.length > 0) {
      return `Added ${toAdd.length}, skipped duplicates: ${skipped.join(', ')}`;
    }
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
