const TICKER_KEY = 'stox:tickers';
const INTEREST_KEY = 'stox:interest';

// In-memory fallback when localStorage is unavailable
let memoryTickerList: string[] = [];
let memoryInterestMap: Record<string, string> = {};

function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__stox_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const storageAvailable = isLocalStorageAvailable();

export function getTickerList(): string[] {
  if (!storageAvailable) {
    return [...memoryTickerList];
  }
  try {
    const raw = localStorage.getItem(TICKER_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function setTickerList(tickers: string[]): void {
  if (!storageAvailable) {
    memoryTickerList = [...tickers];
    return;
  }
  try {
    localStorage.setItem(TICKER_KEY, JSON.stringify(tickers));
  } catch {
    memoryTickerList = [...tickers];
  }
}

export function getInterestMap(): Record<string, string> {
  if (!storageAvailable) {
    return { ...memoryInterestMap };
  }
  try {
    const raw = localStorage.getItem(INTEREST_KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

export function setInterestMap(map: Record<string, string>): void {
  if (!storageAvailable) {
    memoryInterestMap = { ...map };
    return;
  }
  try {
    localStorage.setItem(INTEREST_KEY, JSON.stringify(map));
  } catch {
    memoryInterestMap = { ...map };
  }
}
