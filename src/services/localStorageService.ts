const TICKER_KEY = 'stox:tickers';
const STARRED_KEY = 'stox:starred';

// In-memory fallback when localStorage is unavailable
let memoryTickerList: string[] = [];
let memoryStarredSet: string[] = [];

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

export function getStarredTickers(): string[] {
  if (!storageAvailable) {
    return [...memoryStarredSet];
  }
  try {
    const raw = localStorage.getItem(STARRED_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function setStarredTickers(starred: string[]): void {
  if (!storageAvailable) {
    memoryStarredSet = [...starred];
    return;
  }
  try {
    localStorage.setItem(STARRED_KEY, JSON.stringify(starred));
  } catch {
    memoryStarredSet = [...starred];
  }
}
