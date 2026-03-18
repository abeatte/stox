import { useState, useCallback, useRef } from 'react';
import { COLUMNS } from '../columns';
import type { ColumnKey } from '../types';

/** Sensible default widths per column type (px). */
function defaultWidth(key: ColumnKey): number {
  switch (key) {
    case 'ticker':
      return 80;
    case 'date':
      return 100;
    case 'interest':
      return 100;
    case 'sharesOutstanding':
      return 200;
    case 'liabilitiesTotal':
    case 'tangibleBookValue':
      return 140;
    case 'totalAssets':
    case 'goodwillNet':
    case 'intangiblesNet':
      return 120;
    default:
      return 100;
  }
}

const MIN_WIDTH = 40;

function buildInitialWidths(): Record<ColumnKey, number> {
  const map = {} as Record<ColumnKey, number>;
  for (const col of COLUMNS) {
    map[col.key] = defaultWidth(col.key);
  }
  return map;
}

/**
 * Hook that manages per-column widths and provides a mousedown handler
 * for drag-to-resize behaviour (Google Sheets style).
 *
 * Also exposes `isResizing` — a ref-backed flag that the click handler
 * on <th> can check to suppress sorting when a resize just finished.
 */
export function useColumnResize() {
  const [widths, setWidths] = useState<Record<ColumnKey, number>>(buildInitialWidths);

  // Track drag state in a ref so mousemove/mouseup don't need React state updates per pixel.
  const dragRef = useRef<{ key: ColumnKey; startX: number; startW: number } | null>(null);

  // Flag that stays true from mousedown on the handle until the click event
  // has had a chance to fire (and be suppressed).
  const isResizingRef = useRef(false);

  const onResizeStart = useCallback(
    (key: ColumnKey, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startW = widths[key];
      dragRef.current = { key, startX, startW };
      isResizingRef.current = true;

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const diff = ev.clientX - dragRef.current.startX;
        const newW = Math.max(MIN_WIDTH, dragRef.current.startW + diff);
        setWidths((prev) => ({ ...prev, [dragRef.current!.key]: newW }));
      };

      const onMouseUp = () => {
        dragRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // Clear the flag after a tick so the click event (which fires
        // right after mouseup) still sees it as true and gets suppressed.
        requestAnimationFrame(() => {
          isResizingRef.current = false;
        });
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [widths],
  );

  return { widths, onResizeStart, isResizingRef };
}
