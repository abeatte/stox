/**
 * Heatmap color utilities.
 * Pure functions that map financial values to pastel RGB colors.
 * Extracted for reuse and testability.
 */

const NEUTRAL_COLOR = '#e8eaed';

/**
 * Clamp a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Interpolate an RGB channel from a base value by a signed ratio.
 */
function lerp(base: number, delta: number, ratio: number): number {
  return Math.round(base + delta * ratio);
}

/**
 * Returns a CSS background color on a red-to-green pastel scale for daily change.
 * Neutral = light grey, positive = soft green, negative = soft red.
 * Clamps to ±5% for color scaling.
 */
export function getDailyColor(changePercent: number | null): string {
  if (changePercent === null) return NEUTRAL_COLOR;
  const ratio = clamp(changePercent, -5, 5) / 5; // -1 to 1
  if (ratio >= 0) {
    return `rgb(${lerp(232, -60, ratio)}, ${lerp(234, -4, ratio)}, ${lerp(237, -70, ratio)})`;
  }
  const absR = Math.abs(ratio);
  return `rgb(${lerp(232, 13, absR)}, ${lerp(234, -46, absR)}, ${lerp(237, -49, absR)})`;
}

/**
 * Returns a CSS background color for P:Book ratio matching cell highlight rules.
 * Green: 0.15–0.85 (undervalued), Yellow: 0.85–1.15 (near book), Red: <0.15 or >1.15.
 * Negative values are always red. Intensity scales within each zone.
 */
export function getIntrinsicColor(pBook: number | null, price: number | null, bookValue: number | null): string {
  if (pBook === null || price === null || bookValue === null) return NEUTRAL_COLOR;

  // Red zone: negative or < 0.15
  if (pBook < 0.15) {
    // Deeper red the more negative / closer to 0
    const intensity = clamp((0.15 - pBook) / 0.65, 0, 1); // 0 at 0.15, 1 at -0.5 or below
    return `rgb(${lerp(232, 13, intensity)}, ${lerp(234, -46, intensity)}, ${lerp(237, -49, intensity)})`;
  }

  // Green zone: 0.15–0.85
  if (pBook <= 0.85) {
    // Greenest at 0.5 (midpoint), fading toward edges
    const mid = 0.5;
    const dist = Math.abs(pBook - mid) / 0.35; // 0 at center, 1 at edges
    const intensity = 1 - dist;
    return `rgb(${lerp(232, -60, intensity)}, ${lerp(234, -4, intensity)}, ${lerp(237, -70, intensity)})`;
  }

  // Yellow zone: 0.85–1.15
  if (pBook <= 1.15) {
    const intensity = clamp((pBook - 0.85) / 0.3, 0, 1); // 0 at 0.85, 1 at 1.15
    return `rgb(${lerp(232, 23, intensity)}, ${lerp(234, -6, intensity)}, ${lerp(237, -72, intensity)})`;
  }

  // Red zone: > 1.15
  const intensity = clamp((pBook - 1.15) / 0.85, 0, 1); // 0 at 1.15, 1 at 2.0+
  return `rgb(${lerp(232, 13, intensity)}, ${lerp(234, -46, intensity)}, ${lerp(237, -49, intensity)})`;
}
