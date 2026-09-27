import { describe, expect, it } from 'vitest';
import { catalogue, CATEGORIES } from '../src/demos';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';
import { stubContext } from './stub-context';

/** A scripted player: runs back and forth, jumps, acts, climbs and drops now and then. */
function heldAt(t: number): Action[] {
  const held: Action[] = [];
  held.push(t % 200 < 100 ? 'right' : 'left');
  if (t % 45 < 8) held.push('jump');
  if (t % 70 === 0) held.push('act');
  if (t % 130 < 20) held.push('up');
  if (t % 190 < 12) held.push('down');
  return held;
}

const ALL: Action[] = ['left', 'right', 'up', 'down', 'jump', 'act', 'reset'];

describe('catalogue', () => {
  it('has unique slugs and valid categories', () => {
    const ids = catalogue.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of catalogue) {
      expect(d.id).toMatch(/^[a-z0-9-]+$/);
      expect(CATEGORIES).toContain(d.category);
      expect(d.title.length).toBeGreaterThan(0);
      expect(d.blurb.length).toBeGreaterThan(0);
      expect(d.controls.length).toBeGreaterThan(0);
    }
  });

  for (const demo of catalogue) {
    it(`${demo.id} survives 600 scripted ticks and draws`, () => {
      const scene = demo.create();
      const input = new Input();
      const ctx = stubContext();
      for (let t = 0; t < 600; t++) {
        const held = heldAt(t);
        for (const a of ALL) { if (held.includes(a)) input.press(a); else input.release(a); }
        input.tick();
        scene.update(input);
        if (t % 10 === 0) scene.draw(ctx, scene.camera);
        if (scene instanceof BaseScene) {
          expect(Number.isFinite(scene.player.body.x)).toBe(true);
          expect(Number.isFinite(scene.player.body.y)).toBe(true);
        }
      }
      expect(ctx.calls).toContain('fillRect');
    });
  }
});
