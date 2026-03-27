/**
 * Express proxy server for Yahoo Finance stock data.
 * Uses Puppeteer via scraper.ts to fetch and parse Yahoo Finance pages.
 *
 * Usage: npx tsx server/index.ts
 * Endpoints:
 *   GET  /api/stock/:ticker   — fetch (cached) stock data
 *   POST /api/refresh-stocks  — force-refresh stock data (clears cache)
 */
import express, { type Request, type Response, type NextFunction } from 'express';
import { fetchTickerData, refreshStock, closeBrowser, warmUp, saveCache } from './scraper.js';
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

app.get('/api/stock/:ticker/progress', (req: Request<{ ticker: string }>, res: Response) => {
  const { ticker } = req.params;
  const symbol = ticker.toUpperCase().trim();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send current state immediately if the process is already running
  const current = metrics.getProcessInfo(symbol);
  if (current) {
    res.write(`data: ${JSON.stringify({ ticker: symbol, stage: current.stage, totalStages: current.totalStages, stageLabel: current.stageLabel })}\n\n`);
  }

  const unsubscribe = metrics.onProgress((t, stage, totalStages, stageLabel) => {
    if (t !== symbol) return;
    res.write(`data: ${JSON.stringify({ ticker: symbol, stage, totalStages, stageLabel })}\n\n`);
    // Close the stream when the scrape is complete
    if (stageLabel === 'complete') {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  });

  req.on('close', () => {
    unsubscribe();
  });
});

app.get('/api/stock/:ticker', async (req: Request<{ ticker: string }>, res: Response) => {
  const { ticker } = req.params;

  if (!ticker || !/^[A-Za-z.-]{1,10}$/.test(ticker)) {
    res.status(400).json({ error: 'Invalid ticker symbol' });
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
