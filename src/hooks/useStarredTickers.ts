import { useState, useCallback } from 'react';
import { getStarredTickers, setStarredTickers } from '../services/localStorageService';

export function useStarredTickers(): [Set<string>, (ticker: string) => void] {
  const [starred, setStarred] = useState<Set<string>>(() => new Set(getStarredTickers()));

  const toggleStar = useCallback((ticker: string) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) {
        next.delete(ticker);
      } else {
        next.add(ticker);
      }
      setStarredTickers([...next]);
      return next;
    });
  }, []);

  return [starred, toggleStar];
}
