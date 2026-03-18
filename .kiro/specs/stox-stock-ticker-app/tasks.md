# Implementation Plan: Stox Stock Ticker App

## Overview

Incrementally build the Stox SPA from project scaffold through data layer, computed logic, UI components, and interactive features. Each task builds on the previous, with property-based and unit tests woven in close to the code they validate.

## Tasks

- [x] 1. Scaffold project and configure tooling
  - [x] 1.1 Initialize Vite + React + TypeScript project
    - Run `npm create vite@latest` with React-TS template, install dependencies: `@tanstack/react-query`, `fast-check` (dev), `vitest` (dev), `@testing-library/react` (dev), `jsdom` (dev)
    - Configure `vitest` in `vite.config.ts`
    - Run `git add -A && git commit -m "feat: scaffold Vite + React + TypeScript project"`
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 1.2 Initialize Git repo with `.gitignore`
    - Create `.gitignore` for Node/React (node_modules, dist, .env, coverage, etc.)
    - Run `git init`
    - Run `git add -A && git commit -m "chore: initialize git repo with .gitignore"`
    - _Requirements: 1.4_

- [x] 2. Implement data models, types, and column definitions
  - [x] 2.1 Create TypeScript interfaces and column metadata
    - Define `RawStockData`, `StockRowData`, `ColumnKey`, `ColumnDef` in `src/types.ts`
    - Define the 19-column `COLUMNS` array with label, type, and sortType in `src/columns.ts`
    - Run `git add -A && git commit -m "feat: add data models, types, and column definitions"`
    - _Requirements: 2.2, 2.3_

- [x] 3. Implement number formatting utilities
  - [x] 3.1 Create `src/utils/formatters.ts`
    - Implement `formatCurrency(value)` — `$X.XX`, parentheses for negatives
    - Implement `formatPercent(value)` — `X.XX%`
    - Implement `formatRatio(value)` — `X.XX`, parentheses for negatives
    - Implement `formatLargeNumber(value)` — abbreviated K/M/B/T with `$` prefix
    - Implement `formatValue(value, type)` dispatcher that returns `"N/A"` for null/undefined
    - Run `git add -A && git commit -m "feat: implement number formatting utilities"`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  - [ ]* 3.2 Write property test: negative values use parentheses notation
    - **Property 3: Negative values use parentheses notation**
    - **Validates: Requirements 7.6**
  - [ ]* 3.3 Write property test: number formatting round-trip
    - **Property 2: Number formatting round-trip**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
  - [ ]* 3.4 Write unit tests for formatters
    - Test specific examples for each formatter type (currency, percent, ratio, large-number)
    - Test N/A for null/undefined inputs
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 4. Implement computed column logic
  - [x] 4.1 Create `src/utils/computeStockRow.ts`
    - Implement `computeStockRow(raw: RawStockData, interest: string): StockRowData`
    - bookValue = (totalAssets - liabilitiesTotal) / sharesOutstanding
    - tangibleBookValue = bookValue - (goodwillNet + intangiblesNet) / sharesOutstanding
    - pBook = price / bookValue; pTangbook = price / tangibleBookValue
    - eps20x = 20 * eps; eps15x = 15 * eps; priceEarnings = price / eps
    - Return `null` for any computed field when divisor is 0 or inputs are null
    - Run `git add -A && git commit -m "feat: implement computed column logic"`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_
  - [ ]* 4.2 Write property test: computed columns consistent with raw data
    - **Property 1: Computed columns are consistent with raw data**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9**
  - [ ]* 4.3 Write unit tests for computeStockRow
    - Test specific examples: negative book value, zero EPS, all-null fields, normal case
    - _Requirements: 4.7, 4.8, 4.9_

