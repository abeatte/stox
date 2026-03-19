/**
 * Express proxy server for Yahoo Finance stock data.
 * Uses plain HTTP to fetch and parse Yahoo Finance pages — no Puppeteer needed.
 *
 * Usage: node server/index.mjs
 * Endpoint: GET /api/stock/:ticker
 */
import express from 'express';
import { fetchTickerData, closeBrowser, warmUp } from './scraper.mjs';

const app = express();
const PORT = 3001;

// Enable CORS so the browser can connect directly (bypassing Vite proxy)
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

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
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});
