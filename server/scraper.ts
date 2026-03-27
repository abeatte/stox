/**
 * Yahoo Finance scraper — Puppeteer.
 * All page fetches use a shared headless Chrome instance.
 */
import puppeteer, { type Browser, type ElementHandle, type Page, type HTTPResponse } from 'puppeteer';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { metrics } from './metrics.js';

const CACHE_FILE = resolve('server', '.stock-cache.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Type-safe error extraction from catch blocks. */
function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  return new Error(String(err));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CacheEntry {
  data: TickerResult;
  timestamp: number;
}

interface TickerResult {
  ticker: string;
  price: number | null;
  changePercent: number | null;
  date: string;
  sector: string | null;
  industry: string | null;
  divYield: number | null;
  eps: number | null;
  totalAssets: number | null;
  goodwillNet: number | null;
  intangiblesNet: number | null;
  liabilitiesTotal: number | null;
  sharesOutstanding: number | null;
  dividendPercent: number | null;
  bookValue: number | null;
  priceToBook: number | null;
  relatedTickers: string[];
  /** Instrument type from Yahoo Finance (e.g. EQUITY, MUTUALFUND, ETF). */
  quoteType: string | null;
  error?: string;
}

interface BalanceSheetData {
  totalAssets: string | null;
  goodwillNet: string | null;
  intangiblesNet: string | null;
  liabilitiesTotal: string | null;
  sharesOutstanding: string | null;
  relatedTickers: string[];
}

interface ProfileData {
  sector: string | null;
  industry: string | null;
}

interface RealtimePriceData {
  price: number | null;
  prevClose: number | null;
  changePercent: number | null;
}

/** A Yahoo Finance field that may contain a raw numeric value. */
interface YahooField {
  raw?: number;
  fmt?: string;
  longFmt?: string;
}

/** Loosely-typed sub-object from Yahoo's quoteSummary response. */
type YahooSection = Record<string, YahooField | string | number | null | undefined>;

interface QuoteSummaryResult {
  financialData?: YahooSection;
  summaryDetail?: YahooSection;
  defaultKeyStatistics?: YahooSection;
  assetProfile?: YahooSection;
  price?: YahooSection;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

function loadCache(): void {
  try {
    const raw = readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    let loaded = 0;

    const entries: [string, CacheEntry][] = Array.isArray(parsed)
      ? parsed
      : Object.entries(parsed) as [string, CacheEntry][];

    for (const [key, value] of entries) {
      if (Date.now() - value.timestamp < CACHE_TTL) {
        cache.set(key, value);
        loaded++;
      }
    }
    const evicted = entries.length - loaded;
    metrics.log(`Loaded ${loaded} cached tickers from disk` + (evicted > 0 ? ` (${evicted} evicted)` : ''));
    if (evicted > 0) saveCache();
  } catch {
    // No cache file or invalid — start fresh
  }
}

export function saveCache(): void {
  try {
    const obj = Object.fromEntries(cache.entries());
    writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2) + '\n');
  } catch (err) {
    metrics.log(`Failed to save cache: ${toError(err).message}`);
  }
}

loadCache();

// ---------------------------------------------------------------------------
// Throttle
// ---------------------------------------------------------------------------

let lastRequest = 0;
const REQUEST_GAP = 2000;

async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = REQUEST_GAP - (now - lastRequest);
  if (wait > 0) await new Promise<void>((r) => setTimeout(r, wait));
  lastRequest = Date.now();
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

// ---------------------------------------------------------------------------
// Shared browser instance
// ---------------------------------------------------------------------------

let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }).catch((err: Error) => {
      browserPromise = null;
      throw new Error(`Failed to launch Chrome: ${err.message}`);
    });
  }
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

export async function warmUp(): Promise<void> {
  try {
    await getBrowser();
    metrics.log('Chrome browser ready');
  } catch (err) {
    metrics.log(`Chrome not available: ${toError(err).message}`);
  }
}

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------

