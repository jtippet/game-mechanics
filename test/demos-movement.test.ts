import { describe, expect, it } from 'vitest';
import { CoyotePlayer, COYOTE_TICKS } from '../src/demos/coyote-buffer';
import { DoubleJumpPlayer } from '../src/demos/double-jump';
import { VariableJumpPlayer } from '../src/demos/variable-jump';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';

const FLAT = [
  '############',
  '#..........#',
  '#..........#',
  '#..........#',
  '#..........#',
  '#@.........#',
  '############',
];

const LEDGE = [
  '##########',
  '#........#',
  '#........#',
  '#@.......#',
  '###......#',
  '#........#',
  '##########',
];

function step(scene: BaseScene, input: Input, held: Action[] = []): void {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick();
  scene.update(input);
}

describe('double jump', () => {
  it('allows exactly one extra jump in the air, restored on landing', () => {
    const s = new BaseScene(FLAT, { player: spawn => new DoubleJumpPlayer(spawn) });
    const p = s.player as DoubleJumpPlayer;
    const input = new Input();
    step(s, input);
    step(s, input, ['jump']);
    expect(p.body.vy).toBeLessThan(0);
    for (let i = 0; i < 10; i++) step(s, input);
    const vyBefore = p.body.vy;
    step(s, input, ['jump']);
    expect(p.body.vy).toBeLessThan(vyBefore);
    expect(p.jumpsLeft).toBe(0);
    for (let i = 0; i < 5; i++) step(s, input);
    const vy3 = p.body.vy;
    step(s, input, ['jump']);
    expect(p.body.vy).toBeGreaterThan(vy3);      // third press: just gravity
    for (let i = 0; i < 120; i++) step(s, input);
    expect(p.contacts.onGround).toBe(true);
    expect(p.jumpsLeft).toBe(1);
  });
});

describe('variable jump height', () => {
  it('a tapped jump peaks lower than a held jump', () => {
    const peak = (holdTicks: number): number => {
      const s = new BaseScene(FLAT, { player: spawn => new VariableJumpPlayer(spawn) });
      const p = s.player as VariableJumpPlayer;
      const input = new Input();
      step(s, input);
      const y0 = p.body.y;
      let top = y0;
      for (let i = 0; i < holdTicks; i++) { step(s, input, ['jump']); top = Math.min(top, p.body.y); }
      for (let i = 0; i < 80; i++) { step(s, input); top = Math.min(top, p.body.y); }
      return y0 - top;
    };
    expect(peak(2)).toBeGreaterThan(4);
    expect(peak(2)).toBeLessThan(peak(30) - 8);
  });

  it('a held jump reaches the top mark of the ruler (4 tiles)', () => {
    const TALL = ['############', ...Array.from({ length: 7 }, () => '#..........#'), '#@.........#', '############'];
    const s = new BaseScene(TALL, { player: spawn => new VariableJumpPlayer(spawn) });
    const p = s.player as VariableJumpPlayer;
    const input = new Input();
    step(s, input);
    const y0 = p.body.y;
    let top = y0;
    for (let i = 0; i < 40; i++) { step(s, input, ['jump']); top = Math.min(top, p.body.y); }
    for (let i = 0; i < 80; i++) { step(s, input); top = Math.min(top, p.body.y); }
    expect(y0 - top).toBeGreaterThanOrEqual(64);
    expect(p.lastPeak / 16).toBeGreaterThanOrEqual(4);
  });
});

describe('coyote time and jump buffering', () => {
  it('jumps a few ticks after walking off a ledge', () => {
    const s = new BaseScene(LEDGE, { player: spawn => new CoyotePlayer(spawn) });
    const p = s.player as CoyotePlayer;
    const input = new Input();
    while (p.contacts.onGround || p.ticks < 2) step(s, input, ['right']);
    for (let i = 0; i < COYOTE_TICKS - 2; i++) step(s, input, ['right']);
    step(s, input, ['right', 'jump']);
    expect(p.body.vy).toBeLessThan(0);
    expect(p.coyoteJumps).toBe(1);
  });

  it('a jump pressed just before landing fires on landing', () => {
    const s = new BaseScene(FLAT, { player: spawn => new CoyotePlayer(spawn) });
    const p = s.player as CoyotePlayer;
    p.moveTo({ x: 32, y: 77 });                      // 3 px above the floor
    const input = new Input();
    step(s, input);
    step(s, input, ['jump']);                        // still falling: buffered
    expect(p.body.vy).toBeGreaterThan(0);
    for (let i = 0; i < 12; i++) step(s, input);
    expect(p.bufferedJumps).toBe(1);
    expect(p.body.vy).toBeLessThan(0);
  });
});
