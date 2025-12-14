import { CMYValues } from './types';

/**
 * Calculates the difference between target and initial filter settings.
 */
export const calculateDelta = (initial: CMYValues, target: CMYValues): CMYValues => {
  return {
    c: target.c - initial.c,
    m: target.m - initial.m,
    y: target.y - initial.y,
  };
};

export const formatValue = (val: number) => Math.round(val * 10) / 10;

/**
 * CLAMP helper to keep values between 0-255
 */
const clamp = (val: number) => Math.max(0, Math.min(255, val));

/**
 * Core Color Engine: Simulates RA-4 Enlarger Filtration
 * 
 * PHYSICS:
 * In Negative-to-Positive printing:
 * 1. +Yellow Filter -> Blocks Blue Light -> Less Blue hits paper -> Less Yellow dye -> Image is BLUER.
 * 2. +Magenta Filter -> Blocks Green Light -> Less Green hits paper -> Less Magenta dye -> Image is GREENER.
 * 3. +Cyan Filter -> Blocks Red Light -> Less Red hits paper -> Less Cyan dye -> Image is REDDER.
 * 
 * CROSSTALK (Impure Dyes):
 * Real dichroic filters are not perfect. 
 * - Increasing Magenta (Green gain) often slightly suppresses Red/Blue due to filter density.
 * - This creates a more "organic" look than pure digital RGB channel addition.
 */
export const processImageBuffer = (
  source: Uint8ClampedArray,
  destination: Uint8ClampedArray,
  delta: CMYValues
) => {
  // Sensitivity: 1 Filter Unit = X RGB Levels.
  // A standard shift of 10CC is clearly visible. 
  // Let's map 1 unit to roughly 1.5 RGB levels for intuitive feel.
  const STRENGTH = 1.8;

  // CROSSTALK MATRIX
  // When we boost a primary channel (via filtering), we slightly suppress the others 
  // to maintain better contrast and simulate density buildup.
  const XTALK = 0.15; 

  // Calculate the effective RGB gains based on Filter Deltas
  // Delta Y (+Yellow Filter) => Adds Blue
  // Delta M (+Magenta Filter) => Adds Green
  // Delta C (+Cyan Filter) => Adds Red
  const gainB = delta.y * STRENGTH;
  const gainG = delta.m * STRENGTH;
  const gainR = delta.c * STRENGTH;

  for (let i = 0; i < source.length; i += 4) {
    const r = source[i];
    const g = source[i + 1];
    const b = source[i + 2];
    // Alpha is source[i+3], usually ignored for photos

    // Apply Matrix mixing
    // New Red   = Old Red   + (Red Gain)   - (Green Gain * Xtalk) - (Blue Gain * Xtalk)
    // New Green = Old Green + (Green Gain) - (Red Gain * Xtalk)   - (Blue Gain * Xtalk)
    // New Blue  = Old Blue  + (Blue Gain)  - (Red Gain * Xtalk)   - (Green Gain * Xtalk)

    const newR = r + gainR - (gainG * XTALK) - (gainB * XTALK);
    const newG = g + gainG - (gainR * XTALK) - (gainB * XTALK);
    const newB = b + gainB - (gainR * XTALK) - (gainG * XTALK);

    destination[i] = clamp(newR);
    destination[i + 1] = clamp(newG);
    destination[i + 2] = clamp(newB);
    destination[i + 3] = source[i + 3]; // Preserve Alpha
  }
};
