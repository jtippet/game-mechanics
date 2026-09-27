import { describe, expect, it } from 'vitest';
import { CrumblingPlatform } from '../src/engine/entities/crumbling-platform';
import { IntervalPlatform } from '../src/engine/entities/interval-platform';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';

const ROOM = [
  '############',
  '#..........#',
  '#..........#',
  '#..........#',
  '#..........#',
  '#@.........#',
  '############',
];
const idle = (s: BaseScene, n: number): void => { const i = new Input(); for (let k = 0; k < n; k++) { i.tick(); s.update(i); } };

describe('CrumblingPlatform', () => {
  it('falls after 30 ticks of standing, the rider falls with it, and it returns 180 ticks after leaving', () => {
    const s = new BaseScene(ROOM);
    const p = new CrumblingPlatform({ x: 64, y: 48 }, 32, 'fall');
    s.entities.push(p);
    s.player.moveTo({ x: 64, y: 32 });        // standing on its top edge (y 48)
    idle(s, 5);
    expect(p.riding).toBe(true);
    expect(p.state).toBe('idle');
    idle(s, 30);
    expect(p.state).toBe('going');
    const y0 = p.rect.y;
    idle(s, 10);
    expect(p.rect.y).toBeGreaterThan(y0);
    expect(s.player.body.y).toBe(p.rect.y - 14);   // riding it down
    idle(s, 120);
    expect(p.state).toBe('gone');
    expect(p.solid).toBe(false);
    idle(s, 200);
    expect(p.state).toBe('idle');
    expect(p.rect).toMatchObject({ x: 64, y: 48 });
  });

  it('fades: blinks then stops being solid and the rider drops', () => {
    const s = new BaseScene(ROOM);
    const p = new CrumblingPlatform({ x: 64, y: 48 }, 32, 'fade');
    s.entities.push(p);
    s.player.moveTo({ x: 64, y: 32 });
    idle(s, 35);
    expect(p.state).toBe('going');
    idle(s, 25);
    expect(p.state).toBe('gone');
    expect(p.solid).toBe(false);
    idle(s, 2);
    expect(s.player.body.y).toBeGreaterThan(34);    // started falling
  });
});

describe('IntervalPlatform', () => {
  it('is solid for on ticks then off, and a rider drops when it goes', () => {
    const s = new BaseScene(ROOM);
    const p = new IntervalPlatform({ x: 64, y: 48 }, 32, 60, 30);
    s.entities.push(p);
    s.player.moveTo({ x: 64, y: 32 });
    idle(s, 10);
    expect(p.solid).toBe(true);
    expect(p.riding).toBe(true);
    idle(s, 55);
    expect(p.solid).toBe(false);
    expect(p.visible).toBe(false);
    idle(s, 3);
    expect(s.player.body.y).toBeGreaterThan(34);
    idle(s, 30);
    expect(p.solid).toBe(true);
  });
});
