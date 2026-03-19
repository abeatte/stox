import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToolBar } from './ToolBar';

function setup(overrides: Partial<Parameters<typeof ToolBar>[0]> = {}) {
  const props = {
    searchQuery: '',
    onSearchChange: vi.fn(),
    onAddTicker: vi.fn(() => null as string | null),
    onExport: vi.fn(),
    hasData: true,
    ...overrides,
  };
  render(<ToolBar {...props} />);
  return props;
}

describe('ToolBar', () => {
  it('renders search input, add form, and export button', () => {
    setup();
    expect(screen.getByLabelText('Search tickers')).toBeInTheDocument();
    expect(screen.getByLabelText('Ticker symbols, comma separated')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search', () => {
    const props = setup();
    fireEvent.change(screen.getByLabelText('Search tickers'), {
      target: { value: 'AAPL' },
    });
    expect(props.onSearchChange).toHaveBeenCalledWith('AAPL');
  });

  it('calls onAddTicker on form submit and clears input on success', () => {
    const props = setup();
    const input = screen.getByLabelText('Ticker symbols, comma separated');
    fireEvent.change(input, { target: { value: 'MSFT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(props.onAddTicker).toHaveBeenCalledWith('MSFT');
    expect(input).toHaveValue('');
  });

  it('shows validation error for empty ticker', () => {
    setup({
      onAddTicker: vi.fn(() => 'Ticker symbol cannot be empty.'),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ticker symbol cannot be empty.'
    );
  });

  it('shows validation error for duplicate ticker', () => {
    setup({
      onAddTicker: vi.fn(() => 'Ticker already in list.'),
    });
    const input = screen.getByLabelText('Ticker symbols, comma separated');
    fireEvent.change(input, { target: { value: 'AAPL' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ticker already in list.'
    );
  });

  it('disables export button and shows tooltip when no data', () => {
    setup({ hasData: false });
    const btn = screen.getByRole('button', { name: 'Export CSV' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', 'No data to export.');
  });

  it('enables export button when data exists', () => {
    setup({ hasData: true });
    const btn = screen.getByRole('button', { name: 'Export CSV' });
    expect(btn).toBeEnabled();
    expect(btn).not.toHaveAttribute('title');
  });

  it('calls onExport when export button is clicked', () => {
    const props = setup({ hasData: true });
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(props.onExport).toHaveBeenCalled();
  });
});
