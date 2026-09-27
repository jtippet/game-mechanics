import { describe, expect, it } from 'vitest';
import { Chute } from '../src/engine/entities/chute';
import { Lever } from '../src/engine/entities/lever';
import { Portal } from '../src/engine/entities/portal';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';

const step = (s: BaseScene, input: Input, held: Action[] = []): void => {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick(); s.update(input);
};
const OPEN = ['####################', '#..................#', '#..................#', '#..................#', '#..................#', '#@.................#', '####################'];

describe('Chute', () => {
  it('carries the player along its waypoints and releases at the end', () => {
    const s = new BaseScene(OPEN);
    const chute = new Chute([{ x: 48, y: 80 }, { x: 128, y: 32 }, { x: 208, y: 64 }], '#fff', 120);
    s.entities.push(chute);
    const input = new Input();
    for (let i = 0; i < 40; i++) step(s, input, ['right']);           // walk into the first cell at x 48..64
    expect(chute.active).toBe(true);
    expect(s.player.noJump).toBe(true);
    for (let i = 0; i < 20; i++) step(s, input, ['jump']);            // jump is ignored while riding
    expect(s.player.body.y).toBeLessThan(64);                          // rose toward the second waypoint (y 32)
    for (let i = 0; i < 200; i++) step(s, input);
    expect(chute.active).toBe(false);
    expect(s.player.noJump).toBe(false);
    expect(s.player.gravity).toBe(600);
    expect(s.player.body.x).toBeGreaterThan(200);                      // arrived at the last waypoint and was released
  });

  it('lets go after a moment if a wall blocks the path', () => {
    const WALLED = ['####################', '#..................#', '#..........#.......#', '#..........#.......#', '#..........#.......#', '#@.........#.......#', '####################'];
    const s = new BaseScene(WALLED);
    const chute = new Chute([{ x: 48, y: 80 }, { x: 240, y: 80 }], '#fff', 120);   // the second waypoint is behind the wall at col 11
    s.entities.push(chute);
    const input = new Input();
    for (let i = 0; i < 40; i++) step(s, input, ['right']);
    expect(chute.active).toBe(true);
    for (let i = 0; i < 120; i++) step(s, input);
    expect(chute.active).toBe(false);
    expect(s.player.noJump).toBe(false);
    expect(s.player.gravity).toBe(600);
    expect(s.player.body.x).toBeLessThan(176);                                    // still on the near side of the wall
  });

  it('refuses a chute with fewer than two waypoints', () => {
    expect(() => new Chute([{ x: 0, y: 0 }], '#fff')).toThrow('at least two');
  });
});

describe('Portal', () => {
  it('teleports on entry, is quiet for 30 ticks, and the one-way exit does nothing', () => {
    const s = new BaseScene(OPEN);
    const portal = new Portal({ x: 48, y: 80 }, { x: 240, y: 80 }, false, '#fff');
    s.entities.push(portal);
    const input = new Input();
    for (let i = 0; i < 15; i++) step(s, input, ['right']);
    expect(portal.teleports).toBe(1);
    expect(s.player.body.x).toBe(240 + 2);
    for (let i = 0; i < 150; i++) step(s, input, ['left']);           // walk back over pad b: nothing (one-way), then over pad a again
    expect(portal.teleports).toBe(2);
  });
  it('a two-way pair cannot ping-pong inside the cooldown', () => {
    const s = new BaseScene(OPEN);
    const portal = new Portal({ x: 48, y: 80 }, { x: 64, y: 80 }, true, '#fff');   // adjacent pads
    s.entities.push(portal);
    const input = new Input();
    for (let i = 0; i < 25; i++) step(s, input, ['right']);
    expect(portal.teleports).toBe(1);
    for (let i = 0; i < 29; i++) step(s, input);
    expect(portal.teleports).toBe(1);                                  // standing on pad b during the cooldown
  });
  it('does not re-fire on a standing player once the cooldown ends, but re-arms once the player leaves the pad', () => {
    const s = new BaseScene(OPEN);
    const portal = new Portal({ x: 48, y: 80 }, { x: 160, y: 80 }, true, '#fff');   // far-apart pads
    s.entities.push(portal);
    const input = new Input();
    let i = 0;
    for (; i < 100 && portal.teleports < 1; i++) step(s, input, ['right']);   // walk into pad a
    expect(portal.teleports).toBe(1);
    for (let j = 0; j < 100; j++) step(s, input);                      // stand still on pad b well past the cooldown
    expect(portal.teleports).toBe(1);
    let j = 0;
    for (; j < 60 && s.player.body.x > 140; j++) step(s, input, ['left']);    // walk fully clear of pad b
    for (j = 0; j < 60 && portal.teleports < 2; j++) step(s, input, ['right']);   // and back onto it
    expect(portal.teleports).toBe(2);
  });
});

describe('Lever', () => {
  it('toggles with act while overlapped and not otherwise', () => {
    const s = new BaseScene(OPEN);
    const seen: boolean[] = [];
    const lever = new Lever({ x: 48, y: 80 }, on => seen.push(on));
    s.entities.push(lever);
    const input = new Input();
    step(s, input, ['act']);
    expect(seen).toEqual([]);                                          // not overlapping yet
    for (let i = 0; i < 30; i++) step(s, input, ['right']);
    step(s, input, ['act']);
    step(s, input);
    step(s, input, ['act']);
    expect(seen).toEqual([true, false]);
    expect(lever.on).toBe(false);
  });
});
