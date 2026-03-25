import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
const modKey = isMac ? '⌘' : 'Ctrl';

const sections: { heading: string; items: [string, string][] }[] = [
  {
    heading: 'Adding & Removing Tickers',
    items: [
      ['Add multiple tickers', 'Type comma-separated symbols (e.g. AAPL, MSFT, GOOG) and press Enter'],
      ['Remove a ticker', 'Click the ✕ button on the row'],
      ['Add a related ticker', 'Hover the ticker name to see related tickers, then click +'],
    ],
  },
  {
    heading: 'Sorting',
    items: [
      ['Sort by a column', 'Click the column header (cycles: ascending → descending → clear)'],
      ['Multi-column sort', 'Hold Shift and click additional column headers'],
      ['Sort by starred', 'Click the ★ column header'],
    ],
  },
  {
    heading: 'Searching',
    items: [
      ['Filter tickers', 'Type in the search box to filter by ticker symbol'],
    ],
  },
  {
    heading: 'Column Resizing',
    items: [
      ['Resize a column', 'Drag the right edge of any column header'],
      ['Auto-fit column width', 'Double-click the right edge of a column header'],
    ],
  },
  {
    heading: 'Data & Export',
    items: [
      ['Refresh prices', 'Click the ⟳ Refresh button for latest quotes'],
      ['Export to CSV', 'Click Export CSV to download your table data'],
    ],
  },
  {
    heading: 'Other Features',
    items: [
      ['Star / unstar a ticker', 'Click the ☆ / ★ icon on any row'],
      ['View EPS multiples', 'Hover the EPS cell to see 15x and 20x valuations'],
      ['Open on Yahoo Finance', 'Click any ticker symbol to open its Yahoo Finance page'],
      ['Cell color coding', 'Green = favorable, Yellow = caution, Red = unfavorable'],
    ],
  },
];

export function HelpDialog({ open, onClose }: HelpDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Trap focus inside dialog
  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    if (el) el.focus();
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="gs-help-overlay" onClick={onClose} role="presentation">
      <div
        className="gs-help-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Help and shortcuts"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gs-help-header">
          <span className="gs-help-title">Help & Tips</span>
          <button
            className="gs-help-close"
            onClick={onClose}
            aria-label="Close help"
            type="button"
          >
            ✕
          </button>
        </div>
        <div className="gs-help-body">
          {sections.map((section) => (
            <div key={section.heading} className="gs-help-section">
              <h3>{section.heading}</h3>
              <dl>
                {section.items.map(([term, desc]) => (
                  <div key={term} className="gs-help-row">
                    <dt>{term}</dt>
                    <dd>{desc.replace('Ctrl', modKey)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
