import { describe, expect, it } from 'vitest';
import { DashPlayer, DASH_SPEED } from '../src/demos/dash';
import { WallPlayer } from '../src/demos/wall-climb';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';

const WALL = [
  '########',
  '#......#',
  '#..|...#',
  '#..|...#',
  '#..|...#',
  '#..|...#',
  '#..|...#',
  '#@.|...#',
  '########',
];

const OPEN = [
  '################',
  '#..............#',
  '#..............#',
  '#..............#',
  '#@.............#',
  '################',
];

function step(scene: BaseScene, input: Input, held: Action[] = []): void {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick();
  scene.update(input);
}

describe('wall climb', () => {
  it('clings while pushing into a climbable wall in the air, climbs up, and kicks off', () => {
    const s = new BaseScene(WALL, { player: spawn => new WallPlayer(spawn) });
    const p = s.player as WallPlayer;
    const input = new Input();
    for (let i = 0; i < 40; i++) step(s, input, ['right']);
    expect(p.body.x).toBe(48 - 12);
    step(s, input, ['right', 'jump']);
    for (let i = 0; i < 30; i++) step(s, input, ['right']);     // rise, then fall into the wall
    expect(p.clinging).toBe(true);
    expect(p.body.vy).toBeGreaterThan(0);
    expect(p.body.vy).toBeLessThan(60);                         // sliding, not falling
    const y = p.body.y;
    for (let i = 0; i < 10; i++) step(s, input, ['right', 'up']);
    expect(p.body.y).toBeLessThan(y);                           // climbed
    step(s, input, ['right', 'jump']);
    expect(p.body.vx).toBeLessThan(0);                          // kicked away from the wall
    expect(p.body.vy).toBeLessThan(0);
    expect(p.clinging).toBe(false);
  });
});

describe('dash', () => {
  it('bursts forward ignoring gravity, then cools down', () => {
    const s = new BaseScene(OPEN, { player: spawn => new DashPlayer(spawn) });
    const p = s.player as DashPlayer;
    const input = new Input();
    step(s, input, ['jump']);
    step(s, input);
    const y = p.body.y;
    step(s, input, ['act']);
    expect(p.body.vx).toBe(DASH_SPEED);
    expect(p.body.y).toBe(y);
    for (let i = 0; i < 4; i++) step(s, input);
    expect(p.body.y).toBe(y);
    expect(p.dashing).toBeGreaterThan(0);
    for (let i = 0; i < 10; i++) step(s, input);
    expect(p.dashing).toBe(0);
    step(s, input, ['act']);
    expect(p.dashing).toBe(0);                                  // still cooling down
    expect(p.cooldown).toBeGreaterThan(0);
  });
});
