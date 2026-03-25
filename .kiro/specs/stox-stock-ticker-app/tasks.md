# Implementation Plan: Stox Stock Ticker App

## Overview

Incrementally build the Stox app from project scaffold through backend proxy, data layer, computed logic, UI components, and interactive features. Each task builds on the previous, with property-based and unit tests woven in close to the code they validate.

## Tasks

- [x] 1. Scaffold project and configure tooling
  - [x] 1.1 Initialize Vite + React + TypeScript project
    - Run `npm create vite@latest` with React-TS template, install dependencies: `@tanstack/react-query`, `express`, `puppeteer`, `fast-check` (dev), `vitest` (dev), `@testing-library/react` (dev), `concurrently` (dev), `tsx` (dev)
    - Configure `vitest` in `vite.config.ts` with jsdom environment
    - _Requirements: 1.1, 1.3_
  - [x] 1.2 Initialize Git repo with `.gitignore`
    - Create `.gitignore` for Node/React (node_modules, dist, .env, coverage, etc.)
    - _Requirements: 1.4_
  - [x] 1.3 Configure npm scripts
    - Add scripts: `dev`, `server`, `dev:all`, `build`, `test`, `lint`, `kill-server`, `invalidate-cache`, `restart-server`
    - _Requirements: 1.5_

- [x] 2. Implement data models, types, and column definitions
  - [x] 2.1 Create TypeScript interfaces and column metadata
    - Define `RawStockData` (with `changePercent`, `sector`, `industry`, `bookValue`, `priceToBook`, `relatedTickers`), `StockRowData`, `ColumnKey`, `SortKey`, `SortCriterion`, `ColumnDef` in `src/types.ts`
    - Define the 17-column `COLUMNS` array with label, type (including `large-count`), and sortType in `src/columns.ts`
    - _Requirements: 2.2, 2.3_

- [x] 3. Implement number formatting utilities
  - [x] 3.1 Create `src/utils/formatters.ts`
    - Implement `formatCurrency(value)` — `$X.XX`, parentheses for negatives
    - Implement `formatPercent(value)` — `X.XX%`
    - Implement `formatRatio(value)` — `X.XX`, parentheses for negatives
    - Implement `formatLargeNumber(value)` — abbreviated K/M/B/T with `$` prefix
    - Implement `formatLargeCount(value)` — abbreviated K/M/B/T without `$` prefix
    - Implement `formatValue(value, type)` dispatcher that returns `"N/A"` for null/undefined
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  - [ ]* 3.2 Write property test: negative values use parentheses notation (Property 3)
  - [ ]* 3.3 Write property test: number formatting round-trip (Property 2)
  - [ ]* 3.4 Write unit tests for formatters

- [x] 4. Implement computed column logic
  - [x] 4.1 Create `src/utils/computeStockRow.ts`
    - Implement `computeStockRow(raw: RawStockData): StockRowData`
    - bookValue with Yahoo `raw.bookValue` fallback
    - pBook with Yahoo `raw.priceToBook` fallback
    - tangibleBookValue treating null goodwill/intangibles as 0
    - dividendPercent defaults to 0 when null
    - changePercent passthrough
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_
  - [ ]* 4.2 Write property test: computed columns consistent with raw data (Property 1)
  - [ ]* 4.3 Write unit tests for computeStockRow

- [x] 5. Implement heatmap color utilities
  - [x] 5.1 Create `src/utils/heatmapColors.ts`
    - Implement `getDailyColor(changePercent)` — red-to-green pastel scale, clamped ±5%
    - Implement `getIntrinsicColor(pBook, price, bookValue)` — green-to-red pastel scale, clamped [0.5, 2.0]
    - _Requirements: 14.3, 14.4_
  - [ ]* 5.2 Write property test: heatmap colors produce valid CSS (Property 13)
  - [ ]* 5.3 Write unit tests for heatmap colors

- [x] 6. Implement Backend Proxy Server
  - [x] 6.1 Create `server/scraper.ts`
    - Implement Puppeteer-based multi-stage Yahoo Finance scraper
    - Quote summary, real-time price, balance sheet, profile, related tickers
    - File-based cache with 4-hour TTL (`.stock-cache.json`)
    - 2-second throttle between requests
    - Abort signal support
    - _Requirements: 3.4, 3.5, 3.6_
  - [x] 6.2 Create `server/index.ts`
    - Express server on port 3001
    - `GET /api/stock/:ticker` endpoint with ticker validation
    - `POST /api/refresh-stocks` endpoint for force-refresh
    - CORS headers, abort signal handling, graceful shutdown
    - _Requirements: 3.1, 3.2, 3.3, 3.7, 3.8, 3.9, 3.10_

