import { describe, expect, it } from 'vitest';
import { ExplosionScene } from '../src/demos/explosions';
import { Grenade, GrenadeScene } from '../src/demos/grenades';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';

const step = (s: BaseScene, input: Input, held: Action[] = []): void => {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick(); s.update(input);
};
const ROOM = ['####################', '#..................#', '#..................#', '#@.................#', '####################'];

describe('explosions', () => {
  it('a thrown bomb kills an enemy near its landing spot and spares the far-away thrower', () => {
    const s = new ExplosionScene(ROOM, [{ cell: { x: 112, y: 48 }, dir: 1, turnAtLedges: false }]);
    s.spawner.enemies()[0].speed = 0;                 // stands at x 114..126; the bomb lands near x 103
    const input = new Input();
    step(s, input);
    step(s, input, ['act']);
    for (let i = 0; i < 90; i++) step(s, input);
    expect(s.hits).toBe(1);
    expect(s.hp.hp).toBe(3);
  });
  it('a point-blank bomb costs the thrower exactly one heart', () => {
    const s = new ExplosionScene(ROOM, []);
    const input = new Input();
    step(s, input, ['left']);                          // face the wall at x 16
    step(s, input, ['act']);                           // the bomb spawns inside the wall and detonates at once
    for (let i = 0; i < 30; i++) step(s, input);
    expect(s.hp.hp).toBe(2);
  });
});

describe('grenades', () => {
  it('bounces once, rests, then blows after the fuse, hurting whoever stands by it', () => {
    const s = new GrenadeScene(ROOM, []);
    const input = new Input();
    step(s, input);
    step(s, input, ['act']);
    const g = s.entities.find((e): e is Grenade => e instanceof Grenade)!;
    let bounced = false;
    for (let i = 0; i < 200 && !g.resting; i++) { const before = g.body.vy; step(s, input); if (before > 0 && g.body.vy < 0) bounced = true; }
    expect(bounced).toBe(true);
    expect(g.resting).toBe(true);
    s.player.moveTo({ x: g.body.x - 8, y: 32 });        // stand next to it
    for (let i = 0; i < 170; i++) step(s, input);
    expect(s.hp.hp).toBe(3);                            // fuse still burning
    for (let i = 0; i < 20; i++) step(s, input);
    expect(g.dead).toBe(true);
    expect(s.hp.hp).toBe(2);
  });
});
