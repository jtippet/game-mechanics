import { describe, expect, it } from 'vitest';
import { OneWayPlayer } from '../src/demos/one-way';
import { parallax } from '../src/demos/parallax';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';
import { stubContext } from './stub-context';

const PLANKS = [
  '########',
  '#......#',
  '#......#',
  '#......#',
  '#.---..#',
  '#@.....#',
  '########',
];

function step(scene: BaseScene, input: Input, held: Action[] = []): void {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick();
  scene.update(input);
}

describe('one-way platforms', () => {
  it('jumps up through a plank and lands on it', () => {
    const s = new BaseScene(PLANKS, { player: spawn => new OneWayPlayer(spawn) });
    const input = new Input();
    for (let i = 0; i < 12; i++) step(s, input, ['right']);
    step(s, input, ['jump']);
    for (let i = 0; i < 70; i++) step(s, input);
    expect(s.player.body.y).toBe(64 - 14);
    expect(s.player.contacts.onGround).toBe(true);
  });

  it('drops through with down + jump', () => {
    const s = new BaseScene(PLANKS, { player: spawn => new OneWayPlayer(spawn) });
    s.player.moveTo({ x: 32, y: 48 });                 // standing on the plank (top y 64)
    const input = new Input();
    step(s, input);
    step(s, input);
    expect(s.player.contacts.onGround).toBe(true);
    step(s, input, ['down', 'jump']);
    for (let i = 0; i < 30; i++) step(s, input);
    expect(s.player.body.y).toBe(96 - 14);
  });
});

describe('parallax', () => {
  it('draws two backdrop layers behind the level', () => {
    const scene = parallax.create();
    const ctx = stubContext();
    scene.draw(ctx, scene.camera);
    expect(ctx.calls.filter(c => c === 'translate').length).toBeGreaterThanOrEqual(3);
  });
});