- [x] 7. Implement localStorage services and hooks
  - [x] 7.1 Create `src/services/localStorageService.ts`
    - Generic `getList(key)` / `setList(key, items)` with in-memory fallback
    - `getTickerList()` / `setTickerList()` using key `stox:tickers`
    - `getStarredTickers()` / `setStarredTickers()` using key `stox:starred`
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 13.2_
  - [x] 7.2 Create `src/hooks/useTickerList.ts`
    - Return `[tickers, addTicker, removeTicker]`
    - `addTicker`: supports comma-separated input, rejects empty strings, skips duplicates, auto-uppercases, returns validation message or null
    - `removeTicker`: remove symbol, persist updated list
    - _Requirements: 6.1, 9.1, 9.4, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_
  - [x] 7.3 Create `src/hooks/useStarredTickers.ts`
    - Return `[starredSet, toggleStar]`
    - Toggle star on/off, persist to localStorage
    - _Requirements: 13.1, 13.2, 13.4_
  - [ ]* 7.4 Write property test: ticker list localStorage round-trip (Property 4)
  - [ ]* 7.5 Write property test: starred tickers localStorage round-trip (Property 5)
  - [ ]* 7.6 Write property test: adding valid tickers grows the list (Property 6)
  - [ ]* 7.7 Write property test: invalid/duplicate additions rejected (Property 7)
  - [ ]* 7.8 Write property test: removing a ticker shrinks the list (Property 8)
  - [ ]* 7.9 Write unit tests for localStorage service and hooks

- [x] 8. Implement StockDataAdapter and useStockData hook
  - [x] 8.1 Create `src/services/stockDataAdapter.ts`
    - Define `StockDataAdapter` interface with `fetchStock` and `refreshStocks`
    - Implement `YahooFinanceAdapter` that fetches from Express proxy (`localhost:3001`)
    - Implement `normalizeStockData()` to map raw API response to `RawStockData`
    - Export `toNum()` utility for safe number coercion
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 8.2 Create `src/hooks/useStockData.ts`
    - Use TanStack Query `useQuery` per ticker with `refetchInterval: 300000` (5 min) and `staleTime: 300000`
    - Retry 3x with exponential backoff (2s base, 30s cap)
    - Return `{ data: RawStockData | null, isLoading, isError }`
    - _Requirements: 4.4, 4.5, 4.6, 7.1, 7.2_

- [x] 9. Implement search, sort, and filter logic
  - [x] 9.1 Create `src/hooks/useTableState.ts`
    - Manage `searchQuery` and `sortCriteria: SortCriterion[]` state
    - `filterTickers(tickers, query)` — case-insensitive substring match
    - `sortRows(rows, criteria)` — multi-column sort with null-to-end behavior
    - `onSort(col, multi)` — plain click: 3-click cycle (asc → desc → clear); Shift+click: add/toggle/remove criterion
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10_
  - [ ]* 9.2 Write property test: search filter case-insensitive and non-destructive (Property 9)
  - [ ]* 9.3 Write property test: sorting produces correct order (Property 10)

- [x] 10. Implement CSV export
  - [x] 10.1 Create `src/utils/csvExporter.ts`
    - `escapeCsvCell(value)` — RFC 4180 escaping
    - `generateCsv(rows)` — header row with 17 column labels, data rows with formatted values
    - `buildExportFilename()` — `stox-export-{ISO8601}.csv`
    - `downloadCsv(csvString, filename)` — trigger browser download via Blob/URL
    - _Requirements: 10.2, 10.3, 10.4, 10.6_
  - [ ]* 10.2 Write property test: CSV export contains all rows and 17 columns (Property 11)
  - [ ]* 10.3 Write property test: CSV filename includes ISO 8601 timestamp (Property 12)
  - [ ]* 10.4 Write unit tests for CSV exporter

