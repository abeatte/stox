import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from './App';

/** Flush pending microtask-scheduled state updates (react-query ping,
 *  useStockData fetch/SSE fallback) inside act() so they don't warn. */
const flush = () => act(async () => { await Promise.resolve(); });

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    // Keep network calls pending so async effects don't resolve with real data.
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders EmptyState when no tickers are configured', async () => {
    render(<App />);
    expect(screen.getByText('No tickers configured. Add a ticker to get started.')).toBeInTheDocument();
    await flush();
  });

  it('renders TickerTable when tickers exist', async () => {
    localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
    render(<App />);
    expect(screen.getByRole('table', { name: 'Ticker table' })).toBeInTheDocument();
    await flush();
  });
});
