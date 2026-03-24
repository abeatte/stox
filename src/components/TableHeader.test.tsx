import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TableHeader } from './TableHeader';
import { COLUMNS } from '../columns';
import type { ColumnKey } from '../types';

/** Build a default columnWidths map so tests don't need to spell it out. */
function defaultWidths(): Record<ColumnKey, number> {
  const map = {} as Record<ColumnKey, number>;
  for (const col of COLUMNS) map[col.key] = 100;
  return map;
}

const baseProps = {
  columnWidths: defaultWidths(),
  onResizeStart: () => {},
  onAutoFit: () => {},
  isResizingRef: { current: false },
};

describe('TableHeader', () => {
  it('renders all column headers including star', () => {
    render(
      <table>
        <TableHeader sortColumn={null} sortDirection="asc" onSort={() => {}} {...baseProps} />
      </table>,
    );
    const headers = screen.getAllByRole('columnheader');
    // 17 data columns + star column + 1 empty header for the remove-button column
    expect(headers).toHaveLength(COLUMNS.length + 2);
    COLUMNS.forEach((col, i) => {
      expect(headers[i]).toHaveTextContent(col.label);
    });
    // Star header is second from right
    expect(headers[COLUMNS.length]).toHaveAttribute('aria-label', 'Star');
  });

  it('calls onSort with the column key when a header is clicked', () => {
    const onSort = vi.fn();
    render(
      <table>
        <TableHeader sortColumn={null} sortDirection="asc" onSort={onSort} {...baseProps} />
      </table>,
    );
    fireEvent.click(screen.getByText('Price'));
    expect(onSort).toHaveBeenCalledWith('price');
  });

  it('shows ▲ indicator on the active column when ascending', () => {
    render(
      <table>
        <TableHeader sortColumn="price" sortDirection="asc" onSort={() => {}} {...baseProps} />
      </table>,
    );
    const priceHeader = screen.getByText('Price').closest('th')!;
    expect(priceHeader.textContent).toContain('▲');
    expect(priceHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  it('shows ▼ indicator on the active column when descending', () => {
    render(
      <table>
        <TableHeader sortColumn="eps" sortDirection="desc" onSort={() => {}} {...baseProps} />
      </table>,
    );
    const epsHeader = screen.getByText('EPS').closest('th')!;
    expect(epsHeader.textContent).toContain('▼');
    expect(epsHeader).toHaveAttribute('aria-sort', 'descending');
  });

  it('does not show sort indicator on inactive columns', () => {
    render(
      <table>
        <TableHeader sortColumn="price" sortDirection="asc" onSort={() => {}} {...baseProps} />
      </table>,
    );
    const tickerHeader = screen.getByText('Ticker').closest('th')!;
    expect(tickerHeader.textContent).not.toContain('▲');
    expect(tickerHeader.textContent).not.toContain('▼');
    expect(tickerHeader).not.toHaveAttribute('aria-sort');
  });

  it('calls onSort with "star" when star header is clicked', () => {
    const onSort = vi.fn();
    render(
      <table>
        <TableHeader sortColumn={null} sortDirection="asc" onSort={onSort} {...baseProps} />
      </table>,
    );
    const starHeader = screen.getByLabelText('Star');
    fireEvent.click(starHeader);
    expect(onSort).toHaveBeenCalledWith('star');
  });

  it('shows sort indicator on star header when star is the active sort column', () => {
    render(
      <table>
        <TableHeader sortColumn="star" sortDirection="asc" onSort={() => {}} {...baseProps} />
      </table>,
    );
    const starHeader = screen.getByLabelText('Star');
    expect(starHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(starHeader.textContent).toContain('▲');
  });

  it('shows descending indicator on star header', () => {
    render(
      <table>
        <TableHeader sortColumn="star" sortDirection="desc" onSort={() => {}} {...baseProps} />
      </table>,
    );
    const starHeader = screen.getByLabelText('Star');
    expect(starHeader).toHaveAttribute('aria-sort', 'descending');
    expect(starHeader.textContent).toContain('▼');
  });
});
