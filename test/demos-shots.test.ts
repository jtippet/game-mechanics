import { describe, expect, it } from 'vitest';
import { ArcScene } from '../src/demos/arcing-shots';
import { HomingScene } from '../src/demos/homing-missiles';
import { LaserScene } from '../src/demos/lasers';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';

const step = (s: BaseScene, input: Input, held: Action[] = []): void => {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick(); s.update(input);
};
const ROOM = ['####################', '#..................#', '#..................#', '#@.................#', '####################'];

describe('lasers', () => {
  it('one press kills every patroller on the row up to the wall', () => {
    const s = new LaserScene(ROOM, [{ cell: { x: 96, y: 48 }, dir: -1, turnAtLedges: false }, { cell: { x: 192, y: 48 }, dir: -1, turnAtLedges: false }]);
    const input = new Input();
    step(s, input);
    step(s, input, ['act']);
    expect(s.hits).toBe(2);
  });
});

describe('arcing shots', () => {
  it('a lobbed shot falls onto a patroller standing where the arc lands', () => {
    // Player on a ledge (spawn row 2, ledge cols 0-2 on row 3); enemy still on the floor (row 6, y 96).
    const ROWS = ['####################', '#..................#', '#@.................#', '###................#', '#..................#', '#..................#', '####################'];
    const s = new ArcScene(ROWS, [{ cell: { x: 168, y: 80 }, dir: 1, turnAtLedges: false }]);
    s.spawner.enemies()[0].speed = 0;                 // stands at x 170..182
    const input = new Input();
    step(s, input);
    step(s, input, ['act']);                           // from x 30, y 40: vx 200, vy0 -150, g 600 lands near x 182
    for (let i = 0; i < 120; i++) step(s, input);
    expect(s.hits).toBe(1);
  });
});

describe('homing missiles', () => {
  it('a missile fired away from an enemy behind and above still turns and hits it', () => {
    const ROWS = ['####################', '#..................#', '#.###..............#', '#..................#', '#........@.........#', '####################'];
    const s = new HomingScene(ROWS, [{ cell: { x: 32, y: 16 }, dir: 1, turnAtLedges: true }]);
    s.spawner.enemies()[0].speed = 0;
    const input = new Input();
    step(s, input, ['right']);                         // face right, away from the enemy
    step(s, input, ['act']);
    for (let i = 0; i < 200; i++) step(s, input);
    expect(s.hits).toBe(1);
  });
});
