import { describe, expect, it } from 'vitest';
import { ConveyorScene } from '../src/demos/conveyor-belts';
import { SurfacePlayer } from '../src/demos/ice-and-sand';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';

const step = (s: BaseScene, input: Input, held: Action[] = []): void => {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick(); s.update(input);
};
const slideAfterRun = (rows: string[]): number => {
  const s = new BaseScene(rows, { player: spawn => new SurfacePlayer(spawn) });
  const input = new Input();
  for (let i = 0; i < 40; i++) step(s, input, ['right']);
  const x0 = s.player.body.x;
  for (let i = 0; i < 60; i++) step(s, input);
  return s.player.body.x - x0;
};

describe('ice and sand', () => {
  it('slides far on ice, stops short on sand, and sand caps the run speed', () => {
    const stone = slideAfterRun(['##########################', '#@.......................#', '##########################']);
    const ice   = slideAfterRun(['##########################', '#@.......................#', '#iiiiiiiiiiiiiiiiiiiiiiii#']);
    const sand  = slideAfterRun(['##########################', '#@.......................#', '#ssssssssssssssssssssssss#']);
    expect(ice).toBeGreaterThan(stone * 3);
    expect(sand).toBeLessThan(stone);
    const s = new BaseScene(['##########################', '#@.......................#', '#ssssssssssssssssssssssss#'], { player: spawn => new SurfacePlayer(spawn) });
    const input = new Input();
    for (let i = 0; i < 60; i++) step(s, input, ['right']);
    expect(Math.abs(s.player.body.vx)).toBeLessThanOrEqual(50);
  });
});

describe('conveyor belts', () => {
  it('carries a standing player, faster than walking on the fast belt, and never through a wall', () => {
    const s = new ConveyorScene(['####################', '#@.................#', '#>>>>>>>>>>>>>>>>>>#'], () => 140);
    const input = new Input();
    for (let i = 0; i < 60; i++) step(s, input);
    expect(s.player.body.x).toBeGreaterThan(18 + 100);          // carried ~140 px in a second
    for (let i = 0; i < 300; i++) step(s, input);
    expect(s.player.body.x).toBe(304 - 12);                     // pinned at the wall, not inside it
  });
  it('a slow belt against the run direction still lets you make headway', () => {
    const s = new ConveyorScene(['####################', '#@.................#', '#<<<<<<<<<<<<<<<<<<#'], () => 40);
    const input = new Input();
    for (let i = 0; i < 120; i++) step(s, input, ['right']);
    expect(s.player.body.x).toBeGreaterThan(60);
  });
});
