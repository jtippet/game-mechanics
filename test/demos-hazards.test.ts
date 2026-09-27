import { describe, expect, it } from 'vitest';
import { FlameScene } from '../src/demos/flame-jets';
import { MineScene } from '../src/demos/landmines';
import { RockScene } from '../src/demos/rolling-rocks';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';

const idle = (s: BaseScene, n: number): void => { const i = new Input(); for (let k = 0; k < n; k++) { i.tick(); s.update(i); } };

describe('landmines', () => {
  it('arms when stepped on and explodes after the delay, costing one heart if still near', () => {
    const s = new MineScene();
    s.player.moveTo(s.level.mines[0]);
    idle(s, 2);
    expect(s.mines[0].state).toBe('armed');
    idle(s, 50);
    expect(s.mines[0].state).toBe('gone');
    expect(s.hp.hp).toBe(2);
    idle(s, 260);
    expect(s.mines[0].state).toBe('idle');
  });
});

describe('flame jets', () => {
  it('an active jet costs a heart the tick it lights; a resting one never does', () => {
    const s = new FlameScene();
    const jet = s.jets[0];
    s.player.moveTo(jet.cell);
    let n = 0;
    while (!jet.active && n++ < 300) { idle(s, 1); if (!jet.active) expect(s.hp.hp).toBe(3); }
    expect(jet.active).toBe(true);
    expect(s.hp.hp).toBe(2);                          // hurt on the ignition tick
    idle(s, 30);
    expect(s.hp.hp).toBe(2);                          // invulnerability covers the rest of the burst
  });
});

describe('rolling rocks', () => {
  it('a rock crushing the player against the wall costs a heart', () => {
    const s = new RockScene();
    s.player.moveTo({ x: 12 * 16, y: 9 * 16 });     // beside the pillar, in the rock's lane
    const hp = s.hp.hp;
    for (let t = 0; t < 900 && s.hp.hp === hp; t++) idle(s, 1);
    expect(s.hp.hp).toBeLessThan(hp);
  });
});
