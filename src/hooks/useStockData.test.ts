import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStockData } from './useStockData';

// ---------------------------------------------------------------------------
// EventSource mock
// ---------------------------------------------------------------------------

type MessageHandler = (event: { data: string }) => void;
type ErrorHandler = () => void;

interface MockEventSourceInstance {
  onmessage: MessageHandler | null;
  onerror: ErrorHandler | null;
  close: ReturnType<typeof vi.fn>;
  /** Test helper — push a raw SSE data string to onmessage */
  emit: (data: string) => void;
  /** Test helper — trigger onerror */
  triggerError: () => void;
}

// Tracks the most recently created EventSource instance
let lastEventSource: MockEventSourceInstance | null = null;

class MockEventSource implements MockEventSourceInstance {
  onmessage: MessageHandler | null = null;
  onerror: ErrorHandler | null = null;
  close = vi.fn();

  constructor(public url: string) {
    lastEventSource = this;
  }

  emit(data: string) {
    this.onmessage?.({ data });
  }

  triggerError() {
    this.onerror?.();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sendProgress(stage: number, totalStages: number, stageLabel: string) {
  lastEventSource!.emit(JSON.stringify({ type: 'progress', stage, totalStages, stageLabel }));
}

function sendData(payload: Record<string, unknown>) {
  lastEventSource!.emit(JSON.stringify({ type: 'data', payload }));
}

function sendError(message: string) {
  lastEventSource!.emit(JSON.stringify({ type: 'error', message }));
}

const basePayload: Record<string, unknown> = {
  ticker: 'AAPL',
  price: 185.5,
  changePercent: 1.25,
  date: '2025-03-18',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  divYield: 0.52,
  eps: 6.42,
  totalAssets: 352583000000,
  goodwillNet: 0,
  intangiblesNet: 0,
  liabilitiesTotal: 290437000000,
  sharesOutstanding: 15460000000,
  dividendPercent: 0.96,
  bookValue: null,
  priceToBook: null,
  relatedTickers: [],
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  lastEventSource = null;
  vi.stubGlobal('EventSource', MockEventSource);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useStockData', () => {
  it('starts in loading state with no data', () => {
    const { result } = renderHook(() => useStockData('AAPL'));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
    expect(result.current.progress).toBeNull();
  });

  it('opens an SSE connection to the correct URL', () => {
    renderHook(() => useStockData('AAPL'));
    expect(lastEventSource?.url).toBe(
      'http://localhost:3001/api/stock/AAPL/stream',
    );
  });

  it('uppercases the ticker in the URL', () => {
    renderHook(() => useStockData('aapl'));
    expect(lastEventSource?.url).toBe(
      'http://localhost:3001/api/stock/AAPL/stream',
    );
  });

  it('does not open a connection for an empty ticker', () => {
    renderHook(() => useStockData(''));
    expect(lastEventSource).toBeNull();
  });

  it('does not open a connection for a whitespace-only ticker', () => {
    renderHook(() => useStockData('   '));
    expect(lastEventSource).toBeNull();
  });

  it('updates progress state on progress events', async () => {
    const { result } = renderHook(() => useStockData('AAPL'));

    act(() => sendProgress(0, 4, 'queued'));
    expect(result.current.progress).toEqual({ stage: 0, totalStages: 4, stageLabel: 'queued' });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();

    act(() => sendProgress(1, 4, 'quote summary'));
    expect(result.current.progress).toEqual({ stage: 1, totalStages: 4, stageLabel: 'quote summary' });

    act(() => sendProgress(3, 4, 'balance sheet'));
    expect(result.current.progress).toEqual({ stage: 3, totalStages: 4, stageLabel: 'balance sheet' });
  });

  it('resolves with data and clears loading/progress on data event', async () => {
    const { result } = renderHook(() => useStockData('AAPL'));

    act(() => sendProgress(1, 4, 'quote summary'));
    expect(result.current.progress).not.toBeNull();

    act(() => sendData(basePayload));

    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data!.ticker).toBe('AAPL');
    expect(result.current.data!.price).toBe(185.5);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.progress).toBeNull();
  });

  it('closes the EventSource after receiving data', async () => {
    const { result } = renderHook(() => useStockData('AAPL'));
    const es = lastEventSource!;

    act(() => sendData(basePayload));
    await waitFor(() => expect(result.current.data).not.toBeNull());

    expect(es.close).toHaveBeenCalled();
  });

  it('sets error state on error event', async () => {
    const { result } = renderHook(() => useStockData('AAPL'));

    act(() => sendError('Scrape failed'));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.progress).toBeNull();
  });

  it('sets error state on EventSource onerror', async () => {
    const { result } = renderHook(() => useStockData('AAPL'));

    act(() => lastEventSource!.triggerError());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('closes the EventSource on unmount', () => {
    const { unmount } = renderHook(() => useStockData('AAPL'));
    const es = lastEventSource!;
    unmount();
    expect(es.close).toHaveBeenCalled();
  });

  it('re-opens the stream when ticker changes', async () => {
    const { result, rerender } = renderHook(({ ticker }) => useStockData(ticker), {
      initialProps: { ticker: 'AAPL' },
    });

    const firstEs = lastEventSource!;
    expect(firstEs.url).toContain('AAPL');

    rerender({ ticker: 'MSFT' });

    await waitFor(() => expect(lastEventSource?.url).toContain('MSFT'));
    // Old connection should be closed
    expect(firstEs.close).toHaveBeenCalled();
    // New connection should be open
    expect(result.current.isLoading).toBe(true);
  });

  it('re-opens the stream when refetch is called', async () => {
    const { result } = renderHook(() => useStockData('AAPL'));

    // Complete the first fetch
    act(() => sendData(basePayload));
    await waitFor(() => expect(result.current.data).not.toBeNull());

    const firstEs = lastEventSource!;

    // Trigger refetch
    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(lastEventSource).not.toBe(firstEs);
    expect(result.current.data).toBeNull();
  });

  it('normalizes the data payload via normalizeStockData', async () => {
    const { result } = renderHook(() => useStockData('AAPL'));

    // Send payload with extra unknown fields and string numbers that should be coerced
    act(() => sendData({ ...basePayload, price: '185.5', unknownField: 'ignored' }));

    await waitFor(() => expect(result.current.data).not.toBeNull());
    // price should be coerced to number
    expect(result.current.data!.price).toBe(185.5);
  });

  it('ignores malformed SSE messages', () => {
    const { result } = renderHook(() => useStockData('AAPL'));

    act(() => lastEventSource!.emit('not valid json {{{'));

    // Should remain in loading state, no crash
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('full queued → scraping → complete flow', async () => {
    const { result } = renderHook(() => useStockData('AAPL'));

    // 1. Queued
    act(() => sendProgress(0, 4, 'queued'));
    expect(result.current.progress?.stageLabel).toBe('queued');
    expect(result.current.isLoading).toBe(true);

    // 2. Scraping stages
    act(() => sendProgress(0, 4, 'quote summary'));
    expect(result.current.progress?.stageLabel).toBe('quote summary');

    act(() => sendProgress(1, 4, 'real-time price'));
    expect(result.current.progress?.stageLabel).toBe('real-time price');

    act(() => sendProgress(2, 4, 'balance sheet'));
    expect(result.current.progress?.stageLabel).toBe('balance sheet');

    act(() => sendProgress(3, 4, 'profile'));
    expect(result.current.progress?.stageLabel).toBe('profile');

    // 3. Data arrives
    act(() => sendData(basePayload));
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.progress).toBeNull();
  });
});
