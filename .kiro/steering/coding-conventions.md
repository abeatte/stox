---
inclusion: always
---

# Stox — Coding Conventions

## TypeScript

- Strict mode enabled (`strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)
- Target: ES2020 (frontend), ES2022 (server)
- Module: ESNext (frontend, Bundler resolution), NodeNext (server)
- All numeric fields from external data are `number | null` — never `undefined`
- Use `type` imports for type-only imports: `import type { RawStockData } from '../types'`
- Prefer union types over enums: `type ColumnKey = 'ticker' | 'price' | ...`
- Interfaces for object shapes, type aliases for unions and computed types

## Naming

| Category | Convention | Example |
|---|---|---|
| Components | PascalCase | `TickerTable`, `StockRow` |
| Hooks | camelCase with `use` prefix | `useTickerList`, `useStockData` |
| Utilities | camelCase | `formatCurrency`, `computeStockRow` |
| Constants | UPPER_SNAKE_CASE | `COLUMNS`, `CACHE_TTL`, `REQUEST_GAP` |
| Types/Interfaces | PascalCase | `RawStockData`, `StockRowData`, `ColumnDef` |
| CSS classes | `gs-` prefix, kebab-case | `gs-toolbar`, `gs-cell-number`, `gs-table-wrap` |
| localStorage keys | `stox:` prefix | `stox:tickers`, `stox:starred` |

## File Organization

- One component per file, named after the component
- Hooks in `src/hooks/`, one hook per file
- Pure utility functions in `src/utils/`
- Service abstractions in `src/services/`
- All types centralized in `src/types.ts`
- Column metadata in `src/columns.ts`
- All CSS in `src/index.css` (single file, no CSS modules)
- Test files co-located: `ComponentName.test.tsx` or `utilName.test.ts`
- Integration tests in `src/__tests__/`

## Component Patterns

- Functional components only (no class components)
- Props interfaces defined inline or exported from the component file
- Use `useCallback` for event handlers passed to children
- Use `useMemo` for expensive computations
- Use `useRef` for mutable values that shouldn't trigger re-renders (e.g., `rowDataMapRef`)
- Portal-based popovers via `createPortal(jsx, document.body)` for tooltips
- Wrapper components to call hooks per-item (e.g., `StockRowWithData` wraps `useStockData` to avoid hooks in loops)

## Error Handling

- All numeric computations use `safeDivide()` — returns `null` on zero divisor or null inputs
- `null` values render as `"N/A"` via `formatValue()`
- `toNum()` and `toStr()` for safe type coercion from unknown API data
- localStorage has in-memory fallback when unavailable
- TanStack Query handles fetch errors with retry + exponential backoff
- Server uses `toError()` helper for type-safe catch blocks

## Formatting Rules

| Type | Format | Example |
|---|---|---|
| currency | `$X.XX` or `($X.XX)` for negatives | `$320.30`, `($6.51)` |
| percent | `X.XX%` | `7.08%` |
| ratio | `X.XX` or `(X.XX)` for negatives | `27.05`, `(181.70)` |
| large-number | Abbreviated K/M/B/T with `$` prefix | `$56.1B` |
| large-count | Abbreviated K/M/B/T, no `$` prefix | `1.2B` |
| null/undefined | `"N/A"` | |

## Cell Color Coding Thresholds

| Column(s) | Green | Yellow | Red |
|---|---|---|---|
| Dividend Percent, Div Yield | — | null or 0 | — |
| EPS | — | — | negative |
| P:Book, P:Tangbook | 0.15–0.85 | 0.85–1.15 | <0.15 or >1.15 |
| Price/Earnings | 0–15 | 15–20 | >20 or negative |
