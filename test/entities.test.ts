import { describe, expect, it } from 'vitest';
import { MovingPlatform } from '../src/engine/entities/moving-platform';
import { Patroller } from '../src/engine/entities/patroller';
import { Pickup } from '../src/engine/entities/pickup';
import { Projectile } from '../src/engine/entities/projectile';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';

const ROWS = [
  '##########',
  '#........#',
  '#........#',
  '#..####..#',
  '#........#',
  '#.@......#',
  '##########',
];

const idle = (scene: BaseScene, ticks: number): void => {
  const input = new Input();
  for (let i = 0; i < ticks; i++) { input.tick(); scene.update(input); }
};

describe('Patroller', () => {
  it('turns at ledges and stays on its platform', () => {
    const s = new BaseScene(ROWS);
    const p = new Patroller({ x: 64, y: 32 }, 1, true);
    s.entities.push(p);
    let minX = Infinity, maxX = -Infinity;
    for (let i = 0; i < 300; i++) { idle(s, 1); minX = Math.min(minX, p.body.x); maxX = Math.max(maxX, p.body.x); }
    expect(p.body.y).toBe(48 - 14);
    expect(minX).toBeGreaterThanOrEqual(48);
    expect(maxX + p.body.w).toBeLessThanOrEqual(112);
    expect(maxX - minX).toBeGreaterThan(20);
  });

  it('a wall-only patroller walks the whole floor and turns at walls', () => {
    const s = new BaseScene(ROWS);
    const p = new Patroller({ x: 32, y: 80 }, 1, false);
    s.entities.push(p);
    let minX = Infinity, maxX = -Infinity;
    for (let i = 0; i < 600; i++) { idle(s, 1); minX = Math.min(minX, p.body.x); maxX = Math.max(maxX, p.body.x); }
    expect(minX).toBe(16);
    expect(maxX).toBe(144 - 12);
  });
});

describe('Projectile', () => {
  it('flies right and dies at the wall', () => {
    const s = new BaseScene(ROWS);
    const b = new Projectile(40, 90, 1);
    s.entities.push(b);
    idle(s, 60);
    expect(b.dead).toBe(true);
    expect(s.entities).not.toContain(b);
  });

  it('expires after its life even in open space', () => {
    const s = new BaseScene(['####', '#@.#', '####']);
    const b = new Projectile(20, 20, 1, 0);
    s.entities.push(b);
    idle(s, 91);
    expect(b.dead).toBe(true);
  });
});

describe('Pickup', () => {
  it('is collected when the player overlaps it', () => {
    const s = new BaseScene(ROWS);
    let got = 0;
    const p = new Pickup({ x: 32, y: 80 }, () => { got++; });
    s.entities.push(p);
    idle(s, 2);
    expect(got).toBe(1);
    expect(p.dead).toBe(true);
  });
});

// Same shape as ROWS, minus the row-3 solid platform: MovingPlatform's own
// tests ride at row 4-5 under x in [40,100], which the '####' patch in ROWS
// (cols 3-6, i.e. x 48-112) sits directly above. That's fine for the
// "carries a player" test (no vertical movement), but it turns the jump-off
// test's jump into an instant head-bonk: the player is blocked back to vy=0
// before MovingPlatform.update ever runs, so it reads as "never left" rather
// than "left and came back". Clearing row 3 gives the jump headroom while
// leaving the platform's own ride geometry (row 4/5) untouched.
const OPEN_ROWS = [
  '##########',
  '#........#',
  '#........#',
  '#........#',
  '#........#',
  '#.@......#',
  '##########',
];

describe('MovingPlatform', () => {
  it('carries a player standing on it', () => {
    const s = new BaseScene(OPEN_ROWS);
    const plat = new MovingPlatform({ x: 40, y: 80 }, { x: 100, y: 80 }, 48, 60);
    s.entities.push(plat);
    s.player.moveTo({ x: 48, y: 64 });      // stands on the platform's top edge (y 80)
    idle(s, 30);
    expect(plat.riding).toBe(true);
    expect(s.player.body.x).toBeCloseTo(50 + 30, 0);
    expect(s.player.body.y).toBe(66);
    expect(s.player.contacts.onGround).toBe(true);
  });

  it('lets the player jump off', () => {
    const s = new BaseScene(OPEN_ROWS);
    const plat = new MovingPlatform({ x: 40, y: 80 }, { x: 100, y: 80 }, 48, 60);
    s.entities.push(plat);
    s.player.moveTo({ x: 48, y: 64 });
    idle(s, 5);
    const input = new Input();
    input.press('jump');
    input.tick();
    s.update(input);
    expect(s.player.body.vy).toBeLessThan(0);
    expect(plat.riding).toBe(false);
  });
});
