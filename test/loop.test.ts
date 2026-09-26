import { describe, expect, it } from 'vitest';
import { DT } from '../src/engine/constants';
import { Loop } from '../src/engine/loop';

describe('Loop.advance', () => {
  it('runs one tick per DT and carries the remainder', () => {
    let ticks = 0;
    const l = new Loop(() => { ticks++; }, () => {});
    expect(l.advance(DT * 2.5)).toBe(2);
    expect(l.advance(DT * 0.6)).toBe(1);
    expect(ticks).toBe(3);
  });

  it('caps a long pause at a quarter second of catch-up', () => {
    let ticks = 0;
    const l = new Loop(() => { ticks++; }, () => {});
    const n = l.advance(60);
    expect(n).toBeGreaterThanOrEqual(14);      // 0.25 s is 15 ticks, give or take float rounding
    expect(n).toBeLessThanOrEqual(15);
    expect(ticks).toBe(n);
  });
});
