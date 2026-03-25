---
inclusion: manual
---

# Stox — Testing Patterns

## Framework & Setup

- **Runner**: Vitest 2.1 with `globals: true` (no explicit imports for `describe`, `it`, `expect`)
- **Environment**: jsdom
- **Setup**: `src/test/setup.ts` imports `@testing-library/jest-dom` for DOM matchers
- **Component testing**: `@testing-library/react` + `@testing-library/user-event`
- **Property-based testing**: `fast-check` 4.6 with minimum 100 iterations per property
- **Run command**: `npm run test` (runs `vitest --run`, single execution, no watch mode)

## Test File Locations

- Co-located with source: `ComponentName.test.tsx`, `utilName.test.ts`, `hookName.test.ts`
- Integration tests: `src/__tests__/integration.test.tsx`
- Config: `vite.config.ts` includes `src/**/*.{test,spec}.{ts,tsx}`

## Unit Test Patterns

### Component Tests
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders expected content', () => {
    render(<ComponentName prop="value" />);
    expect(screen.getByText('expected')).toBeInTheDocument();
  });
});
```

### Hook Tests
```typescript
import { renderHook, act } from '@testing-library/react';
import { useHookName } from './useHookName';

describe('useHookName', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useHookName());
    expect(result.current).toBe(expectedValue);
  });
});
```

### Utility Tests
```typescript
import { utilFunction } from './utilFile';

describe('utilFunction', () => {
  it('handles normal input', () => {
    expect(utilFunction(input)).toBe(expected);
  });

  it('handles null input', () => {
    expect(utilFunction(null)).toBe('N/A');
  });
});
```

## Property-Based Test Patterns

Each property test must include a comment tag:
```typescript
// Feature: stox-stock-ticker-app, Property {N}: {property_text}
```

Example structure:
```typescript
import fc from 'fast-check';

describe('Property tests', () => {
  // Feature: stox-stock-ticker-app, Property 1: Computed columns consistent with raw data
  it('P1: computed columns match formulas', () => {
    fc.assert(
      fc.property(
        fc.record({ /* arbitrary RawStockData fields */ }),
        (raw) => {
          const result = computeStockRow(raw);
          // verify computed fields match expected formulas
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

## 14 Correctness Properties (from design spec)

| # | Property | What to Test |
|---|---|---|
| P1 | Computed columns consistent with raw data | `computeStockRow()` formulas + Yahoo fallbacks |
| P2 | Number formatting round-trip | Format then parse back, verify numeric equivalence |
| P3 | Negative values use parentheses | Currency/ratio formatting, no minus sign |
| P4 | Ticker list localStorage round-trip | Save/read string arrays via localStorageService |
| P5 | Starred tickers localStorage round-trip | Save/read starred arrays |
| P6 | Adding valid tickers grows list | List length increases, symbols present |
| P7 | Invalid/duplicate additions rejected | Empty string and duplicates leave list unchanged |
| P8 | Removing ticker shrinks list by one | Length decreases, symbol absent |
| P9 | Search filter case-insensitive, non-destructive | Filtered results match query, original unchanged |
| P10 | Sorting produces correct order, reversible | Ascending/descending, nulls at end |
| P11 | CSV export has all rows and 17 columns | Header row + data rows match |
| P12 | CSV filename includes ISO 8601 timestamp | Pattern: `stox-export-{ISO8601}.csv` |
| P13 | Heatmap colors produce valid CSS | `getDailyColor()`, `getIntrinsicColor()` return `rgb(...)` or `#e8eaed` |
| P14 | Cell highlighting is deterministic | `getCellHighlight()` consistent per threshold rules |

## Key Test Considerations

- TanStack Query components need `QueryClientProvider` wrapper in tests
- localStorage tests should mock or reset storage between tests
- `useStockData` tests may need to mock `stockDataAdapter`
- Popovers use `createPortal` to `document.body` — check portal content in tests
- `useColumnResize` tests need mouse event simulation
- Abort signal handling should be tested for cleanup
