import { describe, expect, it } from 'vitest';
import { HpPlayer } from '../src/engine/entities/hp-player';
import { HpScene } from '../src/engine/hp-scene';
import { Input } from '../src/engine/input';
import { stubContext } from './stub-context';

const ROOM = ['############', '#..........#', '#@.........#', '############'];

class Probe extends HpScene {
  hitAt = -1;
  protected override afterUpdate(): void {
    if (this.tickDying()) return;
    if (this.ticks === this.hitAt) this.damage(this.player.body.x + 20);
  }
}
const idle = (s: HpScene, n: number): void => { const i = new Input(); for (let k = 0; k < n; k++) { i.tick(); s.update(i); } };

describe('HpPlayer', () => {
  it('armor absorbs a hit without losing a heart or knockback', () => {
    const p = new HpPlayer({ x: 16, y: 32 });
    p.armor = 1;
    expect(p.hurt(100)).toBe(true);
    expect(p.hp).toBe(3);
    expect(p.armor).toBe(0);
    expect(p.body.vx).toBe(0);
    expect(p.invuln).toBeGreaterThan(0);
    p.invuln = 0;
    expect(p.hurt(100)).toBe(true);
    expect(p.hp).toBe(2);
    expect(p.body.vx).toBeLessThan(0);
  });
});

describe('HpScene', () => {
  it('counts a death at zero hp, respawns after the window with everything reset, and draws hearts', () => {
    const s = new Probe(ROOM, { maxHp: 2 });
    s.hitAt = 3;
    idle(s, 3);
    expect(s.hp.hp).toBe(1);
    s.hp.invuln = 0;
    s.hp.armor = 1;
    s.hitAt = 6;
    idle(s, 3);
    expect(s.hp.hp).toBe(1);                 // armor took it
    s.hp.invuln = 0;
    s.hitAt = 9;
    idle(s, 3);
    expect(s.hp.hp).toBe(0);
    expect(s.deaths).toBe(1);
    expect(s.dying).toBeGreaterThan(0);
    s.hitAt = 12;                            // damage during the window is ignored
    idle(s, 60);
    expect(s.dying).toBe(0);
    expect(s.hp.hp).toBe(2);
    expect(s.hp.armor).toBe(0);
    expect(s.hp.flicker).toBe(false);
    expect(s.player.body.x).toBe(18);
    const ctx = stubContext();
    s.draw(ctx, s.camera);
    expect(ctx.calls.filter(c => c === 'fillRect').length).toBeGreaterThan(2);
  });
});