interface PageHandle {
  page: Page;
  cleanup: () => Promise<void>;
}

/**
 * Open a new Puppeteer page with standard UA/viewport and abort-signal wiring.
 */
async function openPage(signal?: AbortSignal): Promise<PageHandle> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: 1280, height: 800 });

  const onAbort = (): void => { page.close().catch(() => {}); };
  if (signal?.aborted) { await page.close(); throw new Error('Aborted'); }
  signal?.addEventListener('abort', onAbort, { once: true });

  const cleanup = async (): Promise<void> => {
    signal?.removeEventListener('abort', onAbort);
    await page.close().catch(() => {});
  };

  return { page, cleanup };
}

// ---------------------------------------------------------------------------
// Quote page — Puppeteer
// ---------------------------------------------------------------------------

function parseQuoteSummaryHtml(ticker: string, html: string): QuoteSummaryResult {
  const regex = /<script[^>]*data-url="[^"]*quoteSummary[^"]*"[^>]*>([\s\S]*?)<\/script>/;
  const match = html.match(regex);
  if (!match) throw new Error(`Could not find quoteSummary data for ${ticker}`);

  const wrapper = JSON.parse(match[1]);
  const body = JSON.parse(wrapper.body);
  const result = body?.quoteSummary?.result?.[0] as QuoteSummaryResult | undefined;
  if (!result) throw new Error(`No quoteSummary result for ${ticker}`);
  return result;
}

async function fetchQuoteSummary(ticker: string, signal?: AbortSignal): Promise<QuoteSummaryResult> {
  const { page, cleanup } = await openPage(signal);

  let summaryResolve: (value: QuoteSummaryResult) => void;
  const summaryPromise = new Promise<QuoteSummaryResult>((res) => { summaryResolve = res; });

  page.on('response', async (resp: HTTPResponse) => {
    try {
      if (resp.url().includes('quoteSummary')) {
        const json = await resp.json();
        const result = json?.quoteSummary?.result?.[0] as QuoteSummaryResult | undefined;
        if (result) summaryResolve(result);
      }
    } catch { /* ignore non-JSON responses */ }
  });

  try {
    await throttle();
    await page.goto(`https://finance.yahoo.com/quote/${ticker}/`, {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });

    const html = await page.content();
    try {
      return parseQuoteSummaryHtml(ticker, html);
    } catch { /* not embedded — wait for XHR */ }

    return await Promise.race([
      summaryPromise,
      new Promise<QuoteSummaryResult>((_resolve, reject) => setTimeout(() => reject(new Error(
        `Timed out waiting for quoteSummary XHR for ${ticker}`
      )), 15000)),
    ]);
  } finally {
    await cleanup();
  }
}

// ---------------------------------------------------------------------------
// Profile page — sector/industry
// ---------------------------------------------------------------------------

async function fetchProfile(ticker: string, signal?: AbortSignal): Promise<ProfileData | null> {
  let page: Page, cleanup: () => Promise<void>;
  try {
    ({ page, cleanup } = await openPage(signal));
  } catch {
    return null;
  }

  try {
    await throttle();
    await page.goto(`https://finance.yahoo.com/quote/${ticker}/profile/`, {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });

    const html = await page.content();
    try {
      const result = parseQuoteSummaryHtml(ticker, html);
      const ap = result?.assetProfile;
      if (ap) return { sector: toStringVal(ap.sector), industry: toStringVal(ap.industry) };
    } catch { /* not in HTML */ }

    const profileData = await page.evaluate(() => {
      const getText = (label: string): string | null => {
        const spans = [...document.querySelectorAll('span, dt, th')];
        for (const el of spans) {
          if (el.textContent?.trim() === label) {
            const next = el.nextElementSibling;
            if (next) return next.textContent?.trim() ?? null;
          }
        }
        return null;
      };
      return { sector: getText('Sector') || getText('Sector(s)'), industry: getText('Industry') };
    });

    if (profileData.sector || profileData.industry) return profileData;
    return null;
  } catch {
    metrics.log(`${ticker} profile fetch failed`);
    return null;
  } finally {
    await cleanup();
  }
}

