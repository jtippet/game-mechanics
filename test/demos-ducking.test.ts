import { describe, expect, it } from 'vitest';
import { DuckPlayer, DuckScene } from '../src/demos/ducking';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';

const step = (s: BaseScene, input: Input, held: Action[] = []): void => {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick(); s.update(input);
};

describe('ducking', () => {
  it('shrinks the body, slows the run, blocks jumping, and stands back up on release', () => {
    const ROWS = ['############', '#..........#', '#..........#', '#@.........#', '############'];
    const s = new BaseScene(ROWS, { player: spawn => new DuckPlayer(spawn) });
    const p = s.player as DuckPlayer;
    const input = new Input();
    step(s, input);
    step(s, input, ['down']);
    expect(p.ducking).toBe(true);
    expect(p.body.h).toBe(8);
    expect(p.body.y + p.body.h).toBe(64);               // feet still on the floor
    for (let i = 0; i < 60; i++) step(s, input, ['down', 'right']);
    expect(Math.abs(p.body.vx)).toBeLessThanOrEqual(45);
    expect(p.noJump).toBe(true);
    step(s, input, ['down', 'jump']);
    expect(p.body.vy).toBeGreaterThanOrEqual(0);         // no jump while ducked
    step(s, input, ['right']);
    expect(p.ducking).toBe(false);
    expect(p.body.h).toBe(14);
    expect(p.body.y + p.body.h).toBe(64);
    expect(p.noJump).toBe(false);
  });
  it('a standing player is hit by the turret bullets and a ducking one is not', () => {
    const s = new DuckScene();
    const input = new Input();
    s.player.moveTo({ x: 30 * 16, y: 9 * 16 });
    for (let i = 0; i < 200; i++) step(s, input);
    expect(s.hp.hp).toBeLessThan(3);
    const t = new DuckScene();
    t.player.moveTo({ x: 30 * 16, y: 9 * 16 });
    for (let i = 0; i < 200; i++) step(t, input, ['down']);
    expect(t.hp.hp).toBe(3);
  });
  // Hint-followable: hold right+down from spawn and reach the goal ducked, untouched;
  // hold right only (standing) and take a hit before the same point.
  // Ducking halves runSpeed (45 vs 90 px/s) and the spawn-to-goal distance is ~510px,
  // so the walk needs more than the usual 600-tick budget; raised to 900 (measured: wins at tick 670).
  const DUCK_WALK_TICKS = 900;
  it('holding right+down from spawn reaches the goal ducked and untouched', () => {
    const s = new DuckScene();
    const input = new Input();
    for (let i = 0; i < DUCK_WALK_TICKS && !s.won; i++) step(s, input, ['right', 'down']);
    expect(s.won).toBe(true);
    expect(s.hp.hp).toBe(3);
  });
  it('holding right only (standing) takes a hit well before the goal', () => {
    const s = new DuckScene();
    const input = new Input();
    for (let i = 0; i < 300; i++) step(s, input, ['right']);
    expect(s.hp.hp).toBeLessThan(3);
  });
  it('dying while ducked stands the player back up at full height on respawn', () => {
    const s = new DuckScene();
    const p = s.hp as DuckPlayer;
    const input = new Input();
    step(s, input);
    step(s, input, ['down']);
    expect(p.ducking).toBe(true);
    s.hp.hp = 1;
    s.hurt(0);                                          // the public entry point, not damage() directly
    let guard = 0;
    while (s.dying > 0) { step(s, input); guard++; if (guard > 100) throw new Error('never respawned'); }
    expect(p.ducking).toBe(false);
    expect(p.body.h).toBe(14);
    expect(p.body.y + p.body.h).toBe(s.level.spawn.y + 16);   // standing on the spawn floor
  });
});
