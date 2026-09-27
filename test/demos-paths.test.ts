import { describe, expect, it } from 'vitest';
import { LeverScene } from '../src/demos/levers';
import { PortalScene } from '../src/demos/portals';
import { SlideScene } from '../src/demos/slides';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';
import { tileAt } from '../src/engine/tilemap';

const step = (s: BaseScene, input: Input, held: Action[] = []): void => {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick(); s.update(input);
};

describe('slides demo', () => {
  it('walking off the start ledge rides the slide to the floor', () => {
    const s = new SlideScene();
    const input = new Input();
    let rode = false;
    for (let i = 0; i < 400; i++) { step(s, input, ['right']); if (s.slide.active) rode = true; }
    expect(rode).toBe(true);
    expect(s.slide.active).toBe(false);
    expect(s.player.body.y).toBeGreaterThan(100);
  });

  it('walking off the top ledge enters the waterfall and it carries the player to the floor', () => {
    const s = new SlideScene();
    const input = new Input();
    s.player.moveTo({ x: 29 * 16, y: 1 * 16 });
    let entered = false;
    for (let i = 0; i < 200; i++) { step(s, input, ['right']); if (s.waterfall.active) entered = true; }
    expect(entered).toBe(true);
    for (let i = 0; i < 300; i++) step(s, input);
    expect(s.waterfall.active).toBe(false);
    expect(s.player.body.y).toBeGreaterThan(120);
  });
});

describe('portals demo', () => {
  it('constructs one two-way and one one-way portal from the markers', () => {
    const s = new PortalScene();
    expect(s.portals.map(p => p.twoWay)).toEqual([true, false]);
  });

  it('walking right from spawn reaches pad a and teleports to pad b', () => {
    const s = new PortalScene();
    const input = new Input();
    let i = 0;
    for (; i < 150 && s.portals[0].teleports < 1; i++) step(s, input, ['right']);
    expect(s.portals[0].teleports).toBe(1);
    expect(Math.abs(s.player.body.x - (16 * 16 + 2))).toBeLessThanOrEqual(6);
  });
});

describe('levers demo', () => {
  it('act at a lever opens its door and again closes it, but never onto the player', () => {
    const s = new LeverScene();
    const input = new Input();
    expect(tileAt(s.level, 14, 8)).toBe('door');
    let i = 0;
    for (; i < 200 && Math.abs(s.player.body.x - (9 * 16 + 2)) > 6; i++) step(s, input, ['right']);   // walk from spawn to the lever
    step(s, input);                                                  // release and settle
    expect(s.player.contacts.onGround).toBe(true);
    step(s, input, ['act']);
    expect(tileAt(s.level, 14, 8)).toBe('empty');
    expect(s.levers[0].on).toBe(true);
    s.player.moveTo({ x: 14 * 16, y: 8 * 16 });                     // stand in the open doorway
    step(s, input);
    s.toggleDoor(0, false);
    expect(tileAt(s.level, 14, 8)).toBe('empty');                   // refused: the player is inside
    s.player.moveTo(s.level.levers[0]);
    step(s, input);
    s.toggleDoor(0, false);
    expect(tileAt(s.level, 14, 8)).toBe('door');
  });
});
