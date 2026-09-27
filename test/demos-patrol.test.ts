import { describe, expect, it } from 'vitest';
import { PatrolScene } from '../src/demos/enemy-patrol';
import { Seeker } from '../src/demos/arena';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';

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
