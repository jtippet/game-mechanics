import { describe, expect, it } from 'vitest';
import { CollectScene } from '../src/demos/collectibles';
import { KeyDoorScene } from '../src/demos/keys-and-doors';
import { BOOST_TICKS, PowerupScene } from '../src/demos/powerup';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';
import { tileAt } from '../src/engine/tilemap';

function step(scene: BaseScene, input: Input, held: Action[] = []): void {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick();
  scene.update(input);
}

describe('collectibles', () => {
  it('counts coins and notices when all are taken', () => {
    const s = new CollectScene(['############', '#..........#', '#@..*..*...#', '############']);
    const input = new Input();
    expect(s.total).toBe(2);
    for (let i = 0; i < 150; i++) step(s, input, ['right']);
    expect(s.got).toBe(2);
    expect(s.hud.join(' ')).toContain('All');
  });
});

describe('powerup', () => {
  it('speeds the player up for a while, then the pickup comes back', () => {
    const s = new PowerupScene(['##########', '#........#', '#@.*.....#', '##########']);
    const input = new Input();
    const base = s.player.runSpeed;
    for (let i = 0; i < 40; i++) step(s, input, ['right']);
    expect(s.player.runSpeed).toBeGreaterThan(base);
    expect(s.boost).toBeGreaterThan(0);
    for (let i = 0; i < BOOST_TICKS + 5; i++) step(s, input);
    expect(s.player.runSpeed).toBe(base);
    expect(s.entities.length).toBe(0);
    for (let i = 0; i < 70; i++) step(s, input);
    expect(s.entities.length).toBe(1);
  });
});

describe('keys and doors', () => {
  const ROWS = ['############', '#..........#', '#@..k..d...#', '############'];

  it('the door blocks without the key', () => {
    const s = new KeyDoorScene(ROWS);
    // start past the key so the player never touches it
    s.player.moveTo({ x: 80, y: 32 });
    const input = new Input();
    for (let i = 0; i < 60; i++) step(s, input, ['right']);
    expect(s.hasKey).toBe(false);
    expect(s.player.body.x).toBe(112 - 12);
    expect(tileAt(s.level, 7, 2)).toBe('door');
  });

  it('with the key, touching the door opens it', () => {
    const s = new KeyDoorScene(ROWS);
    const input = new Input();
    for (let i = 0; i < 120; i++) step(s, input, ['right']);
    expect(s.hasKey).toBe(true);
    expect(s.opened).toBe(true);
    expect(tileAt(s.level, 7, 2)).toBe('empty');
    expect(s.player.body.x).toBeGreaterThan(112);
  });
});
