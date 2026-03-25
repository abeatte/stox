/**
 * Yahoo Finance scraper — Puppeteer.
 * All page fetches use a shared headless Chrome instance.
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

function loadCache() {
  try {
    const raw = readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    let loaded = 0;
    
    const entries = Array.isArray(parsed)
      ? parsed
      : Object.entries(parsed).map(([key, value]) => [key, value]);

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
    const obj = Object.fromEntries(cache.entries());
    writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2) + '\n');
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
// Shared browser instance
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
    console.warn('[scraper] Chrome not available:', err.message);
  }
}

/**
 * Open a new Puppeteer page with standard UA/viewport and abort-signal wiring.
 * Returns { page, cleanup } — always call cleanup() when done (or use in a finally block).
 */
async function openPage(signal) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: 1280, height: 800 });

  const onAbort = () => { page.close().catch(() => {}); };
  if (signal?.aborted) { await page.close(); throw new Error('Aborted'); }
  signal?.addEventListener('abort', onAbort, { once: true });

  const cleanup = async () => {
    signal?.removeEventListener('abort', onAbort);
    await page.close().catch(() => {});
  };

  return { page, cleanup };
}

// ---------------------------------------------------------------------------
// Quote page — Puppeteer
// ---------------------------------------------------------------------------

function parseQuoteSummaryHtml(ticker, html) {
  const regex = /<script[^>]*data-url="[^"]*quoteSummary[^"]*"[^>]*>([\s\S]*?)<\/script>/;
  const match = html.match(regex);
  if (!match) throw new Error(`Could not find quoteSummary data for ${ticker}`);

  const wrapper = JSON.parse(match[1]);
  const body = JSON.parse(wrapper.body);
  const result = body?.quoteSummary?.result?.[0];
  if (!result) throw new Error(`No quoteSummary result for ${ticker}`);
  return result;
}

