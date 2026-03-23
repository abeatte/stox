/**
 * Express proxy server for Yahoo Finance stock data.
 * Uses plain HTTP to fetch and parse Yahoo Finance pages — no Puppeteer needed.
 *
 * Usage: node server/index.mjs
 * Endpoint: GET /api/stock/:ticker
 */
import express from 'express';
import { fetchTickerData, refreshPrice, closeBrowser, warmUp, saveCache } from './scraper.mjs';

const app = express();
const PORT = 3001;

// Enable CORS so the browser can connect directly (bypassing Vite proxy)
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

  try {
    const abortController = new AbortController();
    req.on('close', () => {
      if (!res.writableEnded) {
        console.log(`[server] Client disconnected, aborting ${ticker.toUpperCase()}`);
        abortController.abort();
      }
    });

    console.log(`[server] Fetching ${ticker.toUpperCase()}...`);
    const data = await fetchTickerData(ticker, abortController.signal);
    console.log(`[server] Done: ${ticker.toUpperCase()}`);
    res.json(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log(`[server] Fetch aborted for ${ticker.toUpperCase()}`);
      if (!res.headersSent) res.status(499).end();
      return;
    }
    console.error(`[server] Error for ${ticker}:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

app.post('/api/refresh-prices', async (req, res) => {
  const { tickers } = req.body;
  if (!Array.isArray(tickers) || tickers.length === 0) {
    res.status(400).json({ error: 'Provide a tickers array' });
    return;
  }

  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) {
      console.log('[server] Client disconnected, aborting price refresh');
      abortController.abort();
    }
  });

  try {
    const results = [];
    for (const ticker of tickers) {
      if (abortController.signal.aborted) {
        console.log(`[server] Refresh aborted, skipping remaining tickers`);
        break;
      }
      try {
        const result = await refreshPrice(ticker, abortController.signal);
        results.push(result);
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        console.warn(`[server] Price refresh failed for ${ticker}:`, err.message);
        results.push({ ticker: ticker.toUpperCase(), price: null, changePercent: null, error: err.message });
      }
    }
    if (!res.headersSent) res.json({ results });
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('[server] Refresh prices aborted');
      if (!res.headersSent) res.status(499).end();
      return;
    }
    console.error('[server] Refresh prices error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err.message);
  if (!res.headersSent) {
    res.status(500).json({ error: err.message });
  }
});

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
});

app.listen(PORT, () => {
  console.log(`[server] Yahoo Finance proxy running on http://localhost:${PORT}`);
  warmUp();
});

// Graceful shutdown
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
