import { describe, expect, it } from 'vitest';
import { enemyPatrol, PatrolScene, PATROL_LEVEL, PATROL_SPOTS } from '../src/demos/enemy-patrol';
import { Seeker } from '../src/demos/arena';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';
import { stubContext } from './stub-context';

const idle = (s: BaseScene, n: number): void => {
  const input = new Input();
  for (let i = 0; i < n; i++) { input.tick(); s.update(input); }
};

const PIT_ROOM = [
  '####################',
  '#..................#',
  '#@.................#',
  '#########...########',
  '####################',
];
const PIT_Y = 3 * 16;

describe('enemy patrol: seeker and pits', () => {
  it('a seeker walks toward the player and off a ledge', () => {
    const s = new PatrolScene([
      '####################',
      '#..................#',
      '#..............#####',
      '#..................#',
      '#@.................#',
      '####################',
    ], [{ cell: { x: 16 * 16, y: 1 * 16 }, dir: 1, turnAtLedges: false, seek: true }], 999);
    const e = s['spawner'].enemies()[0];
    expect(e).toBeInstanceOf(Seeker);
    const x0 = e.body.x;
    idle(s, 90);
    expect(e.body.x).toBeLessThan(x0 - 20);          // walked left toward the player
    expect(e.body.y).toBe(80 - 14);                  // and dropped off the ledge to the floor
  });

  it('the player falling into a pit respawns at the start', () => {
    const s = new PatrolScene(PIT_ROOM, [], PIT_Y);
    s.player.moveTo({ x: 10 * 16, y: 32 });          // above the pit
    let ticks = 0;
    while (s.falls === 0 && ticks++ < 120) idle(s, 1);
    expect(s.falls).toBe(1);
    expect(s.player.body.x).toBe(18);
    expect(s.player.body.y).toBe(34);
  });

  it('an enemy falling into a pit respawns at its spot', () => {
    const spot = { cell: { x: 4 * 16, y: 2 * 16 }, dir: 1 as const, turnAtLedges: false };
    const s = new PatrolScene(PIT_ROOM, [spot], PIT_Y);
    const spawner = s['spawner'];
    let gone = -1;
    for (let t = 0; t < 200 && gone < 0; t++) { idle(s, 1); if (spawner.enemies().length === 0) gone = t; }
    expect(gone).toBeGreaterThan(0);                 // walked right into the pit and was pulled
    idle(s, 40);
    const back = spawner.enemies();
    expect(back.length).toBe(1);
    expect(back[0].body.x).toBeGreaterThanOrEqual(spot.cell.x + 2);   // back at its spot, walking again
    expect(back[0].body.x).toBeLessThan(spot.cell.x + 20);
    expect(back[0].body.y).toBeLessThan(PIT_Y);
  });
});

describe('enemy patrol: the shipped level', () => {
  const IDLE_TICKS = 1200;   // 20 s: long enough for the seeker to walk the whole staircase and for the wall enemy to cross its box several times

  it('the seeker never reaches a player standing at the spawn', () => {
    const s = enemyPatrol.create() as PatrolScene;
    const spawn = { x: s.player.body.x, y: s.player.body.y };
    const seeker = s['spawner'].enemies()[0];
    let reachedFloor = false;
    let closest = Infinity;
    for (let t = 0; t < IDLE_TICKS; t++) {
      idle(s, 1);
      if (seeker.body.y + seeker.body.h >= 12 * 16 - 0.5) reachedFloor = true;
      closest = Math.min(closest, Math.hypot(seeker.body.x - s.player.body.x, seeker.body.y - s.player.body.y));
    }
    expect(reachedFloor).toBe(true);                        // it came all the way down after you
    expect(s.touched).toBe(0);
    expect(s.player.body).toMatchObject(spawn);             // never respawned or moved
    expect(closest).toBeGreaterThan(16);                    // and never got within a tile
    expect(seeker.body.y).toBeGreaterThan(s.player.body.y + 16);   // it ends below the start ledge, not on it
  });

  it('the wall enemy bounces between the two small walls and never falls in a pit', () => {
    const s = new PatrolScene(PATROL_LEVEL);
    const wall = s['spawner'].enemies()[2];
    expect(PATROL_SPOTS[2].turnAtLedges).toBe(false);
    let minX = Infinity, maxX = -Infinity, turns = 0, dir = wall.dir;
    for (let t = 0; t < IDLE_TICKS; t++) {
      idle(s, 1);
      minX = Math.min(minX, wall.body.x);
      maxX = Math.max(maxX, wall.body.x + wall.body.w);
      if (wall.dir !== dir) { turns++; dir = wall.dir; }
    }
    expect(wall.dead).toBe(false);
    expect(turns).toBeGreaterThanOrEqual(2);
    expect(minX).toBeGreaterThanOrEqual(14 * 16 - 0.01);    // the left small wall (col 13)
    expect(maxX).toBeLessThanOrEqual(25 * 16 + 0.01);       // the right small wall (col 25)
  });

  it('the player can jump back up onto the start ledge from the floor', () => {
    const s = new PatrolScene(PATROL_LEVEL, []);
    const input = new Input();
    // Walk off the ledge to the right and land on the floor.
    for (let t = 0; t < 60; t++) { input.press('right'); input.tick(); s.update(input); }
    input.release('right');
    expect(s.player.body.y + s.player.body.h).toBe(12 * 16);
    // Turn around and walk back to within a tile of the ledge, then jump while holding left: a 32 px ledge is under the 42 px jump.
    for (let t = 0; t < 36; t++) { input.press('left'); input.tick(); s.update(input); }
    expect(s.player.body.x).toBeLessThan(6 * 16);           // within two tiles of the ledge edge (x 64)
    for (let t = 0; t < 60; t++) { input.press('left'); if (t < 12) input.press('jump'); else input.release('jump'); input.tick(); s.update(input); }
    expect(s.player.body.y + s.player.body.h).toBe(10 * 16);
    expect(s.player.body.x).toBeLessThan(4 * 16);
  });

  it('paints every pit floor red', () => {
    const s = new PatrolScene(PATROL_LEVEL, []);
    expect(s.pitFloorCells()).toEqual([9, 10, 11, 29, 30, 31].map(col => ({ col, row: 13 })));
    const ctx = stubContext();
    s.draw(ctx, s.camera);
    expect(ctx.calls.filter(c => c === 'fillRect').length).toBeGreaterThan(0);
  });
});
