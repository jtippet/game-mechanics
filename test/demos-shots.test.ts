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
    // Player on a ledge at row 4 (three rows of headroom above it, so the
    // stronger arc — vy0 -240, apex rise 48 px — clears the ceiling with
    // ~10 px to spare); ledge cols 0-2 on row 5; floor at row 6 (y 96).
    // Shot spawns at x0 30 (player body.x 18 + w 12), y0 70 (body.y 66 + 4).
    // y(t) = 70 - 240t + 300t^2; bottom (y+2) reaches the floor (96) at
    // y 94: 300t^2 - 240t - 24 = 0 -> t = (20 + sqrt(600)) / 50 ~= 0.890 s
    // (tick 53), x(t) = 30 + 200t ~= 208. Measured (test/zzz-debug scratch
    // run): tick 52 (last airborne tick) is x 203.33, bottom 93.67; the
    // enemy's 12-px body (cell.x 196 -> x 198..210) spans both that x and
    // the ~208 landing x, so it's hit as soon as the shot's falling body
    // enters the enemy's height band (measured: first overlap at tick 51).
    const ROWS = ['####################', '#..................#', '#..................#', '#..................#', '#@.................#', '###................#', '####################'];
    const s = new ArcScene(ROWS, [{ cell: { x: 196, y: 80 }, dir: 1, turnAtLedges: false }]);
    s.spawner.enemies()[0].speed = 0;                 // stands at x 198..210
    const input = new Input();
    step(s, input);
    step(s, input, ['act']);
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
