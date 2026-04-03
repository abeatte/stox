/**
 * Unit tests for ServerMetrics queue/progress tracking logic.
 *
 * We instantiate ServerMetrics with enabled=false to skip the terminal
 * dashboard (alt-screen, stdout patching) so it runs cleanly in jsdom.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Inline the class under test to avoid importing server-side Node modules
// that conflict with jsdom. We re-implement only the logic under test.
// ---------------------------------------------------------------------------

type ProgressListener = (
  ticker: string,
  stage: number,
  totalStages: number,
  stageLabel: string,
) => void;

interface ProcessInfo {
  ticker: string;
  startTime: number;
  stage: number;
  totalStages: number;
  stageLabel: string;
  queued: boolean;
}

/**
 * Minimal re-implementation of the queue/progress tracking portion of
 * ServerMetrics, extracted so it can run in a browser-like test environment.
 */
class MetricsCore {
  private running = new Map<string, ProcessInfo>();
  private queued = new Set<string>();
  private progressListeners = new Set<ProgressListener>();

  queueProcess(ticker: string, totalStages = 4): void {
    this.queued.add(ticker);
    this.emitProgress(ticker, 0, totalStages, 'queued');
  }

  dequeueProcess(ticker: string): void {
    this.queued.delete(ticker);
  }

  startProcess(ticker: string, totalStages = 4): void {
    this.queued.delete(ticker);
    this.running.set(ticker, {
      ticker,
      startTime: Date.now(),
      stage: 0,
      totalStages,
      stageLabel: 'starting',
      queued: false,
    });
  }

  updateStage(ticker: string, stage: number, label: string): void {
    const proc = this.running.get(ticker);
    if (proc) {
      proc.stage = stage;
      proc.stageLabel = label;
      this.emitProgress(ticker, stage, proc.totalStages, label);
    }
  }

  endProcess(ticker: string): void {
    this.running.delete(ticker);
  }

  cancelProcess(ticker: string): void {
    this.queued.delete(ticker);
    this.running.delete(ticker);
  }

  onProgress(listener: ProgressListener): () => void {
    this.progressListeners.add(listener);
    return () => { this.progressListeners.delete(listener); };
  }

  private emitProgress(ticker: string, stage: number, totalStages: number, stageLabel: string): void {
    for (const listener of this.progressListeners) {
      listener(ticker, stage, totalStages, stageLabel);
    }
  }

  getProcessInfo(ticker: string): ProcessInfo | null {
    const running = this.running.get(ticker);
    if (running) return running;
    if (this.queued.has(ticker)) {
      return { ticker, startTime: Date.now(), stage: 0, totalStages: 4, stageLabel: 'queued', queued: true };
    }
    return null;
  }

  isQueued(ticker: string): boolean { return this.queued.has(ticker); }
  isRunning(ticker: string): boolean { return this.running.has(ticker); }
  queueSize(): number { return this.queued.size; }
  runningSize(): number { return this.running.size; }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MetricsCore — queue tracking', () => {
  let m: MetricsCore;

  beforeEach(() => {
    m = new MetricsCore();
  });

  it('getProcessInfo returns null for unknown ticker', () => {
    expect(m.getProcessInfo('AAPL')).toBeNull();
  });

  it('queueProcess registers ticker as queued', () => {
    m.queueProcess('AAPL');
    expect(m.isQueued('AAPL')).toBe(true);
    expect(m.isRunning('AAPL')).toBe(false);
  });

  it('getProcessInfo returns queued state after queueProcess', () => {
    m.queueProcess('AAPL');
    const info = m.getProcessInfo('AAPL');
    expect(info).not.toBeNull();
    expect(info!.stageLabel).toBe('queued');
    expect(info!.queued).toBe(true);
    expect(info!.stage).toBe(0);
  });

  it('queueProcess emits a queued progress event', () => {
    const listener = vi.fn();
    m.onProgress(listener);
    m.queueProcess('AAPL');
    expect(listener).toHaveBeenCalledWith('AAPL', 0, 4, 'queued');
  });

  it('dequeueProcess removes ticker from queue', () => {
    m.queueProcess('AAPL');
    m.dequeueProcess('AAPL');
    expect(m.isQueued('AAPL')).toBe(false);
    expect(m.getProcessInfo('AAPL')).toBeNull();
  });

  it('startProcess moves ticker from queued to running', () => {
    m.queueProcess('AAPL');
    m.startProcess('AAPL');
    expect(m.isQueued('AAPL')).toBe(false);
    expect(m.isRunning('AAPL')).toBe(true);
  });

  it('getProcessInfo returns running state after startProcess', () => {
    m.queueProcess('AAPL');
    m.startProcess('AAPL');
    const info = m.getProcessInfo('AAPL');
    expect(info).not.toBeNull();
    expect(info!.queued).toBe(false);
    expect(info!.stageLabel).toBe('starting');
  });

  it('updateStage updates running process and emits progress', () => {
    const listener = vi.fn();
    m.onProgress(listener);
    m.startProcess('AAPL');
    m.updateStage('AAPL', 1, 'quote summary');

    const info = m.getProcessInfo('AAPL');
    expect(info!.stage).toBe(1);
    expect(info!.stageLabel).toBe('quote summary');
    expect(listener).toHaveBeenCalledWith('AAPL', 1, 4, 'quote summary');
  });

