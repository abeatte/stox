import { useEffect, useState } from 'react';

export interface StockProgress {
  stage: number;
  totalStages: number;
  stageLabel: string;
}

/**
 * Subscribes to the server's SSE progress stream for a ticker while it's loading.
 * Returns the current scrape stage label, or null when not actively scraping.
 * Gracefully returns null in environments without EventSource (e.g. jsdom/tests).
 */
export function useStockProgress(ticker: string, isLoading: boolean): StockProgress | null {
  const [progress, setProgress] = useState<StockProgress | null>(null);

  useEffect(() => {
    if (!isLoading || !ticker.trim() || typeof EventSource === 'undefined') {
      setProgress(null);
      return;
    }

    const symbol = ticker.toUpperCase().trim();
    const url = `http://localhost:3001/api/stock/${encodeURIComponent(symbol)}/progress`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        setProgress(null);
        eventSource.close();
        return;
      }
      try {
        const data = JSON.parse(event.data) as StockProgress;
        setProgress(data);
      } catch {
        // ignore malformed messages
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setProgress(null);
    };
  }, [ticker, isLoading]);

  return progress;
}
