---
inclusion: manual
---

# Stox — Component & Hook Reference

## Component Tree

```
App (QueryClientProvider)
├── TickerTable (orchestrator)
│   ├── Heatmap (collapsible, dual-mode: daily/intrinsic)
│   ├── ToolBar
│   │   ├── SearchInput (inline)
│   │   ├── AddTickerForm (comma-separated input)
│   │   ├── ExportButton (inline)
│   │   ├── HelpButton (?)
│   │   └── RefreshButton (⟳)
│   ├── TableHeader (sortable, resizable, multi-column sort)
│   └── StockRowWithData[] (one per ticker, wrapper for hook)
│       └── StockRow
│           ├── TickerCell (Yahoo Finance link, related tickers popover)
│           ├── EpsCell (hover popover with 15x/20x multiples)
│           ├── DataCells (formatted, color-coded)
│           └── RowActions (star toggle, remove button)
├── EmptyState (with inline AddTickerForm + HelpButton)
├── Footer
└── HelpDialog (portal-based modal)
```

## Component Props Quick Reference

| Component | Key Props |
|---|---|
| `TickerTable` | `onHelpOpen: () => void` |
| `ToolBar` | `searchQuery, onSearchChange, onAddTicker, onExport, hasData, onRefresh, isRefreshing, onHelpOpen` |
| `TableHeader` | `sortCriteria, onSort, columnWidths, onResizeStart, onAutoFit, isResizingRef` |
| `StockRow` | `ticker, data, isLoading, isError, onRemove, relatedTickers, allTickers, onAddTicker, isStarred, onToggleStar` |
| `Heatmap` | `rowDataMap, tickers, dataVersion` |
| `AddTickerForm` | `onAddTicker, placeholder?, inputLabel?` |
| `EmptyState` | `onAddTicker, onHelpOpen` |
| `HelpDialog` | `open, onClose` |

## Custom Hooks

### `useTickerList()` → `[tickers, addTicker, removeTicker]`
- Reads/writes `stox:tickers` in localStorage
- `addTicker(symbol)` supports comma-separated input, auto-uppercases, rejects empty/duplicates
- Returns error string or null

### `useStarredTickers()` → `[starredSet, toggleStar]`
- Reads/writes `stox:starred` in localStorage
- Returns a `Set<string>` for O(1) lookups

### `useStockData(ticker)` → `{ data, isLoading, isError }`
- TanStack Query wrapper with 5-min refetchInterval/staleTime
- 3x retry with exponential backoff (2s, 4s, 8s, max 30s)
- Returns `RawStockData | null`

### `useTableState()` → `{ searchQuery, onSearchChange, sortCriteria, onSort, filterTickers, sortRows }`
- Plain click: single-column sort (asc → desc → clear)
- Shift+click: multi-column sort (add → toggle → remove)
- `filterTickers` and `sortRows` are pure functions also exported for testing

### `useColumnResize()` → `{ widths, onResizeStart, onAutoFit, isResizingRef, tableRef }`
- Drag-to-resize with mouse events on document
- Double-click auto-fit measures actual cell content
- Minimum width: 40px
- `isResizingRef` prevents sort on resize mouseup

## Services

### `localStorageService`
- `getTickerList()` / `setTickerList(tickers)`
- `getStarredTickers()` / `setStarredTickers(starred)`
- In-memory `Map` fallback when localStorage unavailable

### `stockDataAdapter`
- Abstract `StockDataAdapter` interface: `fetchStock(ticker, signal?)`, `refreshStocks(tickers, signal?)`
- `YahooFinanceAdapter` concrete implementation hits `localhost:3001`
- `normalizeStockData()` maps raw API response → `RawStockData`
- `toNum()` for safe number coercion

## Server Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/stock/:ticker` | Fetch cached or fresh data (4h TTL) |
| POST | `/api/refresh-stocks` | Force-refresh prices, body: `{ tickers: string[] }` |

## Scraper Pipeline (per ticker)

1. Quote Summary — EPS, dividend yield, book value via quoteSummary endpoint
2. Real-time Price — live price + daily change from quote page
3. Balance Sheet — total assets, goodwill, intangibles, liabilities, shares outstanding
4. Profile — sector and industry classification

Throttle: 2s between requests. Cache: file-based `.stock-cache.json`, 4h TTL. Shared headless Chrome instance.

## Adding a New Column

1. Add key to `ColumnKey` union in `src/types.ts`
2. Add field to `RawStockData` and/or `StockRowData` interfaces in `src/types.ts`
3. Add `ColumnDef` entry to `COLUMNS` array in `src/columns.ts`
4. If computed: add logic to `computeStockRow()` in `src/utils/computeStockRow.ts`
5. If special rendering needed: add case in `StockRow.tsx`
6. If color-coded: add threshold logic to `getCellHighlight()` in `src/utils/cellHighlight.ts`
7. Add formatter if new `FormatType` needed in `src/utils/formatters.ts`
8. Update CSV exporter if column order matters
9. Add CSS class in `src/index.css` if needed (use `gs-` prefix)

## Adding a New Feature

1. Types first: define interfaces in `src/types.ts`
2. Pure logic: implement in `src/utils/` as pure functions
3. State management: create hook in `src/hooks/` if needed
4. UI: create component in `src/components/`
5. Wire up: integrate in `TickerTable.tsx` or `App.tsx`
6. Style: add CSS classes with `gs-` prefix in `src/index.css`
7. Tests: co-located unit tests + property-based tests if applicable
