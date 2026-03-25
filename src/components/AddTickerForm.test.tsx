import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddTickerForm } from './AddTickerForm';

function setup(overrides: Partial<Parameters<typeof AddTickerForm>[0]> = {}) {
  const props = {
    onAddTicker: vi.fn(() => null as string | null),
    ...overrides,
  };
  render(<AddTickerForm {...props} />);
  return props;
}

describe('AddTickerForm', () => {
  it('renders with default placeholder and label', () => {
    setup();
    expect(screen.getByLabelText('Ticker symbols, comma separated')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('accepts custom placeholder and label', () => {
    setup({ placeholder: 'Enter ticker', inputLabel: 'Custom label' });
    expect(screen.getByLabelText('Custom label')).toBeInTheDocument();
    expect(screen.getByLabelText('Custom label')).toHaveAttribute('placeholder', 'Enter ticker');
  });

  it('calls onAddTicker on form submit', () => {
    const props = setup();
    const input = screen.getByLabelText('Ticker symbols, comma separated');
    fireEvent.change(input, { target: { value: 'AAPL' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(props.onAddTicker).toHaveBeenCalledWith('AAPL');
  });

  it('clears input on successful add', () => {
    setup();
    const input = screen.getByLabelText('Ticker symbols, comma separated');
    fireEvent.change(input, { target: { value: 'AAPL' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(input).toHaveValue('');
  });

  it('shows validation error when onAddTicker returns error', () => {
    setup({ onAddTicker: vi.fn(() => 'Ticker symbol cannot be empty.') });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Ticker symbol cannot be empty.');
  });

  it('clears error when user types', () => {
    setup({ onAddTicker: vi.fn(() => 'Error') });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Ticker symbols, comma separated'), { target: { value: 'A' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears input when result starts with "Added"', () => {
    setup({ onAddTicker: vi.fn(() => 'Added 1, skipped duplicates: AAPL') });
    const input = screen.getByLabelText('Ticker symbols, comma separated');
    fireEvent.change(input, { target: { value: 'AAPL,MSFT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(input).toHaveValue('');
  });
});