- [x] 5. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement localStorage services and ticker/interest hooks
  - [x] 6.1 Create `src/services/localStorageService.ts`
    - Implement `getTickerList()` / `setTickerList(tickers: string[])` using key `stox:tickers`
    - Implement `getInterestMap()` / `setInterestMap(map: Record<string, string>)` using key `stox:interest`
    - Gracefully handle localStorage unavailability (fall back to in-memory)
    - Run `git add -A && git commit -m "feat: implement localStorage service"`
    - _Requirements: 8.1, 8.2, 8.3, 12.3_
  - [x] 6.2 Create `src/hooks/useTickerList.ts`
    - Return `[tickers, addTicker, removeTicker]`
    - `addTicker`: reject empty strings and duplicates, return validation error message
    - `removeTicker`: remove symbol, persist updated list
    - Run `git add -A && git commit -m "feat: implement useTickerList hook"`
    - _Requirements: 5.1, 5.3, 8.1, 8.4, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  - [x] 6.3 Create `src/hooks/useInterestMap.ts`
    - Return `[interestMap, setInterest]`
    - Persist on every change
    - Run `git add -A && git commit -m "feat: implement useInterestMap hook"`
    - _Requirements: 12.1, 12.2, 12.3_
  - [ ]* 6.4 Write property test: ticker list localStorage round-trip
    - **Property 4: Ticker list localStorage round-trip**
    - **Validates: Requirements 5.2, 8.1, 8.2**
  - [ ]* 6.5 Write property test: interest annotation localStorage round-trip
    - **Property 5: Interest annotation localStorage round-trip**
    - **Validates: Requirements 12.2, 12.3**
  - [ ]* 6.6 Write property test: adding a valid ticker grows the list by one
    - **Property 6: Adding a valid ticker grows the list by one**
    - **Validates: Requirements 11.1, 11.5**
  - [ ]* 6.7 Write property test: invalid and duplicate ticker additions are rejected
    - **Property 7: Invalid and duplicate ticker additions are rejected**
    - **Validates: Requirements 11.2, 11.3**
  - [ ]* 6.8 Write property test: removing a ticker shrinks the list by one
    - **Property 8: Removing a ticker shrinks the list by one**
    - **Validates: Requirements 11.4, 11.6**
  - [ ]* 6.9 Write unit tests for localStorage service and hooks
    - Test read/write/fallback when localStorage is empty or unavailable
    - Test addTicker validation messages for empty and duplicate input
    - _Requirements: 8.2, 8.3, 11.2, 11.3_

- [x] 7. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement StockDataAdapter and useStockData hook
  - [x] 8.1 Create `src/services/stockDataAdapter.ts`
    - Define abstract `StockDataAdapter` interface with `fetchStock(ticker: string): Promise<RawStockData>`
    - Implement a concrete adapter (Yahoo Finance JSON via Vite dev-proxy or Google Finance scraping)
    - Configure Vite proxy in `vite.config.ts` if using Yahoo Finance
    - Run `git add -A && git commit -m "feat: implement StockDataAdapter service"`
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 8.2 Create `src/hooks/useStockData.ts`
    - Use TanStack Query `useQuery` per ticker with `refetchInterval: 60000`
    - Return `{ data: RawStockData | null, isLoading, isError }`
    - Run `git add -A && git commit -m "feat: implement useStockData hook with TanStack Query"`
    - _Requirements: 3.4, 6.1, 6.2_

- [x] 9. Implement search, sort, and filter logic
  - [x] 9.1 Create `src/hooks/useTableState.ts`
    - Manage `searchQuery`, `sortColumn`, `sortDirection` state
    - Implement `filterTickers(tickers, query)` — case-insensitive substring match on ticker symbol
    - Implement `sortRows(rows, column, direction)` — numeric sort for numeric columns, alpha for text columns
    - Run `git add -A && git commit -m "feat: implement search, sort, and filter logic"`
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.6, 10.7_
  - [ ]* 9.2 Write property test: search filter is case-insensitive and non-destructive
    - **Property 9: Search filter is case-insensitive and non-destructive**
    - **Validates: Requirements 10.1, 10.7**
  - [ ]* 9.3 Write property test: sorting produces correct order and is reversible
    - **Property 10: Sorting produces correct order and is reversible**
    - **Validates: Requirements 10.2, 10.3, 10.5, 10.6, 10.7**

