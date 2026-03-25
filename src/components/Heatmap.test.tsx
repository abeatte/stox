import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Heatmap } from './Heatmap';
import type { StockRowData } from '../types';

function makeRow(overrides: Partial<StockRowData> = {}): StockRowData {
  return {
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
    bookValue: 4.02,
    pBook: 46.14,
    tangibleBookValue: 4.02,
    pTangbook: 46.14,
    dividendPercent: 0.96,
    eps20x: 128.4,
    eps15x: 96.3,
    priceEarnings: 28.89,
    ...overrides,
  };
}

function buildMap(rows: StockRowData[]): Map<string, StockRowData | null> {
  const map = new Map<string, StockRowData | null>();
  for (const r of rows) map.set(r.ticker, r);
  return map;
}

describe('Heatmap', () => {
  it('renders nothing when no items have data', () => {
    const { container } = render(
      <Heatmap rowDataMap={new Map()} tickers={[]} dataVersion={0} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the heatmap container with title', () => {
    const rows = [makeRow()];
    render(
      <Heatmap rowDataMap={buildMap(rows)} tickers={['AAPL']} dataVersion={0} />,
    );
    expect(screen.getByText("Today's Performance")).toBeInTheDocument();
  });

  it('starts collapsed by default', () => {
    const rows = [makeRow()];
    render(
      <Heatmap rowDataMap={buildMap(rows)} tickers={['AAPL']} dataVersion={0} />,
    );
    expect(screen.getByLabelText('Expand heatmap')).toBeInTheDocument();
    // Grid should not be visible when collapsed
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
  });

  it('expands when collapse button is clicked', () => {
    const rows = [makeRow()];
    render(
      <Heatmap rowDataMap={buildMap(rows)} tickers={['AAPL']} dataVersion={0} />,
    );
    fireEvent.click(screen.getByLabelText('Expand heatmap'));
    expect(screen.getByLabelText('Collapse heatmap')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('shows toggle buttons when expanded', () => {
    const rows = [makeRow()];
    render(
      <Heatmap rowDataMap={buildMap(rows)} tickers={['AAPL']} dataVersion={0} />,
    );
    fireEvent.click(screen.getByLabelText('Expand heatmap'));
    expect(screen.getByRole('radio', { name: 'Daily' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Intrinsic' })).toBeInTheDocument();
  });

  it('daily mode is selected by default', () => {
    const rows = [makeRow()];
    render(
      <Heatmap rowDataMap={buildMap(rows)} tickers={['AAPL']} dataVersion={0} />,
    );
    fireEvent.click(screen.getByLabelText('Expand heatmap'));
    expect(screen.getByRole('radio', { name: 'Daily' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Intrinsic' })).toHaveAttribute('aria-checked', 'false');
  });

  it('switches to intrinsic mode when clicked', () => {
    const rows = [makeRow()];
    render(
      <Heatmap rowDataMap={buildMap(rows)} tickers={['AAPL']} dataVersion={0} />,
    );
    fireEvent.click(screen.getByLabelText('Expand heatmap'));
    fireEvent.click(screen.getByRole('radio', { name: 'Intrinsic' }));
    expect(screen.getByRole('radio', { name: 'Intrinsic' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Intrinsic Value (P:Book)')).toBeInTheDocument();
  });

  it('renders tiles for each ticker with data', () => {
    const rows = [
      makeRow({ ticker: 'AAPL' }),
      makeRow({ ticker: 'MSFT', price: 420 }),
    ];
    render(
      <Heatmap rowDataMap={buildMap(rows)} tickers={['AAPL', 'MSFT']} dataVersion={0} />,
    );
    fireEvent.click(screen.getByLabelText('Expand heatmap'));
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
  });

  it('shows change percent in daily mode', () => {
    const rows = [makeRow({ changePercent: 2.5 })];
    render(
      <Heatmap rowDataMap={buildMap(rows)} tickers={['AAPL']} dataVersion={0} />,
    );
    fireEvent.click(screen.getByLabelText('Expand heatmap'));
    expect(screen.getByText('+2.50%')).toBeInTheDocument();
  });

  it('shows pBook value in intrinsic mode', () => {
    const rows = [makeRow({ pBook: 1.5 })];
    render(
      <Heatmap rowDataMap={buildMap(rows)} tickers={['AAPL']} dataVersion={0} />,
    );
    fireEvent.click(screen.getByLabelText('Expand heatmap'));
    fireEvent.click(screen.getByRole('radio', { name: 'Intrinsic' }));
    expect(screen.getByText('1.50x')).toBeInTheDocument();
  });

  it('skips tickers without data in the map', () => {
    const map = new Map<string, StockRowData | null>();
    map.set('AAPL', makeRow());
    map.set('MSFT', null);
    render(
      <Heatmap rowDataMap={map} tickers={['AAPL', 'MSFT']} dataVersion={0} />,
    );
    fireEvent.click(screen.getByLabelText('Expand heatmap'));
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.queryByText('MSFT')).not.toBeInTheDocument();
  });

  it('handles null changePercent in daily mode', () => {
    const rows = [makeRow({ changePercent: null })];
    render(
      <Heatmap rowDataMap={buildMap(rows)} tickers={['AAPL']} dataVersion={0} />,
    );
    fireEvent.click(screen.getByLabelText('Expand heatmap'));
    // Should just show ticker without a value line
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('collapses back when collapse button is clicked again', () => {
    const rows = [makeRow()];
    render(
      <Heatmap rowDataMap={buildMap(rows)} tickers={['AAPL']} dataVersion={0} />,
    );
    fireEvent.click(screen.getByLabelText('Expand heatmap'));
    expect(screen.getByText('AAPL')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Collapse heatmap'));
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
  });
});
