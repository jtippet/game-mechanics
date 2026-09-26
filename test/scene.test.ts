import { describe, expect, it } from 'vitest';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';
import { stubContext } from './stub-context';

const ROWS = [
  '############',
  '#..........#',
  '#..........#',
  '#..........#',
  '#..@.......#',
  '############',
];

function run(scene: BaseScene, input: Input, ticks: number, held: Array<'left' | 'right' | 'jump'> = []): void {
  for (let i = 0; i < ticks; i++) {
    for (const a of ['left', 'right', 'jump'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
    input.tick();
    scene.update(input);
  }
}

describe('BaseScene + Player', () => {
  it('spawns the player standing on the spawn cell floor', () => {
    const s = new BaseScene(ROWS);
    expect(s.player.body.x).toBe(48 + 2);
    expect(s.player.body.y).toBe(64 + 16 - 14);
    const input = new Input();
    run(s, input, 5);
    expect(s.player.contacts.onGround).toBe(true);
  });

  it('runs right, stops at the wall, and jumps only from the ground', () => {
    const s = new BaseScene(ROWS);
    const input = new Input();
    run(s, input, 120, ['right']);
    expect(s.player.body.x).toBe(176 - 12);
    expect(s.player.facing).toBe(1);
    run(s, input, 1, ['jump']);
    expect(s.player.body.vy).toBeLessThan(0);
    const yTop = s.player.body.y;
    run(s, input, 1);
    run(s, input, 1, ['jump']);          // a second press in the air does nothing
    expect(s.player.body.vy).toBeLessThan(0);
    run(s, input, 60);
    expect(s.player.body.y).toBeGreaterThan(yTop);
    expect(s.player.contacts.onGround).toBe(true);
  });

  it('draws with a stub context and shows hud lines', () => {
    const s = new BaseScene(ROWS);
    s.hud = ['hello'];
    const ctx = stubContext();
    s.draw(ctx, s.camera);
    expect(ctx.calls).toContain('fillText');
  });

  it('respawn returns the player to spawn with zero velocity', () => {
    const s = new BaseScene(ROWS);
    const input = new Input();
    run(s, input, 30, ['right']);
    s.respawn();
    expect(s.player.body.x).toBe(50);
    expect(s.player.body.vx).toBe(0);
  });

  it('controlLock ignores horizontal input for exactly that many ticks', () => {
    const s = new BaseScene(ROWS);
    const input = new Input();
    run(s, input, 2);
    s.player.controlLock = 2;
    run(s, input, 1, ['right']);
    expect(s.player.body.vx).toBe(0);
    run(s, input, 1, ['right']);
    expect(s.player.body.vx).toBe(0);
    run(s, input, 1, ['right']);
    expect(s.player.body.vx).toBeGreaterThan(0);
  });
});