- [x] 10. Implement CSV export
  - [x] 10.1 Create `src/utils/csvExporter.ts`
    - Implement `generateCsv(rows: StockRowData[]): string` — header row with all 19 column labels in order, one data row per StockRowData with formatted values
    - Implement `buildExportFilename(): string` — `stox-export-{ISO8601}.csv`
    - Implement `downloadCsv(csvString, filename)` — trigger browser download via Blob/URL
    - Run `git add -A && git commit -m "feat: implement CSV export utilities"`
    - _Requirements: 9.2, 9.3, 9.4, 12.4_
  - [ ]* 10.2 Write property test: CSV export contains all rows and all 19 columns
    - **Property 11: CSV export contains all rows and all 19 columns**
    - **Validates: Requirements 9.2, 9.3, 12.4**
  - [ ]* 10.3 Write property test: CSV filename includes ISO 8601 timestamp
    - **Property 12: CSV filename includes ISO 8601 timestamp**
    - **Validates: Requirements 9.4**
  - [ ]* 10.4 Write unit tests for CSV exporter
    - Test known input → known CSV output string
    - _Requirements: 9.2, 9.3_

- [x] 11. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Build UI components and wire everything together
  - [-] 12.1 Create `App.tsx` with QueryClientProvider and top-level layout
    - Set up TanStack Query `QueryClient`
    - Render `TickerTable` or `EmptyState` based on ticker list
    - Run `git add -A && git commit -m "feat: create App.tsx with QueryClientProvider"`
    - _Requirements: 1.1, 1.2, 5.3_
  - [ ] 12.2 Create `ToolBar` component
    - Render `SearchInput`, `AddTickerForm`, and `ExportButton`
    - `AddTickerForm`: text input + submit button, show validation messages for empty/duplicate
    - `ExportButton`: disabled with tooltip when no data
    - Run `git add -A && git commit -m "feat: create ToolBar component"`
    - _Requirements: 9.1, 11.1, 11.2, 11.3, 9.5_
  - [ ] 12.3 Create `TableHeader` component
    - Render 19 column headers from `COLUMNS` array
    - Click to sort; toggle asc/desc on repeated click
    - Show visual sort direction indicator on active column
    - Run `git add -A && git commit -m "feat: create TableHeader component"`
    - _Requirements: 2.3, 10.2, 10.3, 10.4_
  - [ ] 12.4 Create `StockRow` component
    - Render one row per ticker with formatted values using `formatValue()`
    - Show loading indicator while data is fetching
    - Show error indicator on fetch failure
    - Include remove button
    - Run `git add -A && git commit -m "feat: create StockRow component"`
    - _Requirements: 2.1, 2.2, 3.2, 3.3, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 11.4, 11.6_
  - [ ] 12.5 Create `InterestCell` component
    - Editable inline text input
    - Persist on change via `useInterestMap`
    - Run `git add -A && git commit -m "feat: create InterestCell component"`
    - _Requirements: 12.1, 12.2, 12.3_
  - [ ] 12.6 Create `TickerTable` component
    - Compose `ToolBar`, `TableHeader`, and `StockRow[]`
    - Horizontally scrollable container
    - Wire `useTickerList`, `useInterestMap`, `useStockData`, `useTableState`
    - Apply search filter and sort to rows before rendering
    - Run `git add -A && git commit -m "feat: create TickerTable component"`
    - _Requirements: 2.1, 2.4, 6.2, 6.3, 8.4, 10.1, 10.7_
  - [~] 12.7 Create `EmptyState` component
    - Display message: "No tickers configured. Add a ticker above."
    - Run `git add -A && git commit -m "feat: create EmptyState component"`
    - _Requirements: 5.3, 8.3_

- [ ] 13. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1–12)
- Unit tests validate specific examples and edge cases
- The `StockDataAdapter` is kept abstract so the data source can be swapped without affecting the rest of the app
