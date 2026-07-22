/**
 * CSV import — the symmetric counterpart to csvExporter.ts.
 *
 * Extracts ticker symbols from an uploaded CSV. Handles:
 *   - Stox's own export (a "Ticker" header row followed by data rows; the
 *     ticker is column 0, later cells may be quoted values containing commas).
 *   - A plain one-per-line list ("AAPL\nMSFT\nGOOG").
 *   - A single comma-separated line ("AAPL,MSFT,GOOG").
 * Symbols are upper-cased, validated, and de-duplicated (order preserved).
 */

/** A valid ticker: 1–10 chars, letters plus optional '.'/'-' (e.g. BRK.B, 005930.KS). */
const TICKER_RE = /^[A-Za-z][A-Za-z.-]{0,9}$/;

/** Header labels (case-insensitive) that indicate the first column is tickers. */
const HEADER_LABELS = new Set(['ticker', 'symbol', 'tickers', 'symbols']);

/**
 * Minimal RFC 4180 CSV parser: returns a 2D array of cells, honouring
 * double-quoted fields (which may contain commas, escaped "" quotes, and
 * newlines). Strips a leading UTF-8 BOM and normalises CRLF.
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  const s = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } // escaped quote
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/**
 * Parse ticker symbols out of CSV text. Returns a de-duplicated, upper-cased
 * list of valid symbols (empty if none found).
 */
export function parseTickersFromCsv(text: string): string[] {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];

  // Drop a leading header row (e.g. Stox export's "Ticker,Price,…").
  let dataRows = rows;
  const firstCell = (rows[0][0] ?? '').trim().toLowerCase();
  if (HEADER_LABELS.has(firstCell)) dataRows = rows.slice(1);

  // A single row of multiple ticker-like cells is a flat "AAPL,MSFT,GOOG" list.
  let candidates: string[];
  if (
    dataRows.length === 1 &&
    dataRows[0].length > 1 &&
    dataRows[0].every((c) => c.trim() === '' || TICKER_RE.test(c.trim()))
  ) {
    candidates = dataRows[0];
  } else {
    // Otherwise the ticker is the first column of each row.
    candidates = dataRows.map((r) => r[0] ?? '');
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of candidates) {
    const t = c.trim().toUpperCase();
    if (t && TICKER_RE.test(t) && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}
