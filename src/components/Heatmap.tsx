import { useMemo, useState } from 'react';
import type { StockRowData } from '../types';

type HeatmapMode = 'daily' | 'intrinsic';

interface HeatmapProps {
  rowDataMap: Map<string, StockRowData | null>;
  tickers: string[];
  /** Incremented whenever row data changes, to bust memoisation on the mutable map. */
  dataVersion: number;
}

/**
 * Returns a CSS background color on a red-to-green pastel scale.
 * Neutral = light grey, positive = soft green, negative = soft red.
 */
function getDailyColor(changePercent: number | null): string {
  if (changePercent === null) return '#e8eaed';
  // Clamp to ±5% for color scaling
  const clamped = Math.max(-5, Math.min(5, changePercent));
  const ratio = clamped / 5; // -1 to 1
  if (ratio >= 0) {
    // soft green: from #e8eaed (neutral) toward #ceead6 (green tint)
    const r = Math.round(232 - ratio * 60);
    const g = Math.round(234 - ratio * 4);
    const b = Math.round(237 - ratio * 70);
    return `rgb(${r}, ${g}, ${b})`;
  }
  // soft red: from #e8eaed (neutral) toward #f5c6c6 (red tint)
  const absR = Math.abs(ratio);
  const r = Math.round(232 + absR * 13);
  const g = Math.round(234 - absR * 46);
  const b = Math.round(237 - absR * 49);
  return `rgb(${r}, ${g}, ${b})`;
}

function getIntrinsicColor(pBook: number | null, price: number | null, bookValue: number | null): string {
  if (pBook === null || price === null || bookValue === null) return '#e8eaed';
  const low = 0.5;
  const high = 2.0;
  const clamped = Math.max(low, Math.min(high, pBook));
  const ratio = (clamped - low) / (high - low); // 0 (green/undervalued) to 1 (red/overvalued)

  // Soft green (#ceead6) to soft red (#f5c6c6)
  const r = Math.round(206 + ratio * 39);
  const g = Math.round(234 - ratio * 36);
  const b = Math.round(214 - ratio * 16);
  return `rgb(${r}, ${g}, ${b})`;
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
