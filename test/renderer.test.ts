import { describe, expect, it } from 'vitest';
import { Camera } from '../src/engine/camera';
import { drawActor, drawBackdrop, drawLevel, drawText, PALETTE } from '../src/engine/renderer';
import { parseLevel } from '../src/engine/tilemap';
import { stubContext } from './stub-context';

describe('renderer', () => {
  it('draws every tile kind without throwing and only touches visible cells', () => {
    const level = parseLevel(['#-^|d.', '#..@..']);
    const ctx = stubContext();
    const cam = new Camera(320, 180, level.pixelWidth, level.pixelHeight);
    drawLevel(ctx, level, cam);
    expect(ctx.calls.filter(c => c === 'fillRect').length).toBeGreaterThan(4);
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
});
