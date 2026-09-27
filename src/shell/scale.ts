import { VIEW_H, VIEW_W } from '../engine/constants';

/** Integer upscale that fits the space; never below 1 so a narrow phone overflows instead of blurring. */
export function scaleFor(availW: number, availH: number): number {
  return Math.max(1, Math.floor(Math.min(availW / VIEW_W, availH / VIEW_H)));
}
