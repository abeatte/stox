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

  it('returns greenish color for low P:Book (undervalued)', () => {
    const color = getIntrinsicColor(0.5, 50, 100);
    // ratio = 0, so base green values
    expect(color).toBe('rgb(206, 234, 214)');
  });

  it('returns reddish color for high P:Book (overvalued)', () => {
    const color = getIntrinsicColor(2.0, 200, 100);
    // ratio = 1, so r = 206+39=245, g = 234-36=198, b = 214-16=198
    expect(color).toBe('rgb(245, 198, 198)');
  });

  it('clamps P:Book to [0.5, 2.0] range', () => {
    expect(getIntrinsicColor(0.1, 10, 100)).toBe(getIntrinsicColor(0.5, 50, 100));
    expect(getIntrinsicColor(5.0, 500, 100)).toBe(getIntrinsicColor(2.0, 200, 100));
  });
});
