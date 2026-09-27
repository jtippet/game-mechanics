import { describe, expect, it } from 'vitest';
import { FlameJet } from '../src/engine/entities/flame-jet';
import { RollingRock } from '../src/engine/entities/rolling-rock';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';

const idle = (s: BaseScene, n: number): void => { const i = new Input(); for (let k = 0; k < n; k++) { i.tick(); s.update(i); } };

describe('RollingRock', () => {
  it('rolls, bounces off walls, and shoves the player', () => {
    const s = new BaseScene(['####################', '#..................#', '#@.....R...........#', '####################']);
    const rock = new RollingRock(s.level.rocks[0], -1, 60);
    s.entities.push(rock);
    const x0 = s.player.body.x;
    let shoved = false;
    for (let t = 0; t < 200; t++) { idle(s, 1); if (s.player.body.x < x0) shoved = true; }
    expect(shoved).toBe(true);
    expect(rock.dir).toBe(1);                                          // bounced off the left wall
  });
  it('reports a crush when the shove would push the player into a wall', () => {
    const s = new BaseScene(['####################', '#..................#', '#@..R..............#', '####################']);
    const rock = new RollingRock(s.level.rocks[0], -1, 60);
    s.entities.push(rock);
    let crushed = false;
    for (let t = 0; t < 120; t++) { idle(s, 1); if (rock.crushed) crushed = true; }
    expect(crushed).toBe(true);
    expect(s.player.body.x).toBeGreaterThanOrEqual(16);               // never inside the wall
  });
});

describe('FlameJet', () => {
  it('is on for onTicks, warns before relighting, and covers the nozzle cell', () => {
    const s = new BaseScene(['########', '#......#', '#@..F..#', '########']);
    const jet = new FlameJet(s.level.jets[0], 'up', 30, 30);
    s.entities.push(jet);
    idle(s, 1);
    expect(jet.active).toBe(true);
    expect(jet.hits({ x: 66, y: 34, w: 12, h: 14 })).toBe(true);       // standing on the nozzle cell
    expect(jet.hits({ x: 66, y: 10, w: 12, h: 14 })).toBe(true);       // one cell above
    expect(jet.hits({ x: 30, y: 34, w: 12, h: 14 })).toBe(false);
    idle(s, 30);
    expect(jet.active).toBe(false);
    expect(jet.hits({ x: 66, y: 34, w: 12, h: 14 })).toBe(false);
    idle(s, 15);
    expect(jet.warning).toBe(true);
    idle(s, 15);
    expect(jet.active).toBe(true);
  });
});