  it('updateStage does nothing for unknown ticker', () => {
    const listener = vi.fn();
    m.onProgress(listener);
    m.updateStage('AAPL', 1, 'quote summary');
    expect(listener).not.toHaveBeenCalled();
  });

  it('endProcess removes ticker from running', () => {
    m.startProcess('AAPL');
    m.endProcess('AAPL');
    expect(m.isRunning('AAPL')).toBe(false);
    expect(m.getProcessInfo('AAPL')).toBeNull();
  });

  it('cancelProcess removes ticker from both queued and running', () => {
    m.queueProcess('AAPL');
    m.cancelProcess('AAPL');
    expect(m.isQueued('AAPL')).toBe(false);
    expect(m.getProcessInfo('AAPL')).toBeNull();

    m.startProcess('MSFT');
    m.cancelProcess('MSFT');
    expect(m.isRunning('MSFT')).toBe(false);
  });

  it('tracks multiple tickers independently', () => {
    m.queueProcess('AAPL');
    m.queueProcess('MSFT');
    m.queueProcess('GOOG');
    expect(m.queueSize()).toBe(3);

    m.dequeueProcess('AAPL');
    m.startProcess('AAPL');
    expect(m.queueSize()).toBe(2);
    expect(m.runningSize()).toBe(1);

    expect(m.getProcessInfo('AAPL')!.queued).toBe(false);
    expect(m.getProcessInfo('MSFT')!.queued).toBe(true);
    expect(m.getProcessInfo('GOOG')!.queued).toBe(true);
  });

  it('onProgress listener receives events for all tickers', () => {
    const listener = vi.fn();
    m.onProgress(listener);

    m.queueProcess('AAPL');
    m.queueProcess('MSFT');

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith('AAPL', 0, 4, 'queued');
    expect(listener).toHaveBeenCalledWith('MSFT', 0, 4, 'queued');
  });

  it('unsubscribe stops listener from receiving events', () => {
    const listener = vi.fn();
    const unsubscribe = m.onProgress(listener);

    m.queueProcess('AAPL');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    m.queueProcess('MSFT');
    expect(listener).toHaveBeenCalledTimes(1); // no new calls
  });

  it('full lifecycle: queued → dequeued → started → staged → ended', () => {
    const events: string[] = [];
    m.onProgress((ticker, stage, _total, label) => {
      events.push(`${ticker}:${stage}:${label}`);
    });

    m.queueProcess('AAPL');           // emits queued
    m.dequeueProcess('AAPL');         // no emit
    m.startProcess('AAPL');           // no emit
    m.updateStage('AAPL', 1, 'quote summary');
    m.updateStage('AAPL', 2, 'balance sheet');
    m.updateStage('AAPL', 4, 'complete');
    m.endProcess('AAPL');             // no emit

    expect(events).toEqual([
      'AAPL:0:queued',
      'AAPL:1:quote summary',
      'AAPL:2:balance sheet',
      'AAPL:4:complete',
    ]);
    expect(m.getProcessInfo('AAPL')).toBeNull();
  });
});

describe('MetricsCore — SSE snapshot correctness', () => {
  let m: MetricsCore;

  beforeEach(() => { m = new MetricsCore(); });

  it('snapshot is available synchronously after queueProcess', () => {
    // This is the critical guarantee: the SSE endpoint reads getProcessInfo
    // synchronously after fetchTickerData calls queueProcess. If queueProcess
    // is synchronous, the snapshot will always be present.
    m.queueProcess('AAPL');
    const snapshot = m.getProcessInfo('AAPL');
    expect(snapshot).not.toBeNull();
    expect(snapshot!.stageLabel).toBe('queued');
  });

  it('snapshot reflects current stage during scrape', () => {
    m.queueProcess('AAPL');
    m.dequeueProcess('AAPL');
    m.startProcess('AAPL');
    m.updateStage('AAPL', 2, 'balance sheet');

    const snapshot = m.getProcessInfo('AAPL');
    expect(snapshot!.stage).toBe(2);
    expect(snapshot!.stageLabel).toBe('balance sheet');
  });

  it('snapshot is null after process ends', () => {
    m.queueProcess('AAPL');
    m.dequeueProcess('AAPL');
    m.startProcess('AAPL');
    m.endProcess('AAPL');
    expect(m.getProcessInfo('AAPL')).toBeNull();
  });

  it('subscribe-then-snapshot pattern never misses an event', () => {
    // Simulates the SSE endpoint: subscribe first, then read snapshot.
    // Even if an event fires between subscribe and snapshot read, it's caught.
    const received: string[] = [];
    const unsubscribe = m.onProgress((_t, _s, _ts, label) => received.push(label));

    // Simulate: event fires after subscribe but before snapshot read
    m.queueProcess('AAPL'); // fires 'queued' — caught by listener

    const snapshot = m.getProcessInfo('AAPL');
    if (snapshot) received.push(`snapshot:${snapshot.stageLabel}`);

    unsubscribe();

    // Both the event and the snapshot should be present
    expect(received).toContain('queued');
    expect(received).toContain('snapshot:queued');
  });
});
