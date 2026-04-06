import type { SortCriterion } from '../types';

const TICKER_KEY = 'stox:tickers';
const STARRED_KEY = 'stox:starred';
const LIVE_MODE_KEY = 'stox:liveMode';
const SORT_CRITERIA_KEY = 'stox:sortCriteria';

const memoryStore = new Map<string, string>();

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

function getList(key: string): string[] {
  if (!storageAvailable) {
    const raw = memoryStore.get(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
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

function setList(key: string, items: string[]): void {
  const serialized = JSON.stringify(items);
  if (!storageAvailable) {
    memoryStore.set(key, serialized);
    return;
  }
  try {
    localStorage.setItem(key, serialized);
  } catch {
    memoryStore.set(key, serialized);
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

export function getSortCriteria(): SortCriterion[] {
  if (!storageAvailable) {
    const raw = memoryStore.get(SORT_CRITERIA_KEY);
    return raw ? (JSON.parse(raw) as SortCriterion[]) : [];
  }
  try {
    const raw = localStorage.getItem(SORT_CRITERIA_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SortCriterion[];
  } catch {
    return [];
  }
}

export function setSortCriteria(criteria: SortCriterion[]): void {
  const serialized = JSON.stringify(criteria);
  if (!storageAvailable) {
    memoryStore.set(SORT_CRITERIA_KEY, serialized);
    return;
  }
  try {
    localStorage.setItem(SORT_CRITERIA_KEY, serialized);
  } catch {
    memoryStore.set(SORT_CRITERIA_KEY, serialized);
  }
}

export function getLiveMode(): boolean {
  if (!storageAvailable) return memoryStore.get(LIVE_MODE_KEY) !== 'false';
  try {
    return localStorage.getItem(LIVE_MODE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setLiveMode(live: boolean): void {
  const value = String(live);
  if (!storageAvailable) {
    memoryStore.set(LIVE_MODE_KEY, value);
    return;
  }
  try {
    localStorage.setItem(LIVE_MODE_KEY, value);
  } catch {
    memoryStore.set(LIVE_MODE_KEY, value);
  }
}
