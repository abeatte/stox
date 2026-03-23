/**
 * Yahoo Finance scraper.
 * - Uses plain HTTP fetch for the quote page (fast, no browser needed)
 * - Uses Puppeteer for the balance sheet page (requires JS execution)
 */
import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = resolve(__dirname, '.stock-cache.json');

// Cache: ticker -> { data, timestamp }
const cache = new Map();
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

// Load cache from disk on startup
function loadCache() {
  try {
    const raw = readFileSync(CACHE_FILE, 'utf-8');
    const entries = JSON.parse(raw);
    let loaded = 0;
    for (const [key, value] of entries) {
      if (Date.now() - value.timestamp < CACHE_TTL) {
        cache.set(key, value);
        loaded++;
      }
    }
    console.log(`[scraper] Loaded ${loaded} cached tickers from disk`);
  } catch {
    // No cache file or invalid — start fresh
  }
}

export function saveCache() {
  try {
    const entries = [...cache.entries()];
    writeFileSync(CACHE_FILE, JSON.stringify(entries));
  } catch (err) {
    console.warn('[scraper] Failed to save cache:', err.message);
  }
}

loadCache();

// Throttle between requests
let lastRequest = 0;
const REQUEST_GAP = 2000;

async function throttle() {
  const now = Date.now();
  const wait = REQUEST_GAP - (now - lastRequest);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

// ---------------------------------------------------------------------------
// Shared browser instance for Puppeteer
// ---------------------------------------------------------------------------
let browserPromise = null;

function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }).catch((err) => {
      browserPromise = null;
      throw new Error(`Failed to launch Chrome: ${err.message}`);
    });
  }
  return browserPromise;
}

export async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

export async function warmUp() {
  try {
    await getBrowser();
    console.log('[scraper] Chrome browser ready');
  } catch (err) {
    console.warn('[scraper] Chrome not available, balance sheet data will be limited:', err.message);
  }
}


// ---------------------------------------------------------------------------
// Quote page — plain HTTP fetch (fast, no browser)
// ---------------------------------------------------------------------------

function parseQuoteSummaryHtml(ticker, html) {
  const regex = /<script[^>]*data-url="[^"]*quoteSummary[^"]*"[^>]*>([\s\S]*?)<\/script>/;
  const match = html.match(regex);
  if (!match) {
    throw new Error(`Could not find quoteSummary data in page for ${ticker}`);
  }

  const wrapper = JSON.parse(match[1]);
  const body = JSON.parse(wrapper.body);
  const result = body?.quoteSummary?.result?.[0];
  if (!result) {
    throw new Error(`No quoteSummary result for ${ticker}`);
  }
  return result;
}

async function fetchQuoteSummaryHttp(ticker, signal) {
  await throttle();
  const url = `https://finance.yahoo.com/quote/${ticker}/`;
  console.log(`[${ticker}] Fetching quote page (HTTP)...`);
  const resp = await fetch(url, { headers: { 'User-Agent': UA }, signal });

  if (!resp.ok) {
    return null; // signal caller to try Puppeteer fallback
  }

  const html = await resp.text();
  console.log(`[${ticker}] Quote page received (${html.length} bytes), parsing embedded JSON...`);
  return parseQuoteSummaryHtml(ticker, html);
}

