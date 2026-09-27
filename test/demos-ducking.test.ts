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
  // Two deviations from the brief's literal Step 1 test, both traced against a measured RED:
  // 1. Tick counts (60 / 80 -> 95 / 150). Ducking caps runSpeed at 45 px/s and DT is 1/60s,
  //    so 60 ticks (~1s) moves the body at most ~44px (measured: x landed at 62.25 from a
  //    start of 18) — the tunnel entrance at x 80 (col 5) is 62px away and unreachable in 60
  //    ticks at that speed. Raising the tick budget (not the position asserted) is the same
  //    fix the task brief pre-approved for the hint-followable test below. 95 ticks clears the
  //    entrance (measured ~88.5); the loop after release needed at least 117 more ticks to
  //    clear the far side of the tunnel (measured: `ducking` flips to false at iteration 116) —
  //    150 gives margin.
  // 2. Room width (12 cols -> 15 cols). The brief's 12-char ROWS puts its ceiling row as
  //    '#....#######' — 7 '#' after the 4-dot gap, i.e. the ceiling (cols 5-11) runs all the
  //    way to the right border (col 11), leaving no open column to stand up in before the
  //    wall. Measured: with the original ROWS the body's x plateaus at 164 (blocked by the
  //    right wall at col 11) while still ducking — "stood up past the tunnel" can never
  //    happen there regardless of tick count. Widened the room by 3 open columns (11-13,
  //    border moved to col 14) so the tunnel (still cols 5-10, matching the brief's own prose)
  //    has clearance on the far side, preserving the scenario's intent unchanged.
  it('shrinks the body, slows the run, and refuses to stand up under a ceiling', () => {
    const ROWS = ['###############', '#.............#', '#....######...#', '#@............#', '###############'];   // a 1-tile-high tunnel under cols 5-10
    const s = new BaseScene(ROWS, { player: spawn => new DuckPlayer(spawn) });
    const p = s.player as DuckPlayer;
    const input = new Input();
    step(s, input, ['down']);
    expect(p.ducking).toBe(true);
    expect(p.body.h).toBe(8);
    expect(p.body.y + p.body.h).toBe(64);               // feet still on the floor
    for (let i = 0; i < 95; i++) step(s, input, ['down', 'right']);
    expect(Math.abs(p.body.vx)).toBeLessThanOrEqual(45);
    expect(p.body.x).toBeGreaterThan(80);               // inside the tunnel
    step(s, input, ['right']);                          // release down under the ceiling
    expect(p.ducking).toBe(true);                       // no headroom: stays ducked
    for (let i = 0; i < 150; i++) step(s, input, ['right']);
    step(s, input);
    expect(p.ducking).toBe(false);                      // past the tunnel: stood up
    expect(p.body.h).toBe(14);
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
});
