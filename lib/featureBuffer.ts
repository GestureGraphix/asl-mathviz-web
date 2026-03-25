/**
 * Module-level ring buffer for feature history.
 * Kept outside Zustand so writing never triggers React re-renders.
 * FeatureWaterfall reads it directly via requestAnimationFrame.
 *
 * Use `writeCount` (not buf.length) to detect new frames — buf.length
 * stays at MAX once full because shift()+push() keeps it constant.
 */

const MAX = 150;

export const featureBuf: Float32Array[] = [];
export let writeCount = 0; // monotonically increasing, never resets

export function pushToFeatureBuffer(fv: Float32Array): void {
  if (featureBuf.length >= MAX) featureBuf.shift();
  featureBuf.push(fv);
  writeCount++;
}

export function getWriteCount(): number { return writeCount; }
