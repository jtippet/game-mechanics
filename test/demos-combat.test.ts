import { describe, expect, it } from 'vitest';
import { MeleeScene } from '../src/demos/melee-attack';
import { RangedScene } from '../src/demos/ranged-weapon';
import { Patroller } from '../src/engine/entities/patroller';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';

const ROOM = [
  '####################',
  '#..................#',
  '#..................#',
  '#@.................#',
  '####################',
];

function step(scene: BaseScene, input: Input, held: Action[] = []): void {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick();
  scene.update(input);
}

const enemies = (s: BaseScene): Patroller[] => s.entities.filter((e): e is Patroller => e instanceof Patroller);

describe('ranged weapon', () => {
  it('a shot kills a patroller ahead and it respawns later', () => {
    const s = new RangedScene(ROOM, [{ cell: { x: 160, y: 48 }, dir: -1, turnAtLedges: false }]);
    const input = new Input();
    step(s, input);
    expect(enemies(s).length).toBe(1);
    step(s, input, ['act']);
    for (let i = 0; i < 60; i++) step(s, input);
    expect(s.hits).toBe(1);
    expect(enemies(s).length).toBe(0);
    for (let i = 0; i < 130; i++) step(s, input);
    expect(enemies(s).length).toBe(1);
  });
});

describe('melee attack', () => {
  it('a swing only hits inside its short window and reach', () => {
    const s = new MeleeScene(ROOM, [{ cell: { x: 40, y: 48 }, dir: -1, turnAtLedges: false }]);
    const input = new Input();
    step(s, input);
    step(s, input, ['act']);
    for (let i = 0; i < 8; i++) step(s, input);
    expect(s.hits).toBe(1);
    expect(enemies(s).length).toBe(0);
  });
});
