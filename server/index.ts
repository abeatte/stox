/**
 * Express proxy server for Yahoo Finance stock data.
 * Uses Puppeteer via scraper.ts to fetch and parse Yahoo Finance pages.
 *
 * Usage: npx tsx server/index.ts
 * Endpoints:
 *   GET  /api/stock/:ticker/stream — SSE stream: progress events then final data
 *   GET  /api/stock/:ticker        — fetch (cached) stock data, JSON response
 *   POST /api/refresh-stocks       — force-refresh stock data (clears cache)
 */
import express, { type Request, type Response, type NextFunction } from 'express';
import { fetchTickerData, refreshStock, getCachedData, closeBrowser, warmUp, saveCache } from './scraper.js';
import { toError } from './utils.js';
import { metrics } from './metrics.js';

const app = express();
const PORT = 3001;

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.options('/{*path}', (_req: Request, res: Response) => { res.sendStatus(204); });

app.use(express.json());

/**
 * SSE stream endpoint — single connection per ticker that delivers:
 *   1. Immediate current state (queued / scraping stage / cached data)
 *   2. Progress updates as the scrape advances
 *   3. Final `data` event with the stock payload, then stream closes
 *
 * Event shapes:
 *   { type: 'progress', stage, totalStages, stageLabel }
 *   { type: 'data', payload: <stock object> }
 *   { type: 'error', message }
 */
app.get('/api/stock/:ticker/stream', (req: Request<{ ticker: string }>, res: Response) => {
  const { ticker } = req.params;

  if (!ticker || !/^[A-Za-z.-]{1,10}$/.test(ticker)) {
    res.status(400).json({ error: 'Invalid ticker symbol' });
    return;
  }

  const symbol = ticker.toUpperCase().trim();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendProgress = (stage: number, totalStages: number, stageLabel: string): void => {
    res.write(`data: ${JSON.stringify({ type: 'progress', stage, totalStages, stageLabel })}\n\n`);
  };

  const sendData = (payload: unknown): void => {
    res.write(`data: ${JSON.stringify({ type: 'data', payload })}\n\n`);
    res.end();
  };

  const sendError = (message: string): void => {
    res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
    res.end();
  };

  // fetchTickerData handles cache hits by running only stages 1 & 2 (quote
  // summary + real-time price), so the client always receives fresh price data
  // via this SSE stream even when the full cache is valid.

  let done = false;
  const abortController = new AbortController();

  // Subscribe to progress BEFORE calling fetchTickerData so we never miss an event
  const unsubscribe = metrics.onProgress((t, stage, totalStages, stageLabel) => {
    if (t !== symbol || done) return;
    sendProgress(stage, totalStages, stageLabel);
  });

  // Kick off the scrape. fetchTickerData synchronously registers the ticker as
  // queued in metrics before returning the promise, so getProcessInfo() will
  // already reflect the queued state by the time we read it below.
  const fetchPromise = fetchTickerData(symbol, abortController.signal);

  // Send the current state snapshot now that the ticker is registered
  const current = metrics.getProcessInfo(symbol);
  if (current) {
    sendProgress(current.stage, current.totalStages, current.stageLabel);
  }

  fetchPromise.then(
    (data) => {
      if (done) return;
      done = true;
      unsubscribe();
      sendData(data);
    },
    (err: unknown) => {
      if (done) return;
      done = true;
      unsubscribe();
      const error = toError(err);
      if (error.message !== 'Aborted') {
        metrics.log(`Stream error for ${symbol}: ${error.message}`);
        sendError(error.message);
      } else {
        res.end();
      }
    },
  );

  req.on('close', () => {
    done = true;
    unsubscribe();
    abortController.abort();
  });
});

app.get('/api/stock/:ticker', async (req: Request<{ ticker: string }>, res: Response) => {
  const { ticker } = req.params;

  if (!ticker || !/^[A-Za-z.-]{1,10}$/.test(ticker)) {
    res.status(400).json({ error: 'Invalid ticker symbol' });
    return;
  }

  // Cache-only mode: return cached data without triggering a scrape
  if (req.query.cacheOnly === 'true') {
    const cached = getCachedData(ticker);
    if (cached) {
      res.json(cached);
    } else {
      res.status(404).json({ error: `No cached data for ${ticker.toUpperCase()}` });
    }
    return;
  }

  const abortController = new AbortController();
  req.on('close', () => { if (!res.writableEnded) abortController.abort(); });

  try {
    const data = await fetchTickerData(ticker, abortController.signal);
    if (abortController.signal.aborted) {
      if (!res.headersSent) res.status(499).end();
      return;
    }
    res.json(data);
  } catch (err) {
    const error = toError(err);
    metrics.log(`Error for ${ticker}: ${error.message}`);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
});

app.post('/api/refresh-stocks', async (req: Request, res: Response) => {
  const { tickers } = req.body as { tickers?: string[] };
  if (!Array.isArray(tickers) || tickers.length === 0) {
    res.status(400).json({ error: 'Provide a tickers array' });
    return;
  }

  const abortController = new AbortController();
  res.on('close', () => { if (!res.writableFinished) abortController.abort(); });

  try {
    const results: Array<{ ticker: string; price: number | null; changePercent: number | null; error?: string }> = [];
    for (const ticker of tickers) {
      if (abortController.signal.aborted) {
        metrics.log('Refresh aborted');
        break;
      }
      try {
        const result = await refreshStock(ticker);
        results.push(result);
      } catch (err) {
        const error = toError(err);
        metrics.log(`Refresh failed for ${ticker}: ${error.message}`);
        results.push({ ticker: ticker.toUpperCase(), price: null, changePercent: null, error: error.message });
      }
    }
    if (!res.headersSent) res.json({ results });
  } catch (err) {
    const error = toError(err);
    metrics.log(`Refresh error: ${error.message}`);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  metrics.log(`Unhandled error: ${err.message}`);
  if (!res.headersSent) res.status(500).json({ error: err.message });
});

process.on('uncaughtException', (err) => metrics.log(`Uncaught exception: ${err}`));
process.on('unhandledRejection', (reason) => metrics.log(`Unhandled rejection: ${reason}`));

app.listen(PORT, () => {
  metrics.setBanner(`Yahoo Finance proxy → http://localhost:${PORT}`);
  warmUp();
  // Give Vite a moment to start, then probe for it
  setTimeout(() => { metrics.detectVite().catch(() => {}); }, 3000);
});

process.on('SIGINT', async () => {
  metrics.destroy();
  console.log('\n[server] Shutting down...');
  saveCache();
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  metrics.destroy();
  saveCache();
  await closeBrowser();
  process.exit(0);
});