- [x] 11. Implement column resize hook
  - [x] 11.1 Create `src/hooks/useColumnResize.ts`
    - `buildInitialWidths()` — divide viewport evenly across columns
    - Drag-to-resize with `onResizeStart` handler (mousedown/mousemove/mouseup)
    - Double-click auto-fit via `onAutoFit` using table cell content measurement
    - Minimum width of 40px
    - Expose `tableRef`, `columnWidths`, `onResizeStart`, `onAutoFit`, `isResizingRef`
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 12. Build UI components and wire everything together
  - [x] 12.1 Create `App.tsx` with QueryClientProvider and top-level layout
    - Set up TanStack Query `QueryClient`
    - Render `TickerTable` or `EmptyState` based on ticker list
    - Manage HelpDialog open state
    - Render `Footer`
    - _Requirements: 1.1, 6.3, 20.1_
  - [x] 12.2 Create `AddTickerForm` component
    - Reusable form with text input + submit button
    - Comma-separated ticker support with placeholder "AAPL, MSFT, GOOG"
    - Show validation error messages; clear input on successful add
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  - [x] 12.3 Create `ToolBar` component
    - Render `SearchInput`, `AddTickerForm`, `ExportButton`, `HelpButton` (?), `RefreshButton` (⟳)
    - Refresh button disabled when refreshing or no data
    - _Requirements: 10.1, 10.5, 11.1, 7.4, 7.5, 19.1_
  - [x] 12.4 Create `TableHeader` component
    - Render 17 column headers from `COLUMNS` array plus ★ and ✕ columns
    - Click to sort with 3-click cycle; Shift+click for multi-column sort
    - Show ▲/▼ sort indicators with priority numbers for multi-sort
    - Draggable resize handles on right edge; double-click to auto-fit
    - `aria-sort` attributes for accessibility
    - _Requirements: 2.3, 2.5, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 13.3, 15.1_
  - [x] 12.5 Create `StockRow` component
    - Render one row per ticker with formatted, color-coded values
    - Ticker cell: link to Yahoo Finance, related tickers popover on hover
    - EPS cell: hover popover with 15x/20x EPS multiples
    - Star toggle button (☆/★) and remove button (✕)
    - Loading/error placeholder rows
    - `getCellHighlight()` for threshold-based color coding
    - _Requirements: 2.1, 2.2, 4.3, 4.5, 8.1–8.7, 12.5, 12.7, 13.1, 16.1–16.4, 17.1, 17.2, 18.1–18.4_
  - [x] 12.6 Create `Heatmap` component
    - Collapsible, dual-mode (Daily / Intrinsic)
    - Tiles sized by market cap proxy, colored by `getDailyColor` or `getIntrinsicColor`
    - Display ticker + metric label on each tile
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_
  - [x] 12.7 Create `TickerTable` component
    - Compose `Heatmap`, `ToolBar`, `TableHeader`, and `StockRowWithData[]`
    - Horizontally scrollable container with `<colgroup>` for column widths
    - Wire `useTickerList`, `useStarredTickers`, `useStockData` (via StockRowWithData), `useTableState`, `useColumnResize`
    - Mutable ref (`rowDataMapRef`) to collect computed data without re-renders
    - Apply search filter and multi-column sort to rows before rendering
    - Handle CSV export and manual refresh
    - _Requirements: 2.1, 2.4, 7.3, 7.4, 9.4, 10.1, 11.1, 11.10_
  - [x] 12.8 Create `EmptyState` component
    - Display message: "No tickers configured. Add a ticker to get started."
    - Include inline `AddTickerForm` and help button
    - _Requirements: 6.3, 9.3, 19.1_
  - [x] 12.9 Create `HelpDialog` component
    - Portal-based modal with sections: Adding & Removing, Sorting, Searching, Column Resizing, Data & Export, Other Features
    - Close via button, outside click, or Escape key
    - Platform-aware modifier key labels (⌘ on Mac, Ctrl otherwise)
    - _Requirements: 19.1, 19.2, 19.3, 19.4_
  - [x] 12.10 Create `Footer` component
    - Creator attribution, copyright year, "All rights reserved"
    - _Requirements: 20.1_
  - [ ]* 12.11 Write property test: cell highlighting is deterministic (Property 14)

- [x] 13. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1–14)
- Unit tests validate specific examples and edge cases
- The `StockDataAdapter` is kept abstract so the data source can be swapped without affecting the rest of the app
- The Interest/Annotation column from the original spec was removed; starred tickers replaced per-ticker annotations
- The Date column was removed from the table display; Sector and Industry columns were added
- eps20x and eps15x are computed but displayed only in the EPS hover tooltip, not as table columns
- The refetch interval was changed from 60 seconds to 5 minutes
- The backend proxy server was added to handle Yahoo Finance scraping server-side
