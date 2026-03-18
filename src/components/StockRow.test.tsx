import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StockRow } from './StockRow';
import { StockRowData } from '../types';
import { COLUMNS } from '../columns';

const mockData: StockRowData = {
  ticker: 'AAPL',
  price: 185.5,
  date: '2024-01-15',
  divYield: 0.52,
  eps: 6.42,
  totalAssets: 352583000000,
  goodwillNet: 0,
  intangiblesNet: 0,
  liabilitiesTotal: 290437000000,
  sharesOutstanding: 15460000000,
  bookValue: 4.02,
  pBook: 46.14,
  tangibleBookValue: 4.02,
  pTangbook: 46.14,
  dividendPercent: 0.96,
  eps20x: 128.4,
  eps15x: 96.3,
  priceEarnings: 28.89,
  interest: 'BUY',
};

const defaultProps = {
  ticker: 'AAPL',
  data: mockData,
  isLoading: false,
  isError: false,
  interest: 'BUY',
  onInterestChange: vi.fn(),
  onRemove: vi.fn(),
};

function renderRow(props = {}) {
  return render(
    <table>
      <tbody>
        <StockRow {...defaultProps} {...props} />
      </tbody>
    </table>,
  );
}

describe('StockRow', () => {
  it('renders formatted values for all columns', () => {
    renderRow();
    // Ticker column
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    // Date column
    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
    // Remove button
    expect(screen.getByRole('button', { name: /remove aapl/i })).toBeInTheDocument();
  });

  it('renders the correct number of cells (19 columns + remove button)', () => {
    renderRow();
    const row = screen.getAllByRole('row')[0];
    const cells = row.querySelectorAll('td');
    expect(cells).toHaveLength(COLUMNS.length + 1);
  });

  it('shows loading state when isLoading is true and no data', () => {
    renderRow({ isLoading: true, data: null });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows error state when isError is true and no data', () => {
    renderRow({ isError: true, data: null });
    expect(screen.getByText('Error loading data')).toBeInTheDocument();
  });

  it('renders data even when isLoading is true if data exists (background refresh)', () => {
    renderRow({ isLoading: true, data: mockData });
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('renders data even when isError is true if data exists (stale data)', () => {
    renderRow({ isError: true, data: mockData });
    expect(screen.queryByText('Error loading data')).not.toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('calls onRemove with the ticker when remove button is clicked', () => {
    const onRemove = vi.fn();
    renderRow({ onRemove });
    fireEvent.click(screen.getByRole('button', { name: /remove aapl/i }));
    expect(onRemove).toHaveBeenCalledWith('AAPL');
  });

  it('renders interest input with correct value', () => {
    renderRow();
    const input = screen.getByLabelText(/interest for aapl/i);
    expect(input).toHaveValue('BUY');
  });

  it('calls onInterestChange when interest input changes', () => {
    const onInterestChange = vi.fn();
    renderRow({ onInterestChange });
    const input = screen.getByLabelText(/interest for aapl/i);
    fireEvent.change(input, { target: { value: 'SELL' } });
    expect(onInterestChange).toHaveBeenCalledWith('AAPL', 'SELL');
  });

  it('shows N/A for null values', () => {
    const nullData: StockRowData = {
      ...mockData,
      price: null,
      eps: null,
      bookValue: null,
    };
    renderRow({ data: nullData });
    const cells = screen.getAllByText('N/A');
    expect(cells.length).toBeGreaterThanOrEqual(3);
  });
});
