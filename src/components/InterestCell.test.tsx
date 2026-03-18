import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InterestCell } from './InterestCell';

describe('InterestCell', () => {
  it('renders an input with the provided value', () => {
    render(<InterestCell ticker="AAPL" value="BUY" onChange={vi.fn()} />);
    const input = screen.getByLabelText(/interest for aapl/i);
    expect(input).toHaveValue('BUY');
  });

  it('calls onChange with ticker and new value on input change', () => {
    const onChange = vi.fn();
    render(<InterestCell ticker="MSFT" value="" onChange={onChange} />);
    const input = screen.getByLabelText(/interest for msft/i);
    fireEvent.change(input, { target: { value: 'WATCH' } });
    expect(onChange).toHaveBeenCalledWith('MSFT', 'WATCH');
  });

  it('renders an empty input when value is empty string', () => {
    render(<InterestCell ticker="GOOG" value="" onChange={vi.fn()} />);
    const input = screen.getByLabelText(/interest for goog/i);
    expect(input).toHaveValue('');
  });

  it('accepts free-text input of any string value', () => {
    const onChange = vi.fn();
    render(<InterestCell ticker="TSLA" value="" onChange={onChange} />);
    const input = screen.getByLabelText(/interest for tsla/i);
    fireEvent.change(input, { target: { value: 'Strong buy - long term hold' } });
    expect(onChange).toHaveBeenCalledWith('TSLA', 'Strong buy - long term hold');
  });
});
