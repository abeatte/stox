/**
 * Live console metrics dashboard for the Stox server.
 *
 * Uses the terminal's alternate screen buffer (like vim/htop) so the
 * dashboard can't be scrolled or corrupted by stray output. All
 * stdout/stderr writes from other code (Puppeteer, Node, etc.) are
 * intercepted and routed into the event log.
 */

// ---------------------------------------------------------------------------
// ANSI helpers
// ---------------------------------------------------------------------------

const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;

const FG = {
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  cyan: `${ESC}36m`,
  magenta: `${ESC}35m`,
  red: `${ESC}31m`,
  white: `${ESC}37m`,
  gray: `${ESC}90m`,
} as const;

const BG = {
  green: `${ESC}42m`,
} as const;

function color(text: string, ...codes: string[]): string {
  return `${codes.join('')}${text}${RESET}`;
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProcessInfo {
  ticker: string;
  startTime: number;
  stage: number;
  totalStages: number;
  stageLabel: string;
  queued: boolean;
  stageStartTime: number;
  stageDurations: number[];
}

interface CompletedProcess {
  ticker: string;
  duration: number;
  timestamp: number;
  stageDurations: number[];
}

interface EventEntry {
  message: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROGRESS_BAR_WIDTH = 24;
const HISTORY_LIMIT = 50;
const EVENT_LIMIT = 8;

/** Saved before we patch — these always write to the real terminal. */
const rawWrite = process.stdout.write.bind(process.stdout);
const rawErrWrite = process.stderr.write.bind(process.stderr);

// Alternate screen buffer sequences
const ALT_SCREEN_ON = '\x1b[?1049h';
const ALT_SCREEN_OFF = '\x1b[?1049l';
const CURSOR_HIDE = `${ESC}?25l`;
const CURSOR_SHOW = `${ESC}?25h`;
const CURSOR_HOME = `${ESC}H`;
const CLEAR_SCREEN = `${ESC}2J`;

// ---------------------------------------------------------------------------
// Metrics class
// ---------------------------------------------------------------------------

/** Callback type for progress subscribers. */
export type ProgressListener = (ticker: string, stage: number, totalStages: number, stageLabel: string) => void;

export class ServerMetrics {
  private running = new Map<string, ProcessInfo>();
  private queued = new Set<string>();
  private completed: CompletedProcess[] = [];
  private events: EventEntry[] = [];
  private renderTimer: ReturnType<typeof setInterval> | null = null;
  private enabled: boolean;
  private rendering = false;
  private bannerLines: string[] = [];
  private progressListeners = new Set<ProgressListener>();

  constructor(enabled = true) {
    this.enabled = enabled;
    if (this.enabled) {
      this.interceptConsole();
      // Switch to alternate screen buffer and hide cursor
      rawWrite(ALT_SCREEN_ON + CURSOR_HIDE);
      this.renderTimer = setInterval(() => this.render(), 500);
      this.render();
    }
  }

  private interceptConsole(): void {
    const self = this;

    const makeInterceptor = (original: typeof rawWrite): typeof rawWrite => {
      const fn = function interceptedWrite(
        chunk: Uint8Array | string,
        encodingOrCb?: BufferEncoding | ((err?: Error | null) => void),
        cb?: (err?: Error | null) => void,
      ): boolean {
        // Let our own render writes through
        if (self.rendering) {
          return original(chunk as string, encodingOrCb as BufferEncoding, cb);
        }
        // Capture everything else into the event log
        const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString();
        const cleaned = stripAnsi(text).trim();
        if (cleaned.length > 0) {
          self.pushEvent(cleaned.slice(0, 120));
        }
        const callback = typeof encodingOrCb === 'function' ? encodingOrCb : cb;
        if (callback) callback();
        return true;
      };
      return fn as typeof rawWrite;
    };

    process.stdout.write = makeInterceptor(rawWrite);
    process.stderr.write = makeInterceptor(rawErrWrite);
  }

  private pushEvent(message: string): void {
    this.events.push({ message, timestamp: Date.now() });
    if (this.events.length > EVENT_LIMIT) {
      this.events = this.events.slice(-EVENT_LIMIT);
    }
  }

  /** Set a persistent message displayed at the top of the dashboard. */
  setBanner(message: string): void {
    this.bannerLines.push(message);
    this.render();
  }

  /** Probe localhost ports to find the Vite dev server and add it to the banner. */
  async detectVite(startPort = 5173, range = 10): Promise<void> {
    const http = await import('node:http');
    for (let port = startPort; port < startPort + range; port++) {
      const alive = await new Promise<boolean>((resolve) => {
        const req = http.get(`http://localhost:${port}/`, (res) => {
          const isVite = (res.headers['x-powered-by'] ?? '').toString().includes('Vite')
            || (res.headers.server ?? '').toString().toLowerCase().includes('vite')
            || res.statusCode === 200;
          res.resume();
          resolve(isVite);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(500, () => { req.destroy(); resolve(false); });
      });
      if (alive) {
        const line = `Vite dev server   → http://localhost:${port}`;
        const idx = this.bannerLines.findIndex((l) => l.includes('Vite'));
        if (idx >= 0) { this.bannerLines[idx] = line; }
        else { this.bannerLines.unshift(line); }
        this.render();
        return;
      }
    }
  }

  log(message: string): void {
    this.pushEvent(message);
    this.render();
  }

  /** Mark a ticker as waiting for a concurrency slot. */
  queueProcess(ticker: string, totalStages = 4): void {
    this.queued.add(ticker);
    this.emitProgress(ticker, 0, totalStages, 'queued');
    this.render();
  }

  /** Remove from queue — called just before the scrape slot is acquired. */
  dequeueProcess(ticker: string): void {
    this.queued.delete(ticker);
  }

  startProcess(ticker: string, totalStages = 4): void {
    this.queued.delete(ticker);
    this.running.set(ticker, {
      ticker, startTime: Date.now(), stage: 0, totalStages, stageLabel: 'starting', queued: false,
      stageStartTime: Date.now(), stageDurations: [],
    });
    this.render();
  }

  updateStage(ticker: string, stage: number, label: string): void {
    const proc = this.running.get(ticker);
    if (proc) {
      // Record how long the previous stage took
      const stageDuration = Date.now() - proc.stageStartTime;
      if (proc.stage > 0 || proc.stageLabel !== 'starting') {
        proc.stageDurations[proc.stage] = stageDuration;
      }
      proc.stage = stage;
      proc.stageLabel = label;
      proc.stageStartTime = Date.now();
      this.emitProgress(ticker, stage, proc.totalStages, label);
    }
  }

  endProcess(ticker: string): void {
    const proc = this.running.get(ticker);
    if (proc) {
      // Record the final stage duration
      proc.stageDurations[proc.stage] = Date.now() - proc.stageStartTime;
      this.completed.push({
        ticker,
        duration: Date.now() - proc.startTime,
        timestamp: Date.now(),
        stageDurations: [...proc.stageDurations],
      });
      if (this.completed.length > HISTORY_LIMIT) this.completed = this.completed.slice(-HISTORY_LIMIT);
      this.running.delete(ticker);
    }
    this.render();
  }

  /** Remove a process from the active list without counting it as completed. */
  cancelProcess(ticker: string): void {
    this.queued.delete(ticker);
    this.running.delete(ticker);
    this.render();
  }

  /** Subscribe to progress updates for all tickers. */
  onProgress(listener: ProgressListener): () => void {
    this.progressListeners.add(listener);
    return () => { this.progressListeners.delete(listener); };
  }

  private emitProgress(ticker: string, stage: number, totalStages: number, stageLabel: string): void {
    for (const listener of this.progressListeners) {
      listener(ticker, stage, totalStages, stageLabel);
    }
  }

  /**
   * Get current process info for a ticker.
   * Returns queued state, active scrape state, or null if not in-flight.
   */
  getProcessInfo(ticker: string): ProcessInfo | null {
    const running = this.running.get(ticker);
    if (running) return running;
    if (this.queued.has(ticker)) {
      return { ticker, startTime: Date.now(), stage: 0, totalStages: 4, stageLabel: 'queued', queued: true, stageStartTime: Date.now(), stageDurations: [] };
    }
    return null;
  }

  /** Leave alternate screen, restore stdout/stderr, show cursor. */
  destroy(): void {
    if (this.renderTimer) { clearInterval(this.renderTimer); this.renderTimer = null; }
    process.stdout.write = rawWrite;
    process.stderr.write = rawErrWrite;
    rawWrite(CURSOR_SHOW + ALT_SCREEN_OFF);
  }

  // -- Rendering ------------------------------------------------------------

  private render(): void {
    if (!this.enabled) return;

    const lines: string[] = [];

    lines.push('');
    lines.push(color(' ◆ STOX SERVER METRICS ', BOLD, FG.cyan));
    if (this.bannerLines.length > 0) {
      for (const line of this.bannerLines) {
        lines.push(`  ${color(line, FG.green)}`);
      }
    }
    lines.push(color('─'.repeat(52), DIM));

    const runCount = this.running.size;
    const queueCount = this.queued.size;
    const runColor = runCount > 0 ? FG.green : FG.gray;
    lines.push(
      `  ${color('Running:', BOLD, FG.white)} ${color(String(runCount), BOLD, runColor)}` +
      `  ${color('Queued:', BOLD, FG.white)} ${color(String(queueCount), FG.yellow)}` +
      `  ${color('Completed:', BOLD, FG.white)} ${color(String(this.completed.length), FG.cyan)}`
    );

    const avgMs = this.averageDuration();
    const avgStr = avgMs > 0 ? `${(avgMs / 1000).toFixed(1)}s` : '—';
    lines.push(`  ${color('Avg time:', BOLD, FG.white)} ${color(avgStr, FG.yellow)}`);

    if (runCount > 0 || queueCount > 0) {
      lines.push('');
      lines.push(color('  Active processes:', BOLD, FG.magenta));
      const MAX_VISIBLE = 10;
      const procs = [...this.running.values()];
      const visible = procs.slice(0, MAX_VISIBLE);
      for (const proc of visible) {
        const elapsed = ((Date.now() - proc.startTime) / 1000).toFixed(1);
        const pct = proc.totalStages > 0 ? proc.stage / proc.totalStages : 0;
        lines.push(
          `    ${color(proc.ticker.padEnd(8), BOLD, FG.cyan)} ` +
          `${this.progressBar(pct)} ` +
          `${color(proc.stageLabel, DIM)} ` +
          `${color(`${elapsed}s`, FG.yellow)}`
        );
      }
      const hidden = runCount - MAX_VISIBLE;
      if (hidden > 0) {
        lines.push(`    ${color(`… and ${hidden} more`, DIM, FG.gray)}`);
      }
      if (queueCount > 0) {
        const list = [...this.queued].join(', ');
        lines.push(`    ${color('queued:', DIM, FG.yellow)} ${color(list, FG.yellow)}`);
      }
    }

    const recent = this.completed.slice(-5).reverse();
    if (recent.length > 0) {
      lines.push('');
      lines.push(color('  Recent completions:', BOLD, FG.green));
      for (const c of recent) {
        const dur = (c.duration / 1000).toFixed(1);
        const durColor = c.duration < 20000 ? FG.green : c.duration < 40000 ? FG.yellow : FG.red;
        lines.push(
          `    ${color('✓', FG.green)} ${color(c.ticker.padEnd(8), FG.white)} ${color(`${dur}s`, durColor)}`
        );
      }
    }

    const EVENT_TTL = 30_000;
    const now = Date.now();
    const recentEvents = this.events.filter((e) => now - e.timestamp < EVENT_TTL).slice(-5);
    if (recentEvents.length > 0) {
      lines.push('');
      lines.push(color('  Event log:', BOLD, FG.gray));
      for (const e of recentEvents) {
        const ago = Math.round((Date.now() - e.timestamp) / 1000);
        const agoStr = ago < 60 ? `${ago}s ago` : `${Math.round(ago / 60)}m ago`;
        lines.push(
          `    ${color('›', FG.gray)} ${color(e.message, DIM)} ${color(agoStr, FG.gray)}`
        );
      }
    }

    lines.push(color('─'.repeat(52), DIM));

    const STAGE_LABELS = ['quote summary', 'real-time price', 'balance sheet', 'profile'];
    const stageAvgs = this.averageStageDurations();
    if (stageAvgs.length > 0) {
      lines.push('');
      lines.push(color('  Avg stage durations:', BOLD, FG.white));
      for (let i = 0; i < STAGE_LABELS.length; i++) {
        const avg = stageAvgs[i];
        const avgStr = avg != null ? `${(avg / 1000).toFixed(1)}s` : '—';
        const avgColor = avg == null ? FG.gray : avg < 10000 ? FG.green : avg < 25000 ? FG.yellow : FG.red;
        lines.push(
          `    ${color(`${String(i + 1)}.`, DIM)} ${color(STAGE_LABELS[i].padEnd(18), FG.white)} ${color(avgStr, avgColor)}`
        );
      }
    }

    this.rendering = true;
    // Jump to top-left and clear, then draw — absolute positioning, no scrollback
    rawWrite(CURSOR_HOME + CLEAR_SCREEN + lines.join('\n') + '\n');
    this.rendering = false;
  }

  private progressBar(pct: number): string {
    const filled = Math.round(pct * PROGRESS_BAR_WIDTH);
    const empty = PROGRESS_BAR_WIDTH - filled;
    const filledStr = color('█'.repeat(filled), FG.green, BG.green);
    const emptyStr = color('░'.repeat(empty), DIM);
    const pctStr = `${Math.round(pct * 100)}%`.padStart(4);
    return `${filledStr}${emptyStr} ${color(pctStr, BOLD, FG.white)}`;
  }

  private averageDuration(): number {
    if (this.completed.length === 0) return 0;
    const total = this.completed.reduce((sum, c) => sum + c.duration, 0);
    return total / this.completed.length;
  }

  private averageStageDurations(): number[] {
    const counts: number[] = [];
    const totals: number[] = [];
    for (const c of this.completed) {
      for (let i = 0; i < c.stageDurations.length; i++) {
        totals[i] = (totals[i] ?? 0) + c.stageDurations[i];
        counts[i] = (counts[i] ?? 0) + 1;
      }
    }
    return totals.map((t, i) => t / counts[i]);
  }
}

export const metrics = new ServerMetrics();
