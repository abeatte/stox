import { useState, useCallback, useRef } from 'react';
import { COLUMNS } from '../columns';
import type { ColumnKey } from '../types';

/** Width reserved for the remove-button column (px). */
const REMOVE_COL_WIDTH = 36;

const MIN_WIDTH = 40;
/** Extra padding to account for cell padding (10px each side) */
const AUTOFIT_PAD = 22;

function buildInitialWidths(): Record<ColumnKey, number> {
  const available = (typeof window !== 'undefined' ? window.innerWidth : 1200) - REMOVE_COL_WIDTH;
  const perCol = Math.max(MIN_WIDTH, Math.floor(available / COLUMNS.length));
  const map = {} as Record<ColumnKey, number>;
  for (const col of COLUMNS) {
    map[col.key] = perCol;
  }
  return map;
}

/** Resolve the column index for a given ColumnKey. */
function colIndex(key: ColumnKey): number {
  return COLUMNS.findIndex((c) => c.key === key);
}

/**
 * Hook that manages per-column widths and provides handlers for
 * drag-to-resize and double-click-to-autofit (Google Sheets style).
 */
export function useColumnResize() {
  const [widths, setWidths] = useState<Record<ColumnKey, number>>(buildInitialWidths);

  const dragRef = useRef<{ key: ColumnKey; startX: number; startW: number } | null>(null);
  const isResizingRef = useRef(false);

  /** Ref to the <table> element — set by TickerTable. */
  const tableRef = useRef<HTMLTableElement | null>(null);

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

  /**
   * Double-click handler: auto-fit column width to its content.
   * Temporarily removes the fixed width so cells can expand to their
   * natural size, measures the widest cell, then locks the width.
   */
  const onAutoFit = useCallback((key: ColumnKey) => {
    const table = tableRef.current;
    if (!table) return;

    const idx = colIndex(key);
    if (idx === -1) return;

    // Temporarily set width to 0 on the <col> so scrollWidth reflects content
    const col = table.querySelector('colgroup')?.children[idx] as HTMLElement | undefined;
    const prevWidth = col?.style.width;
    if (col) col.style.width = '0px';

    let maxW = MIN_WIDTH;
    const rows = table.querySelectorAll('tr');
    for (const row of rows) {
      const cell = row.children[idx] as HTMLElement | undefined;
      if (cell) {
        maxW = Math.max(maxW, cell.scrollWidth + AUTOFIT_PAD);
      }
    }

    // Restore previous width before setting state (avoids flicker)
    if (col && prevWidth !== undefined) col.style.width = prevWidth;

    setWidths((prev) => ({ ...prev, [key]: maxW }));
  }, []);

  return { widths, onResizeStart, onAutoFit, isResizingRef, tableRef };
}
