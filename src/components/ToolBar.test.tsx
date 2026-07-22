import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ToolBar } from './ToolBar';

function setup(overrides: Partial<Parameters<typeof ToolBar>[0]> = {}) {
  const props = {
    searchQuery: '',
    onSearchChange: vi.fn(),
    onAddTicker: vi.fn(() => null as string | null),
    onExport: vi.fn(),
    hasData: true,
    onRefresh: vi.fn(),
    isRefreshing: false,
    onHelpOpen: vi.fn(),
    onAddStarred: vi.fn(),
    hasStarred: false,
    isLive: true,
    onToggleLive: vi.fn(),
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
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument();
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

  it('calls onHelpOpen when help button is clicked', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    expect(props.onHelpOpen).toHaveBeenCalled();
  });

  it('renders the Import CSV button and hidden file input', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Import CSV' })).toBeInTheDocument();
    expect(screen.getByLabelText('Import tickers from CSV')).toBeInTheDocument();
  });

  it('imports tickers from an uploaded CSV via onAddTicker', async () => {
    const user = userEvent.setup();
    const onAddTicker = vi.fn(() => null as string | null);
    setup({ onAddTicker });
    const file = new File(['Ticker,Price\nAAPL,$1\nMSFT,$2\n'], 'stox.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText('Import tickers from CSV'), file);
    await waitFor(() => expect(onAddTicker).toHaveBeenCalledWith('AAPL,MSFT'));
    expect(await screen.findByRole('status')).toHaveTextContent('Imported 2 tickers');
  });

  it('shows a message and skips onAddTicker when the CSV has no valid tickers', async () => {
    const user = userEvent.setup();
    const onAddTicker = vi.fn(() => null as string | null);
    setup({ onAddTicker });
    const file = new File(['Ticker,Price\n123,foo\n'], 'bad.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText('Import tickers from CSV'), file);
    expect(await screen.findByRole('status')).toHaveTextContent('No valid tickers found');
    expect(onAddTicker).not.toHaveBeenCalled();
  });
});
