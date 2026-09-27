import { describe, expect, it } from 'vitest';
import { CrumblingScene } from '../src/demos/crumbling-platforms';
import { IntervalScene } from '../src/demos/interval-platforms';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';

const idle = (s: BaseScene, n: number): void => { const i = new Input(); for (let k = 0; k < n; k++) { i.tick(); s.update(i); } };

describe('crumbling platforms demo', () => {
  it('has a lower fading row and an upper falling row, and respawns on the spikes', () => {
    const s = new CrumblingScene();
    const kinds = s.platforms.map(p => p.kind);
    expect(kinds.filter(k => k === 'fade').length).toBe(7);
    expect(kinds.filter(k => k === 'fall').length).toBe(6);
    s.player.moveTo({ x: 96, y: 128 });                 // on the first lower plank (top y 144)
    idle(s, 5);
    expect(s.platforms[0].riding).toBe(true);
    idle(s, 60);
    expect(s.platforms[0].state).toBe('gone');
    let ticks = 0;
    while (s.falls === 0 && ticks++ < 200) idle(s, 1);
    expect(s.falls).toBe(1);
    expect(s.player.body.x).toBe(50);
  });
});

describe('interval platforms demo', () => {
  it('alternates phases so neighbours are never both off', () => {
    const s = new IntervalScene();
    for (let t = 0; t < 400; t++) {
      idle(s, 1);
      for (let i = 0; i + 1 < s.platforms.length; i++) expect(s.platforms[i].solid || s.platforms[i + 1].solid).toBe(true);
    }
  });
});
