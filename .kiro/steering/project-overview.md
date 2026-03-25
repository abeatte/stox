---
inclusion: always
---

# Stox — Project Overview

Stox is a stock ticker dashboard built with React 18 + TypeScript + Vite. It fetches live data from Yahoo Finance via a Puppeteer-based Express proxy server.

## Architecture

Two-tier system:
- **Frontend**: React SPA (Vite, port 5173) with TanStack Query for server state
- **Backend**: Express proxy (port 3001) using Puppeteer to scrape Yahoo Finance

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18.3, TypeScript 5.6 |
| State | TanStack React Query 5.91 (per-ticker queries, 5-min refetch, 3x retry w/ exponential backoff) |
| Build | Vite 5.4 |
| Server | Express 5.2, Puppeteer 24.39 |
| Testing | Vitest 2.1, @testing-library/react 16.3, fast-check 4.6 (property-based) |
| Styling | Plain CSS (Google Sheets aesthetic), all in `src/index.css` |
| Persistence | Browser localStorage (`stox:tickers`, `stox:starred`) |

## Project Structure

```
src/
├── components/       # React components (TickerTable, StockRow, TableHeader, ToolBar, Heatmap, etc.)
├── hooks/            # Custom hooks (useTickerList, useStarredTickers, useStockData, useTableState, useColumnResize)
├── services/         # Data layer (localStorageService, stockDataAdapter with abstract interface)
├── utils/            # Pure functions (formatters, computeStockRow, csvExporter, heatmapColors)
├── types.ts          # All TypeScript interfaces and type unions
├── columns.ts        # Column metadata definitions (17 columns)
├── index.css         # All styling
└── App.tsx           # Root with QueryClientProvider

server/
├── index.ts          # Express endpoints (GET /api/stock/:ticker, POST /api/refresh-stocks)
└── scraper.ts        # Puppeteer 4-stage scraper (quote summary, price, balance sheet, profile)
```

## Data Flow

1. `useStockData(ticker)` → TanStack Query → `YahooFinanceAdapter.fetchStock()` → `GET /api/stock/:ticker`
2. Server: `fetchTickerData()` → Puppeteer scraper (4 stages) → cached in `.stock-cache.json` (4h TTL)
3. Response normalized via `normalizeStockData()` → `RawStockData`
4. Client computes derived fields via `computeStockRow()` → `StockRowData`
5. Components render formatted values via `formatValue()`

## Key Data Types

- `RawStockData` — raw values from API (all numeric fields nullable)
- `StockRowData` — computed derived metrics (bookValue, pBook, tangibleBookValue, pTangbook, eps20x, eps15x, priceEarnings)
- `ColumnKey` — union of 17 column keys
- `ColumnDef` — column metadata: `{ key, label, type (FormatType), sortType }`
- `SortCriterion` — `{ column: SortKey, direction: 'asc' | 'desc' }`

## NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run server` | Compile + run Express proxy |
| `npm run dev:all` | Both concurrently |
| `npm run test` | Vitest --run |
| `npm run lint` | ESLint |
| `npm run build` | Type-check + Vite build |

## Existing Specs

Full requirements, design, and task specs are in `.kiro/specs/stox-stock-ticker-app/`.