async function fetchQuoteSummary(ticker, signal) {
  const { page, cleanup } = await openPage(signal);

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
    await page.goto(`https://finance.yahoo.com/quote/${ticker}/`, {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });

    // Try embedded JSON first (fastest path)
    const html = await page.content();
    try {
      return parseQuoteSummaryHtml(ticker, html);
    } catch { /* not embedded — wait for XHR */ }

    // Wait up to 15s for the XHR
    return await Promise.race([
      summaryPromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error(
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

async function fetchProfile(ticker, signal) {
  let page, cleanup;
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

    // Try embedded JSON
    const html = await page.content();
    try {
      const result = parseQuoteSummaryHtml(ticker, html);
      const ap = result?.assetProfile;
      if (ap) return ap;
    } catch { /* not in HTML */ }

    // Fallback: scrape visible text
    const profileData = await page.evaluate(() => {
      const getText = (label) => {
        const spans = [...document.querySelectorAll('span, dt, th')];
        for (const el of spans) {
          if (el.textContent.trim() === label) {
            const next = el.nextElementSibling;
            if (next) return next.textContent.trim();
          }
        }
        return null;
      };
      return { sector: getText('Sector') || getText('Sector(s)'), industry: getText('Industry') };
    });

    if (profileData.sector || profileData.industry) return profileData;
    return null;
  } catch (err) {
    console.warn(`[${ticker}] Profile fetch failed:`, err.message);
    return null;
  } finally {
    await cleanup();
  }
}

// ---------------------------------------------------------------------------
// Balance sheet page
// ---------------------------------------------------------------------------

async function scrapeBalanceSheet(ticker, signal) {
  let page, cleanup;
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
    await new Promise((r) => setTimeout(r, 5000));

    // Click "Expand All" to reveal sub-rows like Goodwill
    try {
      const expandBtn = await page.evaluateHandle(() => {
        const buttons = [...document.querySelectorAll('button')];
        return buttons.find((b) => b.textContent.trim() === 'Expand All');
      });
      if (expandBtn) {
        await expandBtn.click();
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch { /* no expand button */ }

    const data = await page.evaluate(() => {
      const lines = document.body.innerText.split('\n').map((l) => l.trim());
      const getValue = (label) => {
        for (let i = 0; i < lines.length; i++) {
          if (lines[i] === label && i + 1 < lines.length) return lines[i + 1];
        }
        return null;
      };

      // Related tickers
      const relatedTickers = [];
      const sections = document.querySelectorAll('section');
      for (const section of sections) {
        const heading = section.querySelector('h2, h3');
        if (heading && /related\s+tickers/i.test(heading.textContent)) {
          const seen = new Set();
          for (const a of section.querySelectorAll('a[href*="/quote/"]')) {
            const match = a.href.match(/\/quote\/([A-Z0-9.\-]+)/);
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
  } catch (err) {
    console.warn(`[${ticker}] Balance sheet scrape failed:`, err.message);
    return null;
  } finally {
    await cleanup();
  }
}

// ---------------------------------------------------------------------------
// Live price scrape
// ---------------------------------------------------------------------------

async function getRealtimePrice(ticker, signal) {
  const { page, cleanup } = await openPage(signal);

  try {
    await throttle();
    await page.goto(`https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/`, {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });

    await page.waitForSelector('section[data-testid="price-statistic"]', { timeout: 10000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));

    const priceData = await page.evaluate(() => {
      const section = document.querySelector('section[data-testid="price-statistic"]');
      if (!section) return { price: null, changePercent: null, prevClose: null };

      const priceEl = section.querySelector('[data-testid="qsp-price"]');
      const changePercentEl = section.querySelector('[data-testid="qsp-price-change-percent"]');

      const price = priceEl?.textContent?.trim()
        || section.querySelector('.price')?.textContent?.trim()
        || null;

      let changePercent = null;
      const cpText = (changePercentEl || section.querySelector('.priceChangePercent'))?.textContent?.trim();
      if (cpText) {
        const cleaned = cpText.replace(/[()%]/g, '');
        const n = parseFloat(cleaned);
        if (!isNaN(n)) changePercent = n;
      }

      const findValue = (label) => {
        for (const li of document.querySelectorAll('li')) {
          const span = li.querySelector('span');
          if (span && span.textContent.trim() === label) {
            const val = li.querySelector('fin-streamer, span:last-child');
            if (val && val !== span) return val.textContent.trim();
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

    return { price, prevClose: isNaN(prevClose) ? null : prevClose, changePercent };
  } finally {
    await cleanup();
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
// Exports
// ---------------------------------------------------------------------------

export async function refreshStock(ticker, signal) {
  const symbol = ticker.toUpperCase().trim();
  console.log(`[${symbol}] Refreshing stock...`);
  cache.delete(symbol);
  return fetchTickerData(symbol, signal);
}

export async function fetchTickerData(ticker, signal) {
  const symbol = ticker.toUpperCase().trim();

  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[${symbol}] Returning cached data`);
    return cached.data;
  }

  // 1. Quote summary (EPS, dividend, book value, etc.)
  console.log(`[${symbol}] Stage 1/4: Fetching quote summary...`);
  const summary = await fetchQuoteSummary(symbol, signal);
  const fd = summary.financialData || {};
  const sd = summary.summaryDetail || {};
  const ks = summary.defaultKeyStatistics || {};
  const ap = summary.assetProfile || {};

  let price = rawVal(fd.currentPrice) ?? rawVal(summary.price?.regularMarketPrice);
  let prevClose = rawVal(summary.price?.regularMarketPreviousClose);

  // 2. Real-time price (quote summary HTML is CDN-cached and often stale)
  console.log(`[${symbol}] Stage 2/4: Fetching real-time price...`);
  const rtData = await getRealtimePrice(symbol, signal);
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
  console.log(`[${symbol}] Stage 3/4: Scraping balance sheet...`);
  const bsData = await scrapeBalanceSheet(symbol, signal);

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
  console.log(`[${symbol}] Stage 4/4: Fetching profile...`);
  const profile = await fetchProfile(symbol, signal);
  const sector = profile?.sector || ap.sector || null;
  const industry = profile?.industry || ap.industry || null;

  const result = {
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
  };

  cache.set(symbol, { data: result, timestamp: Date.now() });
  saveCache();
  console.log(`[${symbol}] Done — price: ${result.price}, eps: ${result.eps}, bookValue: ${result.bookValue}`);
  return result;
}
