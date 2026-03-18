import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TableHeader } from './TableHeader';
import { COLUMNS } from '../columns';

describe('TableHeader', () => {
  it('renders all 19 column headers', () => {
    render(
      <table>
        <TableHeader sortColumn={null} sortDirection="asc" onSort={() => {}} />
      </table>,
    );
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(19);
    COLUMNS.forEach((col, i) => {
      expect(headers[i]).toHaveTextContent(col.label);
    });
  });

  it('calls onSort with the column key when a header is clicked', () => {
    const onSort = vi.fn();
    render(
      <table>
        <TableHeader sortColumn={null} sortDirection="asc" onSort={onSort} />
      </table>,
    );
    fireEvent.click(screen.getByText('Price'));
    expect(onSort).toHaveBeenCalledWith('price');
  });

  it('shows ▲ indicator on the active column when ascending', () => {
    render(
      <table>
        <TableHeader sortColumn="price" sortDirection="asc" onSort={() => {}} />
      </table>,
    );
    const priceHeader = screen.getByText('Price').closest('th')!;
    expect(priceHeader.textContent).toContain('▲');
    expect(priceHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  it('shows ▼ indicator on the active column when descending', () => {
    render(
      <table>
        <TableHeader sortColumn="eps" sortDirection="desc" onSort={() => {}} />
      </table>,
    );
    const epsHeader = screen.getByText('EPS').closest('th')!;
    expect(epsHeader.textContent).toContain('▼');
    expect(epsHeader).toHaveAttribute('aria-sort', 'descending');
  });

  it('does not show sort indicator on inactive columns', () => {
    render(
      <table>
        <TableHeader sortColumn="price" sortDirection="asc" onSort={() => {}} />
      </table>,
    );
    const tickerHeader = screen.getByText('Ticker').closest('th')!;
    expect(tickerHeader.textContent).not.toContain('▲');
    expect(tickerHeader.textContent).not.toContain('▼');
    expect(tickerHeader).not.toHaveAttribute('aria-sort');
  });
});
