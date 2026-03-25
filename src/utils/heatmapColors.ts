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
 * Returns a CSS background color on a green-to-red pastel scale for P:Book ratio.
 * Low P:Book (undervalued) = green, high P:Book (overvalued) = red.
 * Clamps to [0.5, 2.0] range.
 */
export function getIntrinsicColor(pBook: number | null, price: number | null, bookValue: number | null): string {
  if (pBook === null || price === null || bookValue === null) return NEUTRAL_COLOR;
  const ratio = (clamp(pBook, 0.5, 2.0) - 0.5) / 1.5; // 0 (green) to 1 (red)
  return `rgb(${lerp(206, 39, ratio)}, ${lerp(234, -36, ratio)}, ${lerp(214, -16, ratio)})`;
}
