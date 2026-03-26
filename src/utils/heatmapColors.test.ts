import { describe, it, expect } from 'vitest';
import { getDailyColor, getIntrinsicColor } from './heatmapColors';

describe('getDailyColor', () => {
  it('returns neutral grey for null', () => {
    expect(getDailyColor(null)).toBe('#e8eaed');
  });

  it('returns neutral-ish color for 0% change', () => {
    const color = getDailyColor(0);
    expect(color).toBe('rgb(232, 234, 237)');
  });

  it('returns greenish color for positive change', () => {
    const color = getDailyColor(5);
    // At +5%, ratio = 1, so r = 232-60=172, g = 234-4=230, b = 237-70=167
    expect(color).toBe('rgb(172, 230, 167)');
  });

  it('returns reddish color for negative change', () => {
    const color = getDailyColor(-5);
    // At -5%, absR = 1, so r = 232+13=245, g = 234-46=188, b = 237-49=188
    expect(color).toBe('rgb(245, 188, 188)');
  });

  it('clamps values beyond ±5%', () => {
    expect(getDailyColor(10)).toBe(getDailyColor(5));
    expect(getDailyColor(-10)).toBe(getDailyColor(-5));
  });
});

describe('getIntrinsicColor', () => {
  it('returns neutral grey when any input is null', () => {
    expect(getIntrinsicColor(null, 100, 50)).toBe('#e8eaed');
    expect(getIntrinsicColor(1.0, null, 50)).toBe('#e8eaed');
    expect(getIntrinsicColor(1.0, 100, null)).toBe('#e8eaed');
  });

  it('returns greenish color for P:Book in green zone (0.15–0.85)', () => {
    const color = getIntrinsicColor(0.5, 50, 100);
    // 0.5 is the midpoint of green zone — maximum green intensity
    const [r, g, b] = parseRgb(color);
    expect(r).toBeLessThan(200); // shifted green
    expect(b).toBeLessThan(200);
    expect(g).toBeGreaterThan(220);
  });

  it('returns yellowish color for P:Book in yellow zone (0.85–1.15)', () => {
    const color = getIntrinsicColor(1.0, 100, 100);
    const [r, g, b] = parseRgb(color);
    // Yellow-ish: higher red, moderate green, lower blue
    expect(r).toBeGreaterThan(230);
    expect(g).toBeGreaterThan(220);
    expect(b).toBeLessThan(210);
  });

  it('returns reddish color for high P:Book (>1.15)', () => {
    const color = getIntrinsicColor(2.0, 200, 100);
    const [r, g, b] = parseRgb(color);
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
  });

  it('returns reddish color for negative P:Book', () => {
    const color = getIntrinsicColor(-0.5, -50, 100);
    const [r, g, b] = parseRgb(color);
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
  });

  it('returns reddish color for P:Book below 0.15', () => {
    const color = getIntrinsicColor(0.05, 5, 100);
    const [r, g, b] = parseRgb(color);
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
  });
});

function parseRgb(color: string): [number, number, number] {
  const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) throw new Error(`Invalid rgb: ${color}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
