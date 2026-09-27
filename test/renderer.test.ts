import { describe, expect, it } from 'vitest';
import { Camera } from '../src/engine/camera';
import { drawActor, drawBackdrop, drawLevel, drawText, PALETTE } from '../src/engine/renderer';
import { parseLevel } from '../src/engine/tilemap';
import { stubContext } from './stub-context';

describe('renderer', () => {
  it('draws every tile kind without throwing', () => {
    const level = parseLevel(['#-^|d.', '#..@..']);
    const ctx = stubContext();
    const cam = new Camera(320, 180, level.pixelWidth, level.pixelHeight);
    drawLevel(ctx, level, cam);
    expect(ctx.calls.filter(c => c === 'fillRect').length).toBeGreaterThan(4);
  });

  it('culls to the cells the camera can see', () => {
    // 100×100 solid tiles; a 320×180 view at the origin sees cols 0..20 and rows 0..11
    const rows = Array.from({ length: 100 }, (_, r) => (r === 50 ? '@' + '#'.repeat(99) : '#'.repeat(100)));
    const level = parseLevel(rows);
    const ctx = stubContext();
    const cam = new Camera(320, 180, level.pixelWidth, level.pixelHeight);
    drawLevel(ctx, level, cam);
    expect(ctx.calls.filter(c => c === 'fillRect').length).toBe(21 * 12 * 2);   // two fillRect per solid tile
  });

  it('draws an actor facing either way and text and a backdrop', () => {
    const ctx = stubContext();
    drawActor(ctx, { x: 10, y: 10, w: 12, h: 14 }, PALETTE.player, 1);
    drawActor(ctx, { x: 10, y: 10, w: 12, h: 14 }, PALETTE.enemy, -1);
    drawText(ctx, 'hello', 4, 4);
    drawBackdrop(ctx, new Camera(320, 180, 2000, 200), 0.5, PALETTE.backdropFar, 3);
    expect(ctx.calls).toContain('fillText');
    expect(ctx.calls).toContain('translate');
  });

  it('backdrop layers shift vertically by the parallax factor when the camera rises', () => {
    const ys = (cam: Camera): number[] => {
      const ctx = stubContext();
      const out: number[] = [];
      (ctx as unknown as { fillRect: (x: number, y: number, w: number, h: number) => void }).fillRect = (_x, y) => { out.push(y); };
      drawBackdrop(ctx, cam, 0.5, PALETTE.backdropFar, 1);
      return out;
    };
    const resting = new Camera(320, 180, 2000, 260);
    resting.snap(160, 1000);                       // clamped to the bottom: y = 80
    const risen = new Camera(320, 180, 2000, 260);
    risen.snap(160, 1000);
    risen.y = 40;                                  // camera lifted 40 px
    const a = ys(resting), b = ys(risen);
    expect(a.length).toBe(b.length);
    // On screen (world y minus the layer's own offset) the skyline sits 0.5 * 40 = 20 px lower
    // once the camera has risen 40 px: it moves half as far as the ground does.
    for (let i = 0; i < a.length; i++) {
      const screenA = a[i] - resting.offset(0.5).y;
      const screenB = b[i] - risen.offset(0.5).y;
      expect(screenB - screenA).toBeCloseTo(20, 6);
    }
  });

  it('backdrop block heights are always positive', () => {
    const ctx = stubContext();
    const heights: number[] = [];
    (ctx as unknown as { fillRect: (x: number, y: number, w: number, h: number) => void }).fillRect = (_x, _y, _w, h) => { heights.push(h); };
    drawBackdrop(ctx, new Camera(320, 180, 2000, 200), 0.5, PALETTE.backdropFar, 0);
    expect(heights.length).toBeGreaterThan(0);
    expect(Math.min(...heights)).toBeGreaterThan(0);
  });
});
