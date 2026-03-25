import { useMemo, useState } from 'react';
import { getDailyColor, getIntrinsicColor } from '../utils/heatmapColors';
import type { StockRowData } from '../types';

type HeatmapMode = 'daily' | 'intrinsic';

interface HeatmapProps {
  rowDataMap: Map<string, StockRowData | null>;
  tickers: string[];
  /** Incremented whenever row data changes, to bust memoisation on the mutable map. */
  dataVersion: number;
}

function formatLabel(mode: HeatmapMode, row: StockRowData): string {
  if (mode === 'daily') {
    const pct = row.changePercent;
    if (pct === null) return row.ticker;
    const sign = pct >= 0 ? '+' : '';
    return `${row.ticker}\n${sign}${pct.toFixed(2)}%`;
  }
  const pb = row.pBook;
  if (pb === null) return row.ticker;
  return `${row.ticker}\n${pb.toFixed(2)}x`;
}

export function Heatmap({ rowDataMap, tickers, dataVersion }: HeatmapProps) {
  const [mode, setMode] = useState<HeatmapMode>('daily');
  const [collapsed, setCollapsed] = useState(true);

  const items = useMemo(() => {
    const result: StockRowData[] = [];
    for (const t of tickers) {
      const row = rowDataMap.get(t);
      if (row) result.push(row);
    }
    return result;
    // dataVersion forces recomputation when the mutable map contents change
  }, [tickers, rowDataMap, dataVersion]);

  if (items.length === 0) return null;

  // Size tiles by market cap proxy (shares * price), fallback to equal sizing
  const sizes = items.map((r) => {
    const cap = r.sharesOutstanding && r.price ? r.sharesOutstanding * r.price : 1;
    return Math.max(cap, 1);
  });
  const totalSize = sizes.reduce((a, b) => a + b, 0);

  return (
    <div className="gs-heatmap-container">
      <div className="gs-heatmap-header">
        <button
          className="gs-heatmap-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand heatmap' : 'Collapse heatmap'}
        >
          {collapsed ? '▶' : '▼'}
        </button>
        <span className="gs-heatmap-title">
          {mode === 'daily' ? "Today's Performance" : 'Intrinsic Value (P:Book)'}
        </span>
        {!collapsed && (
          <div className="gs-heatmap-toggle" role="radiogroup" aria-label="Heatmap view mode">
          <button
            role="radio"
            aria-checked={mode === 'daily'}
            className={`gs-heatmap-toggle-btn ${mode === 'daily' ? 'gs-heatmap-toggle-active' : ''}`}
            onClick={() => setMode('daily')}
          >
            Daily
          </button>
          <button
            role="radio"
            aria-checked={mode === 'intrinsic'}
            className={`gs-heatmap-toggle-btn ${mode === 'intrinsic' ? 'gs-heatmap-toggle-active' : ''}`}
            onClick={() => setMode('intrinsic')}
          >
            Intrinsic
          </button>
        </div>
        )}
      </div>
      {!collapsed && (
      <div className="gs-heatmap-grid">
        {items.map((row, i) => {
          const pct = (sizes[i] / totalSize) * 100;
          const minPct = Math.max(pct, 100 / items.length * 0.4);
          const bg =
            mode === 'daily'
              ? getDailyColor(row.changePercent)
              : getIntrinsicColor(row.pBook, row.price, row.bookValue);
          const label = formatLabel(mode, row);
          const lines = label.split('\n');

          return (
            <div
              key={row.ticker}
              className="gs-heatmap-tile"
              style={{
                flexBasis: `${minPct}%`,
                flexGrow: pct,
                backgroundColor: bg,
              }}
              title={label.replace('\n', ' ')}
            >
              <span className="gs-heatmap-tile-ticker">{lines[0]}</span>
              {lines[1] && <span className="gs-heatmap-tile-value">{lines[1]}</span>}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
