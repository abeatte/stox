import { COLUMNS } from '../columns';
import { StockRowData } from '../types';
import { formatValue } from './formatters';

/**
 * Escape a CSV cell value per RFC 4180:
 * If the value contains commas, double-quotes, or newlines,
 * wrap it in double-quotes and escape internal double-quotes by doubling them.
 */
function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate a CSV string from an array of StockRowData.
 * Header row uses the label from each ColumnDef (19 columns in order).
 * Each data row contains formatted values matching the UI display.
 */
export function generateCsv(rows: StockRowData[]): string {
  const headerRow = COLUMNS.map((col) => escapeCsvCell(col.label)).join(',');

  const dataRows = rows.map((row) =>
    COLUMNS.map((col) => {
      const value = row[col.key];
      const formatted = formatValue(value, col.type);
      return escapeCsvCell(formatted);
    }).join(','),
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Build an export filename with the current ISO 8601 timestamp.
 * Format: stox-export-{ISO8601}.csv
 */
export function buildExportFilename(): string {
  const timestamp = new Date().toISOString();
  return `stox-export-${timestamp}.csv`;
}

/**
 * Trigger a browser download of a CSV string as a file.
 */
export function downloadCsv(csvString: string, filename: string): void {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
