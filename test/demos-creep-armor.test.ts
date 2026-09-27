import { describe, expect, it } from 'vitest';
import { ArmorScene, ShieldPickup } from '../src/demos/armor';
import { Creeper } from '../src/demos/arena';
import { CreepScene } from '../src/demos/creeping-enemies';
import type { HpPlayer } from '../src/engine/entities/hp-player';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';

function step(scene: BaseScene, input: Input, held: Action[] = []): void {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick();
  scene.update(input);
}

const ROOM = [
  '####################',
  '#..................#',
  '#..................#',
  '#@.................#',
  '####################',
];

describe('creeper', () => {
  it('freezes when the player faces it, and creeps when the player looks away', () => {
    const s = new CreepScene(ROOM, [{ cell: { x: 5 * 16, y: 3 * 16 }, dir: -1, turnAtLedges: true, kind: 'creep' }]);
    const input = new Input();
    const creeper = s.spawner.enemies()[0] as Creeper;

    step(s, input, ['right']);                    // player faces right, creeper is to the right
    expect(creeper.frozen).toBe(true);
    const xAfterFreeze = creeper.body.x;
    step(s, input, ['right']);
    expect(creeper.body.x).toBe(xAfterFreeze);     // still frozen: unmoved

    const xBeforeTurn = creeper.body.x;
    step(s, input, ['left']);                      // player turns to face left, away from the creeper
    expect(creeper.frozen).toBe(false);
    expect(creeper.body.x).toBeLessThan(xBeforeTurn);
  });

  it('freezes on the exact tick the player turns, alternating every tick', () => {
    const s = new CreepScene(ROOM, [{ cell: { x: 5 * 16, y: 3 * 16 }, dir: -1, turnAtLedges: true, kind: 'creep' }]);
    const input = new Input();
    const creeper = s.spawner.enemies()[0] as Creeper;

    for (let t = 0; t < 20; t++) {
      const facingRight = t % 2 === 0;
      step(s, input, [facingRight ? 'right' : 'left']);
      const side: 1 | -1 = creeper.body.x < s.player.body.x ? -1 : 1;
      expect(creeper.frozen).toBe(s.player.facing === side);
    }
  });
});

describe('creeper at a ledge', () => {
  // A short two-tile ledge (cols 5-6, row 3) well above a floor far below it
  // (row 7). The player idles on the floor past the ledge's right edge,
  // facing right: away from the creeper, which sits on the ledge to their
  // left, so it stays unfrozen and walks toward them.
  const LEDGE_ROOM = [
    '####################',
    '#..................#',
    '#..................#',
    '#....##............#',
    '#..................#',
    '#..................#',
    '#..............@...#',
    '####################',
  ];
  const LEDGE_SPOT_CELL = { x: 5 * 16, y: 2 * 16 };

  it('waits at the edge of its ledge instead of walking off, when turnAtLedges is true', () => {
    const s = new CreepScene(LEDGE_ROOM, [{ cell: LEDGE_SPOT_CELL, dir: 1, turnAtLedges: true, kind: 'creep' }]);
    s.player.facing = 1;
    const creeper = s.spawner.enemies()[0] as Creeper;
    const y0 = creeper.body.y;
    const ledgeRightEdge = 7 * 16;   // one past the last solid ledge column (6)
    const input = new Input();
    let sawWaiting = false;
    for (let i = 0; i < 200; i++) {
      step(s, input);                // idle: no keys held, so facing never changes
      if (creeper.waiting) sawWaiting = true;
    }
    expect(creeper.body.y).toBe(y0);                              // never fell
    expect(creeper.body.x + creeper.body.w).toBeLessThanOrEqual(ledgeRightEdge);
    expect(sawWaiting).toBe(true);
  });

  it('falls off the same ledge when turnAtLedges is false', () => {
    const s = new CreepScene(LEDGE_ROOM, [{ cell: LEDGE_SPOT_CELL, dir: 1, turnAtLedges: false, kind: 'creep' }]);
    s.player.facing = 1;
    const creeper = s.spawner.enemies()[0] as Creeper;
    const y0 = creeper.body.y;
    const input = new Input();
    for (let i = 0; i < 200; i++) step(s, input);
    expect(creeper.body.y).toBeGreaterThan(y0);
  });
});

describe('armor', () => {
  it('a shield absorbs one hit with no knockback, then returns 120 ticks later', () => {
    const s = new ArmorScene();
    const p = s.player as HpPlayer;
    const input = new Input();

    let ticks = 0;
    while (p.armor === 0 && ticks++ < 200) step(s, input, ['right']);
    expect(p.armor).toBe(1);

    while (p.armor === 1 && ticks++ < 400) step(s, input, ['right']);
    expect(p.hp).toBe(p.maxHp);           // the shield took the hit, not a heart
    expect(p.armor).toBe(0);
    expect(p.body.vx).toBeGreaterThanOrEqual(0);   // no knockback: still moving right (or stopped), never reversed

    let sawShield = false;
    for (let i = 0; i < 130; i++) {
      step(s, input);
      if (s.entities.some(e => e instanceof ShieldPickup)) sawShield = true;
    }
    expect(sawShield).toBe(true);
  });

  it('holding right from spawn reaches the shield within 300 ticks', () => {
    const s = new ArmorScene();
    const p = s.player as HpPlayer;
    const input = new Input();
    let ticks = 0;
    while (p.armor === 0 && ticks++ < 300) step(s, input, ['right']);
    expect(p.armor).toBe(1);
  });
});
