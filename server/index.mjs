/**
 * Express proxy server for Yahoo Finance stock data.
 * Uses Puppeteer via scraper.mjs to fetch and parse Yahoo Finance pages.
 *
 * Usage: node server/index.mjs
 * Endpoints:
 *   GET  /api/stock/:ticker   — fetch (cached) stock data
 *   POST /api/refresh-stocks  — force-refresh stock data (clears cache)
 */
import express from 'express';
import { fetchTickerData, refreshStock, closeBrowser, warmUp, saveCache } from './scraper.mjs';

const app = express();
const PORT = 3001;

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.options('/{*path}', (_req, res) => res.sendStatus(204));

app.use(express.json());

app.get('/api/stock/:ticker', async (req, res) => {
  const { ticker } = req.params;

  if (!ticker || !/^[A-Za-z.-]{1,10}$/.test(ticker)) {
    res.status(400).json({ error: 'Invalid ticker symbol' });
    return;
  }

  const abortController = new AbortController();
  req.on('close', () => { if (!res.writableEnded) abortController.abort(); });

  try {
    const data = await fetchTickerData(ticker, abortController.signal);
    res.json(data);
  } catch (err) {
    if (err.name === 'AbortError' || err.message === 'Aborted') {
      console.log(`[server] Fetch aborted for ${ticker.toUpperCase()}`);
      if (!res.headersSent) res.status(499).end();
      return;
    }
    console.error(`[server] Error for ${ticker}:`, err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

app.post('/api/refresh-stocks', async (req, res) => {
  const { tickers } = req.body;
  if (!Array.isArray(tickers) || tickers.length === 0) {
    res.status(400).json({ error: 'Provide a tickers array' });
    return;
  }

  const abortController = new AbortController();
  res.on('close', () => { if (!res.writableFinished) abortController.abort(); });

  try {
    const results = [];
    for (const ticker of tickers) {
      if (abortController.signal.aborted) {
        console.log(`[server] Refresh aborted`);
        break;
      }
      try {
        const result = await refreshStock(ticker, abortController.signal);
        results.push(result);
      } catch (err) {
        if (err.name === 'AbortError' || err.message === 'Aborted') throw err;
        console.warn(`[server] Refresh failed for ${ticker}:`, err.message);
        results.push({ ticker: ticker.toUpperCase(), price: null, changePercent: null, error: err.message });
      }
    }
    if (!res.headersSent) res.json({ results });
  } catch (err) {
    if (err.name === 'AbortError' || err.message === 'Aborted') {
      console.log('[server] Refresh aborted');
      if (!res.headersSent) res.status(499).end();
      return;
    }
    console.error('[server] Refresh error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err.message);
  if (!res.headersSent) res.status(500).json({ error: err.message });
});

process.on('uncaughtException', (err) => console.error('[server] Uncaught exception:', err));
process.on('unhandledRejection', (reason) => console.error('[server] Unhandled rejection:', reason));

app.listen(PORT, () => {
  console.log(`[server] Yahoo Finance proxy running on http://localhost:${PORT}`);
  warmUp();
});

process.on('SIGINT', async () => {
  console.log('\n[server] Shutting down...');
  saveCache();
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  saveCache();
  await closeBrowser();
  process.exit(0);
});
