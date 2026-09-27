import { describe, expect, it } from 'vitest';
import { CheckpointScene } from '../src/demos/checkpoint';
import { HazardScene } from '../src/demos/hazards';
import { HpScene, type HpPlayer, MAX_HP } from '../src/demos/hit-points';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';

const SPIKES = [
  '############',
  '#..........#',
  '#..........#',
  '#@...^.....#',
  '############',
];

const FLAGS = [
  '####################',
  '#..................#',
  '#..................#',
  '#@.....*...^.......#',
  '####################',
];

function step(scene: BaseScene, input: Input, held: Action[] = []): void {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick();
  scene.update(input);
}

describe('hit points', () => {
  it('a spike costs one hp, knocks back, and grants invulnerability', () => {
    const s = new HpScene(SPIKES, []);
    const p = s.player as HpPlayer;
    const input = new Input();
    let ticks = 0;
    while (p.hp === MAX_HP && ticks++ < 200) step(s, input, ['right']);
    expect(p.hp).toBe(MAX_HP - 1);
    expect(p.invuln).toBeGreaterThan(0);
    expect(p.body.vy).toBeLessThan(0);
    expect(p.body.vx).toBeLessThan(0);
    for (let i = 0; i < 20; i++) step(s, input, ['right']);
    expect(p.hp).toBe(MAX_HP - 1);
  });

  it('at zero hp the player respawns with full hp', () => {
    const s = new HpScene(SPIKES, []);
    const p = s.player as HpPlayer;
    const input = new Input();
    for (let i = 0; i < 900; i++) step(s, input, ['right']);
    expect(s.deaths).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < 60; i++) step(s, input);       // let any dying window finish
    expect(p.hp).toBe(MAX_HP);
  });
});

describe('hazards', () => {
  it('a spike kills and respawns at the start', () => {
    const s = new HazardScene(SPIKES);
    const input = new Input();
    let ticks = 0;
    while (s.deaths === 0 && ticks++ < 200) step(s, input, ['right']);
    expect(s.deaths).toBe(1);
    for (let i = 0; i < 40; i++) step(s, input);
    expect(s.deaths).toBe(1);
    expect(s.player.body.x).toBe(18);
  });
});

describe('checkpoint', () => {
  it('dying after touching a flag respawns at the flag', () => {
    const s = new CheckpointScene(FLAGS);
    const input = new Input();
    let ticks = 0;
    while (s.deaths === 0 && ticks++ < 400) step(s, input, ['right']);
    expect(s.active).toBe(0);
    expect(s.deaths).toBe(1);
    for (let i = 0; i < 60; i++) step(s, input);
    expect(s.player.body.x).toBe(7 * 16 + 2);
  });
});