// ---------------------------------------------------------------------------
// Balance sheet page
// ---------------------------------------------------------------------------

async function scrapeBalanceSheet(ticker: string, signal?: AbortSignal): Promise<BalanceSheetData | null> {
  let page: Page, cleanup: () => Promise<void>;
  try {
    ({ page, cleanup } = await openPage(signal));
  } catch {
    return null;
  }

  try {
    await throttle();
    await page.goto(`https://finance.yahoo.com/quote/${ticker}/balance-sheet/`, {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
    await new Promise<void>((r) => setTimeout(r, 5000));

    try {
      // Find and click the "Expand All" button
      const expandAllBtn = await page.evaluateHandle(() => {
        const buttons = [...document.querySelectorAll('button')];
        return buttons.find((b) => b.textContent?.trim() === 'Expand All') ?? null;
      });
      const element = expandAllBtn.asElement();
      if (element) {
        await (element as ElementHandle<HTMLButtonElement>).click();
        await new Promise<void>((r) => setTimeout(r, 3000));
      }
      await expandAllBtn.dispose();
    } catch { /* no expand button */ }

    const data: BalanceSheetData = await page.evaluate(() => {
      const lines = document.body.innerText.split('\n').map((l: string) => l.trim());
      const getValue = (label: string): string | null => {
        for (let i = 0; i < lines.length; i++) {
          if (lines[i] === label && i + 1 < lines.length) return lines[i + 1];
        }
        return null;
      };

      const relatedTickers: string[] = [];
      const sections = document.querySelectorAll('section');
      for (const section of sections) {
        const heading = section.querySelector('h2, h3');
        if (heading && /related\s+tickers/i.test(heading.textContent ?? '')) {
          const seen = new Set<string>();
          for (const a of section.querySelectorAll('a[href*="/quote/"]')) {
            const match = a.getAttribute('href')?.match(/\/quote\/([A-Z0-9.\-]+)/);
            if (match && !seen.has(match[1])) {
              seen.add(match[1]);
              relatedTickers.push(match[1]);
            }
          }
          break;
        }
      }

      return {
        totalAssets: getValue('Total Assets'),
        goodwillNet: getValue('Goodwill'),
        intangiblesNet: getValue('Other Intangible Assets'),
        liabilitiesTotal: getValue('Total Liabilities Net Minority Interest'),
        sharesOutstanding: getValue('Share Issued') || getValue('Ordinary Shares Number'),
        relatedTickers,
      };
    });
    return data;
  } catch {
    metrics.log(`${ticker} balance sheet scrape failed`);
    return null;
  } finally {
    await cleanup();
  }
}

// ---------------------------------------------------------------------------
// Live price scrape
// ---------------------------------------------------------------------------

async function getRealtimePrice(ticker: string, signal?: AbortSignal): Promise<RealtimePriceData> {
  const { page, cleanup } = await openPage(signal);

  try {
    await throttle();
    await page.goto(`https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/`, {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });

    await page.waitForSelector('section[data-testid="price-statistic"]', { timeout: 10000 }).catch(() => {});
    await new Promise<void>((r) => setTimeout(r, 2000));

    interface ScrapedPriceData {
      price: string | null;
      changePercent: number | null;
      prevClose: string | null;
    }

    const priceData: ScrapedPriceData = await page.evaluate(() => {
      const section = document.querySelector('section[data-testid="price-statistic"]');
      if (!section) return { price: null, changePercent: null, prevClose: null };

      const priceEl = section.querySelector('[data-testid="qsp-price"]');
      const changePercentEl = section.querySelector('[data-testid="qsp-price-change-percent"]');

      const price = priceEl?.textContent?.trim()
        || section.querySelector('.price')?.textContent?.trim()
        || null;

      let changePercent: number | null = null;
      const cpText = (changePercentEl || section.querySelector('.priceChangePercent'))?.textContent?.trim();
      if (cpText) {
        const cleaned = cpText.replace(/[()%]/g, '');
        const n = parseFloat(cleaned);
        if (!isNaN(n)) changePercent = n;
      }

      const findValue = (label: string): string | null => {
        for (const li of document.querySelectorAll('li')) {
          const span = li.querySelector('span');
          if (span && span.textContent?.trim() === label) {
            const val = li.querySelector('fin-streamer, span:last-child');
            if (val && val !== span) return val.textContent?.trim() ?? null;
          }
        }
        return null;
      };
      const prevClose = findValue('Previous Close');

      return { price, changePercent, prevClose };
    });

    const price = priceData.price != null ? parseFloat(priceData.price.replace(/,/g, '')) : null;
    const prevClose = priceData.prevClose != null ? parseFloat(priceData.prevClose.replace(/,/g, '')) : null;
    const changePercent = priceData.changePercent;

    if (price == null || isNaN(price)) {
      throw new Error(`Could not extract live price for ${ticker}`);
    }

    return { price, prevClose: prevClose != null && !isNaN(prevClose) ? prevClose : null, changePercent };
  } finally {
    await cleanup();
  }
}

// ---------------------------------------------------------------------------
// Number parsing
// ---------------------------------------------------------------------------

function rawVal(field: YahooField | string | number | null | undefined): number | null {
  if (field == null) return null;
  if (typeof field === 'number') return field;
  if (typeof field === 'string') return null;
  if ('raw' in field && typeof field.raw === 'number') return field.raw;
  return null;
}

/** Extract a string value from a YahooSection field. */
function toStringVal(field: YahooField | string | number | null | undefined): string | null {
  if (typeof field === 'string') return field;
  return null;
}

function parseNum(raw: string | null): number | null {
  if (!raw || raw === '--' || raw === 'N/A') return null;
  let str = raw.trim().replace(/[$,\s]/g, '');
  const neg = str.startsWith('(') && str.endsWith(')');
  if (neg) str = str.slice(1, -1);
  const n = parseFloat(str);
  if (isNaN(n)) return null;
  return neg ? -n : n;
}

// ---------------------------------------------------------------------------
// In-flight deduplication with ref-counted abort
// ---------------------------------------------------------------------------

interface InflightEntry {
  promise: Promise<TickerResult>;
  abort: AbortController;
  refCount: number;
  settled: boolean;
  graceTimer: ReturnType<typeof setTimeout> | null;
}

const inflight = new Map<string, InflightEntry>();

// ---------------------------------------------------------------------------
// Concurrency limiter — at most MAX_CONCURRENT_SCRAPES Puppeteer scrapes at once
// ---------------------------------------------------------------------------

const MAX_CONCURRENT_SCRAPES = 3;
let activeScrapes = 0;
const scrapeQueue: Array<() => void> = [];

/** Wait until a concurrency slot is available. */
function acquireScrapeSlot(): Promise<void> {
  if (activeScrapes < MAX_CONCURRENT_SCRAPES) {
    activeScrapes++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    scrapeQueue.push(() => { activeScrapes++; resolve(); });
  });
}

/** Release a concurrency slot and wake the next waiter. */
function releaseScrapeSlot(): void {
  activeScrapes--;
  const next = scrapeQueue.shift();
  if (next) next();
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export async function refreshStock(ticker: string): Promise<TickerResult> {
  const symbol = ticker.toUpperCase().trim();
  cache.delete(symbol);
  const existing = inflight.get(symbol);
  if (existing) {
    if (existing.graceTimer) clearTimeout(existing.graceTimer);
    existing.abort.abort();
    inflight.delete(symbol);
  }
  return fetchTickerData(symbol);
}

/**
 * Returns true when a scrape result has all the fields that Yahoo Finance
 * should always provide for a real stock.  When any of these are missing
 * the scrape likely hit a consent wall or a partial page load and the
 * result should NOT be cached so the next request retries.
 */
/** Quote types that don't have sector/industry. */
const NO_SECTOR_TYPES = new Set(['MUTUALFUND', 'ETF', 'INDEX', 'CURRENCY', 'CRYPTOCURRENCY', 'FUTURE']);

function isCompleteResult(result: TickerResult): boolean {
  if (result.price == null) return false;

  // Mutual funds, ETFs, etc. legitimately lack sector/industry (and sometimes relatedTickers)
  if (result.quoteType && NO_SECTOR_TYPES.has(result.quoteType)) return true;

  return (
    result.sector != null &&
    result.industry != null &&
    result.relatedTickers.length > 0
  );
}

/**
 * Fetch ticker data with deduplication. Multiple callers for the same ticker
 * share one scrape. The scrape aborts when all callers disconnect.
 *
 * @param requestSignal - The HTTP request's abort signal. When the client
 *   disconnects this fires, decrementing the ref count. When it hits 0
 *   the underlying scrape is aborted.
 */
export async function fetchTickerData(ticker: string, requestSignal?: AbortSignal): Promise<TickerResult> {
  const symbol = ticker.toUpperCase().trim();

  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL && isCompleteResult(cached.data)) {
    return cached.data;
  }

  let entry = inflight.get(symbol);

  // Only piggyback if the scrape is still running
  if (entry && !entry.settled) {
    entry.refCount++;
    if (entry.graceTimer) { clearTimeout(entry.graceTimer); entry.graceTimer = null; }
  } else {
    // Start a new scrape
    const abort = new AbortController();
    const promise = scrapeTickerData(symbol, abort.signal);
    entry = { promise, abort, refCount: 1, settled: false, graceTimer: null };
    inflight.set(symbol, entry);

    // When the scrape settles (success or failure), mark it and clean up
    const e = entry;
    promise.then(
      () => { e.settled = true; if (inflight.get(symbol) === e) inflight.delete(symbol); },
      () => { e.settled = true; if (inflight.get(symbol) === e) inflight.delete(symbol); },
    );
  }

  const currentEntry = entry;

  // When this request disconnects, decrement. Grace period before aborting.
  let disconnected = false;
  const onDisconnect = (): void => {
    if (disconnected) return;
    disconnected = true;
    currentEntry.refCount--;
    if (currentEntry.refCount <= 0 && !currentEntry.settled && inflight.get(symbol) === currentEntry) {
      currentEntry.graceTimer = setTimeout(() => {
        if (currentEntry.refCount <= 0 && !currentEntry.settled && inflight.get(symbol) === currentEntry) {
          currentEntry.abort.abort();
          inflight.delete(symbol);
          metrics.log(`${symbol} aborted — no clients after grace period`);
        }
      }, 5000);
    }
  };

  if (requestSignal) {
    if (requestSignal.aborted) { onDisconnect(); throw new Error('Aborted'); }
    requestSignal.addEventListener('abort', onDisconnect, { once: true });
  }

  try {
    return await currentEntry.promise;
  } finally {
    if (requestSignal) requestSignal.removeEventListener('abort', onDisconnect);
    if (!disconnected) {
      currentEntry.refCount--;
    }
  }
}

/** The actual scrape — aborts when its signal fires. */
async function scrapeTickerData(symbol: string, signal: AbortSignal): Promise<TickerResult> {

  await acquireScrapeSlot();
  if (signal.aborted) { releaseScrapeSlot(); throw new Error('Aborted'); }

  metrics.startProcess(symbol);

  try {
    // 1. Quote summary (EPS, dividend, book value, etc.)
    metrics.updateStage(symbol, 0, 'quote summary');
    const summary = await fetchQuoteSummary(symbol, signal);
    metrics.updateStage(symbol, 1, 'quote summary ✓');
    const fd = summary.financialData ?? {};
    const sd = summary.summaryDetail ?? {};
    const ks = summary.defaultKeyStatistics ?? {};
    const ap = summary.assetProfile ?? {};

    const quoteType = toStringVal(summary.price?.quoteType);

    let price = rawVal(fd.currentPrice) ?? rawVal(summary.price?.regularMarketPrice);
    let prevClose = rawVal(summary.price?.regularMarketPreviousClose);

    // 2. Real-time price (quote summary HTML is CDN-cached and often stale)
    metrics.updateStage(symbol, 1, 'real-time price');
    const rtData = await getRealtimePrice(symbol, signal);
    metrics.updateStage(symbol, 2, 'real-time price ✓');
    price = rtData.price;
    prevClose = rtData.prevClose ?? prevClose;

    const changePercent = rtData.changePercent ?? (
      (price != null && prevClose != null && prevClose !== 0)
        ? Math.round(((price - prevClose) / prevClose) * 10000) / 100
        : null
    );
    const eps = rawVal(ks.trailingEps);
    const divRate = rawVal(sd.dividendRate);
    const divYieldRaw = rawVal(sd.dividendYield);
    const divYieldPct = divYieldRaw != null ? Math.round(divYieldRaw * 10000) / 100 : null;
    const bookValue = rawVal(ks.bookValue);
    const priceToBook = rawVal(ks.priceToBook);
    const sharesOutstandingQuote = rawVal(ks.sharesOutstanding);

    // 3. Balance sheet (goodwill, intangibles, full assets/liabilities)
    metrics.updateStage(symbol, 2, 'balance sheet');
    const bsData = await scrapeBalanceSheet(symbol, signal);
    metrics.updateStage(symbol, 3, 'balance sheet ✓');

    const K = 1000; // Yahoo reports balance sheet values in thousands
    const bsTotalAssets = bsData ? parseNum(bsData.totalAssets) : null;
    const bsGoodwill = bsData ? parseNum(bsData.goodwillNet) : null;
    const bsIntangibles = bsData ? parseNum(bsData.intangiblesNet) : null;
    const bsLiabilities = bsData ? parseNum(bsData.liabilitiesTotal) : null;
    const bsShares = bsData ? parseNum(bsData.sharesOutstanding) : null;

    const totalDebt = rawVal(fd.totalDebt);
    const totalEquity = bookValue != null && sharesOutstandingQuote != null
      ? bookValue * sharesOutstandingQuote : null;

    const relatedTickers = bsData?.relatedTickers?.filter((t) => t !== symbol) ?? [];

    // 4. Profile (sector/industry)
    metrics.updateStage(symbol, 3, 'profile');
    const profile = await fetchProfile(symbol, signal);
    metrics.updateStage(symbol, 4, 'complete');
    const sector = profile?.sector || toStringVal(ap.sector);
    const industry = profile?.industry || toStringVal(ap.industry);

    const result: TickerResult = {
      ticker: symbol,
      price,
      changePercent,
      date: new Date().toISOString().split('T')[0],
      sector,
      industry,
      divYield: divRate,
      eps,
      totalAssets: bsTotalAssets != null ? bsTotalAssets * K
        : (totalEquity != null && totalDebt != null ? totalEquity + totalDebt : null),
      goodwillNet: bsGoodwill != null ? bsGoodwill * K : null,
      intangiblesNet: bsIntangibles != null ? bsIntangibles * K : null,
      liabilitiesTotal: bsLiabilities != null ? bsLiabilities * K : totalDebt,
      sharesOutstanding: bsShares != null ? bsShares * K : sharesOutstandingQuote,
      dividendPercent: divYieldPct,
      bookValue,
      priceToBook,
      relatedTickers,
      quoteType,
    };

    cache.set(symbol, { data: result, timestamp: Date.now() });
    if (isCompleteResult(result)) {
      saveCache();
    } else {
      metrics.log(`${symbol} incomplete scrape — not persisting to disk`);
    }
    return result;
  } finally {
    releaseScrapeSlot();
    if (signal.aborted) {
      metrics.cancelProcess(symbol);
    } else {
      metrics.endProcess(symbol);
    }
  }
}
