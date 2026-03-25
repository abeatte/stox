import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from './EmptyState';

function setup(overrides: Partial<Parameters<typeof EmptyState>[0]> = {}) {
  const props = {
    onAddTicker: vi.fn(() => null as string | null),
    onHelpOpen: vi.fn(),
    ...overrides,
  };
  render(<EmptyState {...props} />);
  return props;
}

describe('EmptyState', () => {
  it('renders the empty state message', () => {
    setup();
    expect(screen.getByText('No tickers configured. Add a ticker to get started.')).toBeInTheDocument();
  });

  it('renders the add ticker form', () => {
    setup();
    expect(screen.getByLabelText('Ticker symbol')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('has role="status" for accessibility', () => {
    setup();
    expect(screen.getByRole('status', { name: 'Empty state' })).toBeInTheDocument();
  });

  it('calls onAddTicker on form submit', () => {
    const props = setup();
    const input = screen.getByLabelText('Ticker symbol');
    fireEvent.change(input, { target: { value: 'AAPL' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(props.onAddTicker).toHaveBeenCalledWith('AAPL');
  });

  it('clears input on successful add', () => {
    setup();
    const input = screen.getByLabelText('Ticker symbol');
    fireEvent.change(input, { target: { value: 'AAPL' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(input).toHaveValue('');
  });

  it('shows validation error when onAddTicker returns error', () => {
    setup({ onAddTicker: vi.fn(() => 'Ticker symbol cannot be empty.') });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Ticker symbol cannot be empty.');
  });

  it('does not clear input on validation error', () => {
    setup({ onAddTicker: vi.fn(() => 'Already in list: AAPL') });
    const input = screen.getByLabelText('Ticker symbol');
    fireEvent.change(input, { target: { value: 'AAPL' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(input).toHaveValue('AAPL');
  });

  it('clears error when user types', () => {
    setup({ onAddTicker: vi.fn(() => 'Error') });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Ticker symbol'), { target: { value: 'A' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders help button', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument();
  });

  it('calls onHelpOpen when help button is clicked', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    expect(props.onHelpOpen).toHaveBeenCalled();
  });
});
