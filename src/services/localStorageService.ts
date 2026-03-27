const TICKER_KEY = 'stox:tickers';
const STARRED_KEY = 'stox:starred';
const LIVE_MODE_KEY = 'stox:liveMode';

// In-memory fallback when localStorage is unavailable
const memoryStore = new Map<string, string[]>();

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

/**
 * Generic getter for a JSON string-array stored under `key`.
 * Falls back to in-memory store when localStorage is unavailable.
 */
function getList(key: string): string[] {
  if (!storageAvailable) {
    return [...(memoryStore.get(key) ?? [])];
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Generic setter for a JSON string-array stored under `key`.
 * Falls back to in-memory store when localStorage is unavailable.
 */
function setList(key: string, items: string[]): void {
  if (!storageAvailable) {
    memoryStore.set(key, [...items]);
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    memoryStore.set(key, [...items]);
  }
}

export function getTickerList(): string[] {
  return getList(TICKER_KEY);
}

export function setTickerList(tickers: string[]): void {
  setList(TICKER_KEY, tickers);
}

export function getStarredTickers(): string[] {
  return getList(STARRED_KEY);
}

export function setStarredTickers(starred: string[]): void {
  setList(STARRED_KEY, starred);
}

export function getLiveMode(): boolean {
  if (!storageAvailable) return memoryStore.get(LIVE_MODE_KEY)?.[0] !== 'false';
  try {
    return localStorage.getItem(LIVE_MODE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setLiveMode(live: boolean): void {
  if (!storageAvailable) {
    memoryStore.set(LIVE_MODE_KEY, [String(live)]);
    return;
  }
  try {
    localStorage.setItem(LIVE_MODE_KEY, String(live));
  } catch {
    memoryStore.set(LIVE_MODE_KEY, [String(live)]);
  }
}
