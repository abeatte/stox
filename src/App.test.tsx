import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders EmptyState when no tickers are configured', () => {
    render(<App />);
    expect(screen.getByText('No tickers configured. Add a ticker above.')).toBeInTheDocument();
  });

  it('renders TickerTable when tickers exist', () => {
    localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
    render(<App />);
    expect(screen.getByRole('table', { name: 'Ticker table' })).toBeInTheDocument();
  });
});
