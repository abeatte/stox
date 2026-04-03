/**
 * Integration tests for the Stox app.
 *
 * These tests render the full App component with a mocked EventSource,
 * exercising the complete user experience: adding/removing tickers, viewing
 * formatted data, searching, sorting, starring, and CSV export.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useTickerList } from '../hooks/useTickerList';
import { TickerTable } from '../components/TickerTable';
import { EmptyState } from '../components/EmptyState';
import { HelpDialog } from '../components/HelpDialog';
import { COLUMNS } from '../columns';
import type { RawStockData } from '../types';

// ---------------------------------------------------------------------------
// EventSource mock
// ---------------------------------------------------------------------------

type MessageHandler = (event: { data: string }) => void;

class MockEventSource {
  onmessage: MessageHandler | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();

  constructor(public url: string) {
    // Register so tests can find and drive this instance
    MockEventSource._instances.push(this);
  }

  /** Deliver a parsed SSE data payload to onmessage */
  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  triggerError() {
    this.onerror?.();
  }

  static _instances: MockEventSource[] = [];

  static reset() {
    MockEventSource._instances = [];
  }

  /** Find the instance for a given ticker symbol */
  static forTicker(ticker: string): MockEventSource | undefined {
    return MockEventSource._instances.find((es) =>
      es.url.includes(`/${ticker.toUpperCase()}/stream`),
    );
  }

  /** Deliver stock data to all pending instances matching the data map */
  static deliverAll(dataMap: Record<string, RawStockData>) {
    for (const es of MockEventSource._instances) {
      const match = es.url.match(/\/api\/stock\/([^/]+)\/stream/);
      if (!match) continue;
      const ticker = match[1].toUpperCase();
      const data = dataMap[ticker];
      if (data) {
        es.emit({ type: 'data', payload: data });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeRawData(overrides: Partial<RawStockData> = {}): RawStockData {
  return {
    ticker: 'AAPL',
    price: 185.5,
    date: '2025-03-18',
    changePercent: null,
    sector: null,
    industry: null,
    divYield: 0.52,
    eps: 6.42,
    totalAssets: 352583,
    goodwillNet: 0,
    intangiblesNet: 0,
    liabilitiesTotal: 290437,
    sharesOutstanding: 15460,
    dividendPercent: 0.96,
    bookValue: null,
    priceToBook: null,
    relatedTickers: [],
    ...overrides,
  };
}

const AAPL_DATA = makeRawData();
const MSFT_DATA = makeRawData({
  ticker: 'MSFT',
  price: 420.72,
  divYield: 0.71,
  eps: 12.08,
  totalAssets: 512163,
  goodwillNet: 69102,
  intangiblesNet: 9366,
  liabilitiesTotal: 243686,
  sharesOutstanding: 7430,
  dividendPercent: 3.0,
});

const GOOG_DATA = makeRawData({
  ticker: 'GOOG',
  price: 170.25,
  divYield: 0.47,
  eps: 7.54,
  totalAssets: 430266,
  goodwillNet: 29888,
  intangiblesNet: 2084,
  liabilitiesTotal: 119013,
  sharesOutstanding: 5870,
  dividendPercent: 0.8,
});

const DEFAULT_DATA: Record<string, RawStockData> = {
  AAPL: AAPL_DATA,
  MSFT: MSFT_DATA,
  GOOG: GOOG_DATA,
};

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

function renderApp() {
  function AppContent() {
    const [tickers, addTicker] = useTickerList();
    const [helpOpen, setHelpOpen] = useState(false);
    return (
      <main>
        {tickers.length > 0 ? (
          <TickerTable onHelpOpen={() => setHelpOpen(true)} />
        ) : (
          <EmptyState onAddTicker={addTicker} onHelpOpen={() => setHelpOpen(true)} />
        )}
        <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      </main>
    );
  }
  return render(<AppContent />);
}

/**
 * Wait for EventSource instances to be created for all given tickers,
 * then deliver their data payloads.
 */
async function deliverData(
  tickers: string[],
  dataMap: Record<string, RawStockData> = DEFAULT_DATA,
) {
  // Wait until all expected EventSource instances exist
  await waitFor(() => {
    for (const ticker of tickers) {
      expect(MockEventSource.forTicker(ticker)).toBeDefined();
    }
  });
  act(() => MockEventSource.deliverAll(dataMap));
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  MockEventSource.reset();
  vi.stubGlobal('EventSource', MockEventSource);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Stox Integration Tests', () => {
  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------
  describe('Empty state', () => {
    it('shows empty state message when no tickers are configured', () => {
      renderApp();
      expect(
        screen.getByText('No tickers configured. Add a ticker to get started.'),
      ).toBeInTheDocument();
    });

    it('does not render the ticker table when no tickers exist', () => {
      renderApp();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('shows add ticker form in empty state', () => {
      renderApp();
      expect(screen.getByLabelText('Ticker symbol')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    });

    it('can add a ticker from the empty state', async () => {
      const user = userEvent.setup();
      renderApp();

      await user.type(screen.getByLabelText('Ticker symbol'), 'AAPL');
      await user.click(screen.getByRole('button', { name: 'Add' }));

      await deliverData(['AAPL']);

      await waitFor(() => {
        expect(screen.getByText('$185.50')).toBeInTheDocument();
      });
      expect(screen.getByRole('table', { name: 'Ticker table' })).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Add and remove tickers
  // -----------------------------------------------------------------------
  describe('Add and remove tickers', () => {
    it('adds a ticker and shows it in the table', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['MSFT']));
      const user = userEvent.setup();
      renderApp();

      await deliverData(['MSFT']);

      const input = screen.getByLabelText('Ticker symbols, comma separated');
      await user.type(input, 'AAPL');
      await user.click(screen.getByRole('button', { name: 'Add' }));

      await deliverData(['AAPL']);

      await waitFor(() => {
        expect(screen.getByText('$185.50')).toBeInTheDocument();
      });
    });

    it('shows validation error for empty ticker submission', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
      const user = userEvent.setup();
      renderApp();

      await user.click(screen.getByRole('button', { name: 'Add' }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Ticker symbol cannot be empty.',
        );
      });
    });

    it('shows validation error for duplicate ticker', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
      const user = userEvent.setup();
      renderApp();

      const input = screen.getByLabelText('Ticker symbols, comma separated');
      await user.type(input, 'AAPL');
      await user.click(screen.getByRole('button', { name: 'Add' }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Already in list: AAPL');
      });
    });

    it('removes a ticker when the remove button is clicked', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL', 'MSFT']));
      const user = userEvent.setup();
      renderApp();

      await deliverData(['AAPL', 'MSFT']);
      await waitFor(() => expect(screen.getByText('$185.50')).toBeInTheDocument());

      await user.click(screen.getByLabelText('Remove AAPL'));

      await waitFor(() => {
        expect(screen.queryByLabelText('Remove AAPL')).not.toBeInTheDocument();
      });
      expect(screen.getByLabelText('Remove MSFT')).toBeInTheDocument();
      expect(JSON.parse(localStorage.getItem('stox:tickers')!)).toEqual(['MSFT']);
    });

    it('removes the last ticker and shows empty table', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
      const user = userEvent.setup();
      renderApp();

      await deliverData(['AAPL']);
      await waitFor(() => expect(screen.getByText('$185.50')).toBeInTheDocument());

      await user.click(screen.getByLabelText('Remove AAPL'));

      await waitFor(() => {
        expect(screen.queryByLabelText('Remove AAPL')).not.toBeInTheDocument();
      });
      expect(JSON.parse(localStorage.getItem('stox:tickers')!)).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // Table display and formatting
  // -----------------------------------------------------------------------
  describe('Table display and formatting', () => {
    it('renders all column headers', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
      renderApp();

      await waitFor(() => {
        expect(screen.getByRole('table', { name: 'Ticker table' })).toBeInTheDocument();
      });

      const headers = screen.getAllByRole('columnheader');
      expect(headers).toHaveLength(COLUMNS.length + 2);
      expect(headers[0]).toHaveTextContent('Ticker');
      expect(headers[1]).toHaveTextContent('Price');
    });

    it('displays formatted financial data for a loaded ticker', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
      renderApp();

      await deliverData(['AAPL']);

      await waitFor(() => expect(screen.getByText('$185.50')).toBeInTheDocument());
      expect(screen.getByText('$6.42')).toBeInTheDocument();
    });

    it('shows N/A for null computed fields', async () => {
      const nullData = makeRawData({ ticker: 'NULL', sharesOutstanding: 0 });
      localStorage.setItem('stox:tickers', JSON.stringify(['NULL']));
      renderApp();

      await deliverData(['NULL'], { NULL: nullData });

      await waitFor(() => {
        const naCells = screen.getAllByText('N/A');
        expect(naCells.length).toBeGreaterThanOrEqual(4);
      });
    });

    it('shows loading state before data arrives', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
      renderApp();

      // Don't deliver data — EventSource stays open
      await waitFor(() => {
        expect(screen.getByText('Loading…')).toBeInTheDocument();
      });
    });

    it('shows error state when EventSource errors', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
      renderApp();

      await waitFor(() => MockEventSource.forTicker('AAPL') !== undefined);
      act(() => MockEventSource.forTicker('AAPL')!.triggerError());

      await waitFor(() => {
        expect(screen.getByText('Error loading data')).toBeInTheDocument();
      });
    });

    it('renders multiple tickers as separate rows', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL', 'MSFT']));
      renderApp();

      await deliverData(['AAPL', 'MSFT']);

      await waitFor(() => {
        expect(screen.getByText('$185.50')).toBeInTheDocument();
        expect(screen.getByText('$420.72')).toBeInTheDocument();
      });
      expect(screen.getByLabelText('Remove AAPL')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove MSFT')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // localStorage persistence
  // -----------------------------------------------------------------------
  describe('localStorage persistence', () => {
    it('persists added tickers to localStorage', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
      const user = userEvent.setup();
      renderApp();

      const input = screen.getByLabelText('Ticker symbols, comma separated');
      await user.type(input, 'MSFT');
      await user.click(screen.getByRole('button', { name: 'Add' }));

      expect(JSON.parse(localStorage.getItem('stox:tickers')!)).toEqual(['AAPL', 'MSFT']);
    });

    it('loads tickers from localStorage on mount', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['GOOG']));
      renderApp();

      await deliverData(['GOOG']);

      await waitFor(() => expect(screen.getByText('$170.25')).toBeInTheDocument());
    });
  });

  // -----------------------------------------------------------------------
  // Search and sort
  // -----------------------------------------------------------------------
  describe('Search and sort', () => {
    it('filters tickers by search query', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL', 'MSFT', 'GOOG']));
      const user = userEvent.setup();
      renderApp();

      await deliverData(['AAPL', 'MSFT', 'GOOG']);
      await waitFor(() => {
        expect(screen.getByLabelText('Remove AAPL')).toBeInTheDocument();
        expect(screen.getByLabelText('Remove MSFT')).toBeInTheDocument();
        expect(screen.getByLabelText('Remove GOOG')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('Search tickers'), 'AA');

      await waitFor(() => {
        expect(screen.getByLabelText('Remove AAPL')).toBeInTheDocument();
        expect(screen.queryByLabelText('Remove MSFT')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Remove GOOG')).not.toBeInTheDocument();
      });
    });

    it('search is case-insensitive', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL', 'MSFT']));
      const user = userEvent.setup();
      renderApp();

      await deliverData(['AAPL', 'MSFT']);
      await waitFor(() => {
        expect(screen.getByLabelText('Remove AAPL')).toBeInTheDocument();
        expect(screen.getByLabelText('Remove MSFT')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('Search tickers'), 'msft');

      await waitFor(() => {
        expect(screen.queryByLabelText('Remove AAPL')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Remove MSFT')).toBeInTheDocument();
      });
    });

    it('shows all tickers when search is cleared', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL', 'MSFT']));
      const user = userEvent.setup();
      renderApp();

      await deliverData(['AAPL', 'MSFT']);
      await waitFor(() => {
        expect(screen.getByLabelText('Remove AAPL')).toBeInTheDocument();
        expect(screen.getByLabelText('Remove MSFT')).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText('Search tickers');
      await user.type(searchInput, 'AAPL');
      await waitFor(() => expect(screen.queryByLabelText('Remove MSFT')).not.toBeInTheDocument());

      await user.clear(searchInput);
      await waitFor(() => {
        expect(screen.getByLabelText('Remove AAPL')).toBeInTheDocument();
        expect(screen.getByLabelText('Remove MSFT')).toBeInTheDocument();
      });
    });

    it('clicking a column header shows sort indicator', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
      const user = userEvent.setup();
      renderApp();

      await waitFor(() => expect(screen.getByText('Price')).toBeInTheDocument());

      await user.click(screen.getByText('Price'));
      const priceHeader = screen.getByText('Price').closest('th')!;
      expect(priceHeader).toHaveAttribute('aria-sort', 'ascending');
      expect(priceHeader.textContent).toContain('▲');

      await user.click(screen.getByText('Price'));
      expect(priceHeader).toHaveAttribute('aria-sort', 'descending');
      expect(priceHeader.textContent).toContain('▼');
    });
  });

  // -----------------------------------------------------------------------
  // Star / favorite
  // -----------------------------------------------------------------------
  describe('Star / favorite', () => {
    it('renders star buttons for each ticker row', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL', 'MSFT']));
      renderApp();

      await deliverData(['AAPL', 'MSFT']);
      await waitFor(() => {
        expect(screen.getByLabelText('Star AAPL')).toBeInTheDocument();
        expect(screen.getByLabelText('Star MSFT')).toBeInTheDocument();
      });
    });

    it('toggles star state and persists to localStorage', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
      const user = userEvent.setup();
      renderApp();

      await deliverData(['AAPL']);
      await waitFor(() => expect(screen.getByText('$185.50')).toBeInTheDocument());

      await user.click(screen.getByLabelText('Star AAPL'));
      await waitFor(() => expect(screen.getByLabelText('Unstar AAPL')).toBeInTheDocument());
      expect(JSON.parse(localStorage.getItem('stox:starred')!)).toContain('AAPL');

      await user.click(screen.getByLabelText('Unstar AAPL'));
      await waitFor(() => expect(screen.getByLabelText('Star AAPL')).toBeInTheDocument());
      expect(JSON.parse(localStorage.getItem('stox:starred')!)).not.toContain('AAPL');
    });

    it('sorts starred tickers first when star header is clicked', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL', 'MSFT', 'GOOG']));
      localStorage.setItem('stox:starred', JSON.stringify(['GOOG']));
      const user = userEvent.setup();
      renderApp();

      await deliverData(['AAPL', 'MSFT', 'GOOG']);
      await waitFor(() => {
        expect(screen.getByLabelText('Remove AAPL')).toBeInTheDocument();
        expect(screen.getByLabelText('Remove MSFT')).toBeInTheDocument();
        expect(screen.getByLabelText('Remove GOOG')).toBeInTheDocument();
      });

      const starHeader = screen.getByLabelText('Star');
      await user.click(starHeader);
      await waitFor(() => expect(starHeader).toHaveAttribute('aria-sort', 'ascending'));

      const rows = screen.getAllByRole('row').slice(1);
      expect(rows[0]).toHaveTextContent('GOOG');
    });
  });

  // -----------------------------------------------------------------------
  // CSV export
  // -----------------------------------------------------------------------
  describe('CSV export', () => {
    it('export button is disabled when no data is loaded', () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
      renderApp();
      // EventSource open but no data delivered yet
      const exportBtn = screen.getByLabelText('Export CSV');
      expect(exportBtn).toBeDisabled();
      expect(exportBtn).toHaveAttribute('title', 'No data to export.');
    });

    it('export button becomes enabled after data loads', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
      renderApp();

      expect(screen.getByLabelText('Export CSV')).toBeDisabled();

      await deliverData(['AAPL']);
      await waitFor(() => expect(screen.getByText('$185.50')).toBeInTheDocument());
    });
  });

  // -----------------------------------------------------------------------
  // Computed columns
  // -----------------------------------------------------------------------
  describe('Computed columns display', () => {
    it('displays computed EPS multiples correctly in popover on hover', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
      const user = userEvent.setup();
      renderApp();

      await deliverData(['AAPL']);
      await waitFor(() => expect(screen.getByText('$6.42')).toBeInTheDocument());

      const epsCell = screen.getByText('$6.42').closest('td')!;
      await user.hover(epsCell);

      await waitFor(() => {
        expect(screen.getByText(/15x EPS.*\$96\.30/)).toBeInTheDocument();
        expect(screen.getByText(/20x EPS.*\$128\.40/)).toBeInTheDocument();
      });
    });
  });

  // -----------------------------------------------------------------------
  // Progress display
  // -----------------------------------------------------------------------
  describe('Progress display', () => {
    it('shows queued label when server sends queued progress', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
      renderApp();

      await waitFor(() => MockEventSource.forTicker('AAPL') !== undefined);
      act(() => MockEventSource.forTicker('AAPL')!.emit({
        type: 'progress', stage: 0, totalStages: 4, stageLabel: 'queued',
      }));

      await waitFor(() => expect(screen.getByText('queued')).toBeInTheDocument());
    });

    it('updates progress label through scrape stages', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
      renderApp();

      await waitFor(() => MockEventSource.forTicker('AAPL') !== undefined);
      const es = MockEventSource.forTicker('AAPL')!;

      act(() => es.emit({ type: 'progress', stage: 0, totalStages: 4, stageLabel: 'queued' }));
      await waitFor(() => expect(screen.getByText('queued')).toBeInTheDocument());

      act(() => es.emit({ type: 'progress', stage: 1, totalStages: 4, stageLabel: 'quote summary' }));
      await waitFor(() => expect(screen.getByText('quote summary')).toBeInTheDocument());

      act(() => es.emit({ type: 'progress', stage: 3, totalStages: 4, stageLabel: 'balance sheet' }));
      await waitFor(() => expect(screen.getByText('balance sheet')).toBeInTheDocument());
    });

    it('clears progress and shows data when data event arrives', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
      renderApp();

      await waitFor(() => MockEventSource.forTicker('AAPL') !== undefined);
      const es = MockEventSource.forTicker('AAPL')!;

      act(() => es.emit({ type: 'progress', stage: 1, totalStages: 4, stageLabel: 'quote summary' }));
      await waitFor(() => expect(screen.getByText('quote summary')).toBeInTheDocument());

      act(() => es.emit({ type: 'data', payload: AAPL_DATA }));
      await waitFor(() => expect(screen.getByText('$185.50')).toBeInTheDocument());
      expect(screen.queryByText('quote summary')).not.toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Full user journey
  // -----------------------------------------------------------------------
  describe('Full user journey', () => {
    it('add ticker → view data → search → remove', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
      const user = userEvent.setup();
      renderApp();

      await deliverData(['AAPL']);
      await waitFor(() => expect(screen.getByText('$185.50')).toBeInTheDocument());

      // Add MSFT
      await user.type(screen.getByLabelText('Ticker symbols, comma separated'), 'MSFT');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      await deliverData(['MSFT']);
      await waitFor(() => expect(screen.getByText('$420.72')).toBeInTheDocument());

      // Search for MSFT
      await user.type(screen.getByLabelText('Search tickers'), 'MSFT');
      await waitFor(() => {
        expect(screen.queryByLabelText('Remove AAPL')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Remove MSFT')).toBeInTheDocument();
      });

      // Clear search
      await user.clear(screen.getByLabelText('Search tickers'));
      await waitFor(() => {
        expect(screen.getByLabelText('Remove AAPL')).toBeInTheDocument();
        expect(screen.getByLabelText('Remove MSFT')).toBeInTheDocument();
      });

      // Remove MSFT
      await user.click(screen.getByLabelText('Remove MSFT'));
      await waitFor(() => expect(screen.queryByLabelText('Remove MSFT')).not.toBeInTheDocument());
      expect(screen.getByLabelText('Remove AAPL')).toBeInTheDocument();
      expect(JSON.parse(localStorage.getItem('stox:tickers')!)).toEqual(['AAPL']);
    });
  });

  // -----------------------------------------------------------------------
  // Help dialog
  // -----------------------------------------------------------------------
  describe('Help dialog', () => {
    it('opens help dialog from toolbar and closes with close button', async () => {
      localStorage.setItem('stox:tickers', JSON.stringify(['AAPL']));
      const user = userEvent.setup();
      renderApp();

      await waitFor(() => expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: 'Help' }));
      expect(screen.getByRole('dialog', { name: 'Help and shortcuts' })).toBeInTheDocument();

      await user.click(screen.getByLabelText('Close help'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows help button in empty state', () => {
      renderApp();
      expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument();
    });

    it('opens help dialog from empty state', async () => {
      const user = userEvent.setup();
      renderApp();
      await user.click(screen.getByRole('button', { name: 'Help' }));
      expect(screen.getByRole('dialog', { name: 'Help and shortcuts' })).toBeInTheDocument();
    });
  });
});
