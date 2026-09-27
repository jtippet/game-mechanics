import { describe, expect, it } from 'vitest';
import { Explosion } from '../src/engine/entities/explosion';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';

describe('Explosion', () => {
  it('inRange uses the nearest point of the rect, and the entity dies after its ticks', () => {
    const e = new Explosion(100, 100, 30);
    expect(e.inRange({ x: 120, y: 90, w: 12, h: 14 })).toBe(true);     // nearest point (120,100) is 20 away
    expect(e.inRange({ x: 140, y: 90, w: 12, h: 14 })).toBe(false);    // 40 away
    expect(e.inRange({ x: 60, y: 60, w: 12, h: 14 })).toBe(false);     // corner (72,74): (28,26) -> 38.2 > 30
    const s = new BaseScene(['####', '#@.#', '####']);
    s.entities.push(e);
    const i = new Input();
    for (let k = 0; k < 20; k++) { i.tick(); s.update(i); }
    expect(e.dead).toBe(true);
    expect(s.entities).not.toContain(e);
  });
});
