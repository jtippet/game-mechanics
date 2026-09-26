import { describe, expect, it } from 'vitest';
import { Camera } from '../src/engine/camera';

describe('Camera', () => {
  it('snap centres on the target and clamps to bounds', () => {
    const c = new Camera(320, 180, 640, 192);
    c.snap(320, 96);
    expect(c.x).toBe(160);
    expect(c.y).toBe(6);
    c.snap(0, 0);
    expect(c.x).toBe(0);
    expect(c.y).toBe(0);
    c.snap(10000, 10000);
    expect(c.x).toBe(320);
    expect(c.y).toBe(12);
  });

  it('a level smaller than the view pins to 0', () => {
    const c = new Camera(320, 180, 160, 96);
    c.snap(500, 500);
    expect(c.x).toBe(0);
    expect(c.y).toBe(0);
  });

  it('follow only moves once the target leaves the dead zone', () => {
    const c = new Camera(320, 180, 2000, 2000);
    c.snap(500, 500);
    const x0 = c.x;
    c.follow(510, 500);
    expect(c.x).toBe(x0);
    c.follow(600, 500);
    expect(c.x).toBe(x0 + 100 - 24);
  });

  it('offset scales by parallax and rounds', () => {
    const c = new Camera(320, 180, 2000, 2000);
    c.snap(500, 500);
    expect(c.offset(1)).toEqual({ x: 340, y: 410 });
    expect(c.offset(0.5)).toEqual({ x: 170, y: 205 });
    expect(c.offset(0)).toEqual({ x: 0, y: 0 });
  });
});