async function fetchQuoteSummaryPuppeteer(ticker, signal) {
  let browser;
  try {
    browser = await getBrowser();
  } catch {
    throw new Error(`Chrome not available — cannot fetch quote for ${ticker}`);
  }

  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: 1280, height: 800 });

  const onAbort = () => {
    page.close().catch(() => {});
  };
  if (signal?.aborted) { await page.close(); throw new Error('Aborted'); }
  signal?.addEventListener('abort', onAbort, { once: true });

  // Intercept the quoteSummary XHR that Yahoo's client-side JS fires
  let summaryResolve;
  const summaryPromise = new Promise((res) => { summaryResolve = res; });

  page.on('response', async (resp) => {
    try {
      if (resp.url().includes('quoteSummary')) {
        const json = await resp.json();
        const result = json?.quoteSummary?.result?.[0];
        if (result) summaryResolve(result);
      }
    } catch { /* ignore non-JSON responses */ }
  });

  try {
    await throttle();
    const url = `https://finance.yahoo.com/quote/${ticker}/`;
    console.log(`[${ticker}] Fetching quote page (Puppeteer fallback)...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Also try parsing the HTML in case the embedded JSON is present
    const html = await page.content();
    try {
      const fromHtml = parseQuoteSummaryHtml(ticker, html);
      console.log(`[${ticker}] Found quoteSummary in Puppeteer HTML`);
      return fromHtml;
    } catch {
      // Not in HTML — wait for the XHR response
      console.log(`[${ticker}] No embedded JSON, waiting for quoteSummary XHR...`);
    }

    // Wait up to 15s for the XHR to come through
    const result = await Promise.race([
      summaryPromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error(
        `Timed out waiting for quoteSummary XHR for ${ticker}`
      )), 15000)),
    ]);
    console.log(`[${ticker}] Got quoteSummary from XHR intercept`);
    return result;
  } finally {
    signal?.removeEventListener('abort', onAbort);
    await page.close().catch(() => {});
  }
}

async function fetchQuoteSummary(ticker, signal) {
  const result = await fetchQuoteSummaryHttp(ticker, signal);
  if (result) {
    console.log(`[${ticker}] Quote summary parsed — modules: ${Object.keys(result).length}`);
    return result;
  }

  console.log(`[${ticker}] HTTP fetch failed (likely bot-blocked), trying Puppeteer...`);
  const fallback = await fetchQuoteSummaryPuppeteer(ticker, signal);
  console.log(`[${ticker}] Quote summary parsed via Puppeteer — modules: ${Object.keys(fallback).length}`);
  return fallback;
}

// ---------------------------------------------------------------------------
// Balance sheet page — Puppeteer (needs JS execution)
// ---------------------------------------------------------------------------

async function scrapeBalanceSheet(ticker, signal) {
  let browser;
  try {
    browser = await getBrowser();
  } catch {
    console.log(`[${ticker}] Chrome not available — skipping balance sheet`);
    return null;
  }

  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: 1280, height: 800 });

  // Abort the page if the client disconnects
  const onAbort = () => {
    console.log(`[${ticker}] Abort signal received, closing page`);
    page.close().catch(() => {});
  };
  if (signal?.aborted) { await page.close(); return null; }
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    await throttle();
    console.log(`[${ticker}] Loading balance sheet page (Puppeteer)...`);
    await page.goto(`https://finance.yahoo.com/quote/${ticker}/balance-sheet/`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    console.log(`[${ticker}] Balance sheet page loaded, waiting for render...`);
    await new Promise((r) => setTimeout(r, 5000));

    // Click "Expand All" to reveal sub-rows like Goodwill
    try {
      const expandBtn = await page.evaluateHandle(() => {
        const buttons = [...document.querySelectorAll('button')];
        return buttons.find((b) => b.textContent.trim() === 'Expand All');
      });
      if (expandBtn) {
        console.log(`[${ticker}] Clicking "Expand All"...`);
        await expandBtn.click();
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch { /* no expand button */ }

    console.log(`[${ticker}] Extracting balance sheet values...`);
    const data = await page.evaluate(() => {
      const lines = document.body.innerText.split('\n').map((l) => l.trim());
      const getValue = (label) => {
        for (let i = 0; i < lines.length; i++) {
          if (lines[i] === label && i + 1 < lines.length) {
            return lines[i + 1];
          }
        }
        return null;
      };
      return {
        totalAssets: getValue('Total Assets'),
        goodwillNet: getValue('Goodwill'),
        intangiblesNet: getValue('Other Intangible Assets'),
        liabilitiesTotal: getValue('Total Liabilities Net Minority Interest'),
        sharesOutstanding: getValue('Share Issued') || getValue('Ordinary Shares Number'),
      };
    });
    console.log(`[${ticker}] Balance sheet extracted — goodwill: ${data.goodwillNet ?? 'N/A'}, intangibles: ${data.intangiblesNet ?? 'N/A'}`);
    return data;
  } catch (err) {
    console.warn(`[${ticker}] Balance sheet scrape failed: ${err.message}`);
    return null;
  } finally {
    signal?.removeEventListener('abort', onAbort);
    await page.close().catch(() => {});
  }
}


// ---------------------------------------------------------------------------
// Number parsing
// ---------------------------------------------------------------------------

function rawVal(field) {
  if (field == null) return null;
  if (typeof field === 'number') return field;
  if (typeof field === 'object' && field.raw != null) return field.raw;
  return null;
}

function parseNum(raw) {
  if (!raw || raw === '--' || raw === 'N/A') return null;
  let str = raw.trim().replace(/[$,\s]/g, '');
  const neg = str.startsWith('(') && str.endsWith(')');
  if (neg) str = str.slice(1, -1);
  const n = parseFloat(str);
  if (isNaN(n)) return null;
  return neg ? -n : n;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

// Active fetch tracking
let activeFetches = 0;

// ---------------------------------------------------------------------------
// Lightweight price-only refresh (no Puppeteer, no balance sheet)
// ---------------------------------------------------------------------------

export async function refreshPrice(ticker, signal) {
  const symbol = ticker.toUpperCase().trim();
  console.log(`[${symbol}] Refreshing price...`);

  const summary = await fetchQuoteSummary(symbol, signal);
  const fd = summary.financialData || {};
  const price = rawVal(fd.currentPrice) ?? rawVal(summary.price?.regularMarketPrice);
  const changePercentRaw = rawVal(summary.price?.regularMarketChangePercent);
  const changePercent = changePercentRaw != null ? Math.round(changePercentRaw * 10000) / 100 : null;

  // Patch the existing cache entry (keep original timestamp so full refresh still triggers on schedule)
  const cached = cache.get(symbol);
  if (cached) {
    cached.data.price = price;
    cached.data.changePercent = changePercent;
    saveCache();
    console.log(`[${symbol}] Price refreshed: ${price} (${changePercent != null ? changePercent.toFixed(2) + '%' : 'N/A'})`);
  }

  return { ticker: symbol, price, changePercent };
}

export async function fetchTickerData(ticker, signal) {
  const symbol = ticker.toUpperCase().trim();

  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[${symbol}] Returning cached data (${Math.round((Date.now() - cached.timestamp) / 1000)}s old)`);
    return cached.data;
  }

  activeFetches++;
  console.log(`[scraper] ▶ Started ${symbol} (active: ${activeFetches})`);
  const t0 = Date.now();

  try {
    // 1. Fast HTTP fetch for quote summary (price, EPS, dividend, book value, etc.)
    const summary = await fetchQuoteSummary(symbol, signal);
    const fd = summary.financialData || {};
    const sd = summary.summaryDetail || {};
    const ks = summary.defaultKeyStatistics || {};

    const price = rawVal(fd.currentPrice) ?? rawVal(summary.price?.regularMarketPrice);
    const changePercentRaw = rawVal(summary.price?.regularMarketChangePercent);
    const changePercent = changePercentRaw != null ? Math.round(changePercentRaw * 10000) / 100 : null;
    const eps = rawVal(ks.trailingEps);
    const divRate = rawVal(sd.dividendRate);
    const divYieldRaw = rawVal(sd.dividendYield);
    const divYieldPct = divYieldRaw != null ? Math.round(divYieldRaw * 10000) / 100 : null;
    const bookValue = rawVal(ks.bookValue);
    const priceToBook = rawVal(ks.priceToBook);
    const sharesOutstandingQuote = rawVal(ks.sharesOutstanding);

    // 2. Puppeteer scrape for balance sheet (goodwill, intangibles, full assets/liabilities)
    const bsData = await scrapeBalanceSheet(symbol, signal);

    // Balance sheet values are in thousands (Yahoo's "All numbers in thousands" header)
    const K = 1000;
    const bsTotalAssets = bsData ? parseNum(bsData.totalAssets) : null;
    const bsGoodwill = bsData ? parseNum(bsData.goodwillNet) : null;
    const bsIntangibles = bsData ? parseNum(bsData.intangiblesNet) : null;
    const bsLiabilities = bsData ? parseNum(bsData.liabilitiesTotal) : null;
    const bsShares = bsData ? parseNum(bsData.sharesOutstanding) : null;

    // Prefer balance sheet values (multiplied by 1000), fall back to quote page derived values
    const totalDebt = rawVal(fd.totalDebt);
    const totalEquity = bookValue != null && sharesOutstandingQuote != null
      ? bookValue * sharesOutstandingQuote : null;

    const result = {
      ticker: symbol,
      price,
      changePercent,
      date: new Date().toISOString().split('T')[0],
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
    };

    cache.set(symbol, { data: result, timestamp: Date.now() });
    saveCache();
    console.log(`[${symbol}] Complete in ${((Date.now() - t0) / 1000).toFixed(1)}s — price: ${result.price}, goodwill: ${result.goodwillNet ?? 'N/A'}`);
    return result;
  } finally {
    activeFetches--;
    console.log(`[scraper] ■ Finished ${symbol} in ${((Date.now() - t0) / 1000).toFixed(1)}s (active: ${activeFetches})`);
  }
}
