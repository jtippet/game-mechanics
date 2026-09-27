import { describe, expect, it } from 'vitest';
import { Laser } from '../src/engine/entities/laser';
import { Projectile } from '../src/engine/entities/projectile';
import { Turret } from '../src/engine/entities/turret';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';
import { parseLevel } from '../src/engine/tilemap';

const ROOM = ['####################', '#..................#', '#..................#', '#..................#', '#@.................#', '####################'];
const idle = (s: BaseScene, n: number): void => { const i = new Input(); for (let k = 0; k < n; k++) { i.tick(); s.update(i); } };

describe('Projectile options', () => {
  it('arcs under gravity and reports its impact point', () => {
    const s = new BaseScene(ROOM);
    let impact: [number, number] | null = null;
    const p = new Projectile(40, 40, 1, 120, undefined, { gravity: 600, vy0: -100, onImpact: (x, y) => { impact = [x, y]; } });
    s.entities.push(p);
    idle(s, 5);
    expect(p.body.vy).toBeGreaterThan(-100);            // gravity pulled on it
    idle(s, 120);
    expect(p.dead).toBe(true);
    expect(impact).not.toBeNull();
    expect(impact![1]).toBeGreaterThan(60);              // hit the floor, not a wall
  });
  it('homes toward a target and dies of old age if it never arrives', () => {
    const s = new BaseScene(ROOM);
    const target = { x: 200, y: 20, w: 12, h: 14 };
    const p = new Projectile(40, 70, 1, 90, undefined, { homing: () => target, turnRate: 0.06, life: 60 });
    s.entities.push(p);
    idle(s, 20);
    expect(p.body.vy).toBeLessThan(0);                   // turned upward toward the target
    expect(Math.hypot(p.body.vx, p.body.vy)).toBeCloseTo(90, 0);
    idle(s, 45);
    expect(p.dead).toBe(true);
  });
});

describe('Laser', () => {
  it('resolves instantly to the first wall and hits anything on the row', () => {
    const level = parseLevel(ROOM);
    const l = new Laser(40, 70, 1, level, '#fff');
    expect(l.beam.x + l.beam.w).toBe(19 * 16);           // stopped at the right wall
    expect(l.beam.x).toBe(40);
    expect(l.hits({ x: 200, y: 64, w: 12, h: 14 })).toBe(true);
    expect(l.hits({ x: 200, y: 20, w: 12, h: 14 })).toBe(false);
    const s = new BaseScene(ROOM);
    s.entities.push(l);
    idle(s, 8);
    expect(l.dead).toBe(true);
  });
});

describe('Turret', () => {
  it('fires on its interval with the muzzle position', () => {
    const s = new BaseScene(ROOM);
    const shots: number[] = [];
    s.entities.push(new Turret({ x: 288, y: 64 }, -1, 30, (x, _y, dir) => { shots.push(x * dir); }));
    idle(s, 90);
    expect(shots.length).toBe(3);
    expect(shots[0]).toBe(-288);
  });
});
