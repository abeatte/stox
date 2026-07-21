/**
 * Pure, dependency-free parsing helpers for Yahoo Finance balance-sheet text.
 *
 * This module deliberately has NO puppeteer / DOM / node runtime dependency so
 * the parsing logic can be unit-tested directly against captured page text.
 * scraper.ts feeds it `document.body.innerText` from the balance-sheet page.
 */

/** The raw (string) balance-sheet cells extracted from the statement table. */
export interface BalanceSheetValues {
  totalAssets: string | null;
  goodwillNet: string | null;
  intangiblesNet: string | null;
  liabilitiesTotal: string | null;
  sharesOutstanding: string | null;
}

/** Matches a numeric value cell: 352.76B / 1.2T / 950.5M / 15,940 / -1.2B / (1.2B) / "--". */
const VALUE_RE = /^\(?-?\$?[\d,]+(\.\d+)?[KMBT]?\)?$/i;

/** A period-column header cell: a M/D/YYYY date or "TTM". */
const DATE_RE = /^(\d{1,2}\/\d{1,2}\/\d{4}|TTM)$/;

const MAGNITUDE: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };

/**
 * Parse a Yahoo balance-sheet figure into an absolute number.
 * Handles magnitude suffixes ("352.76B" -> 3.5276e11), thousands separators,
 * currency signs, and parenthesised negatives ("(1.2B)" -> -1.2e9).
 * Returns null for missing/placeholder values ("--", "N/A", "").
 */
export function parseNum(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  let str = raw.trim().replace(/[$,\s]/g, '');
  if (str === '' || str === '--' || str === 'N/A') return null;
  const neg = str.startsWith('(') && str.endsWith(')');
  if (neg) str = str.slice(1, -1);
  const m = str.match(/^(-?\d+(?:\.\d+)?)([KMBT])?$/i);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (isNaN(n)) return null;
  const mult = MAGNITUDE[(m[2] ?? '').toUpperCase()] ?? 1;
  n *= mult;
  // Multiplying a decimal mantissa by a large magnitude introduces float
  // artifacts (e.g. 33.38 * 1e9 = 33380000000.000004). These figures are in
  // thousands or larger, so sub-unit precision is meaningless — round to an
  // integer. Un-suffixed values (prices like 42.50) are left untouched.
  if (mult !== 1) n = Math.round(n);
  return neg ? -Math.abs(n) : n;
}

function isValueCell(s: string | undefined): boolean {
  return s === '--' || (s != null && VALUE_RE.test(s));
}

/**
 * Given the balance-sheet page text split into trimmed lines, return the value
 * cell for a labelled row from the MOST RECENT period column.
 *
 * Two subtleties this handles:
 *  - Yahoo lays out period columns oldest -> newest, so the most recent value
 *    is NOT necessarily the first cell. We read the "Breakdown" header dates to
 *    locate the latest column (TTM always wins).
 *  - Some labels (e.g. "Total Assets") also appear in a chart legend where the
 *    following line is another label, not a number — we skip those.
 */
export function getLatestValue(lines: string[], label: string): string | null {
  let numCols = 0;
  let latestIdx = 0;
  const hdr = lines.indexOf('Breakdown');
  if (hdr >= 0) {
    const cols: string[] = [];
    for (let i = hdr + 1; i < lines.length && DATE_RE.test(lines[i]); i++) cols.push(lines[i]);
    numCols = cols.length;
    let best = -Infinity;
    cols.forEach((c, idx) => {
      const t = c === 'TTM' ? Infinity : Date.parse(c);
      if (!Number.isNaN(t) && t > best) { best = t; latestIdx = idx; }
    });
  }

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== label || !isValueCell(lines[i + 1])) continue;
    const vals: string[] = [];
    for (let j = i + 1; j < lines.length && isValueCell(lines[j]); j++) {
      vals.push(lines[j]);
      if (numCols > 0 && vals.length >= numCols) break;
    }
    if (vals.length === 0) continue;
    const idx = numCols > 0 && latestIdx < vals.length ? latestIdx : vals.length - 1;
    return vals[idx];
  }
  return null;
}

/**
 * Extract the balance-sheet cells we care about from the page's innerText.
 * Requires the statement to be fully expanded (Goodwill / Other Intangible
 * Assets are nested rows that only appear after "Expand All").
 */
export function extractBalanceSheetValues(bodyText: string): BalanceSheetValues {
  const lines = bodyText.split('\n').map((l) => l.trim());
  const v = (label: string): string | null => getLatestValue(lines, label);
  return {
    totalAssets: v('Total Assets'),
    goodwillNet: v('Goodwill'),
    intangiblesNet: v('Other Intangible Assets'),
    liabilitiesTotal: v('Total Liabilities Net Minority Interest'),
    sharesOutstanding: v('Share Issued') ?? v('Ordinary Shares Number'),
  };
}
