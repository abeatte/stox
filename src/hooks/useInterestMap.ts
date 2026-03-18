import { useState, useCallback } from 'react';
import { getInterestMap, setInterestMap } from '../services/localStorageService';

export function useInterestMap(): [Record<string, string>, (ticker: string, value: string) => void] {
  const [interestMap, setInterestMapState] = useState<Record<string, string>>(() => getInterestMap());

  const setInterest = useCallback((ticker: string, value: string): void => {
    const updated = { ...getInterestMap(), [ticker]: value };
    setInterestMap(updated);
    setInterestMapState(updated);
  }, []);

  return [interestMap, setInterest];
}
