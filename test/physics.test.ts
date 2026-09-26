import { describe, expect, it } from 'vitest';
import { DT } from '../src/engine/constants';
import type { Body } from '../src/engine/physics';
import { contacts, moveBody } from '../src/engine/physics';
import { parseLevel } from '../src/engine/tilemap';

const ROOM = parseLevel([
  '##########',
  '#........#',
  '#........#',
  '#...--...#',
  '#........#',
  '#..@.....#',
  '#........#',
  '##########',
]);

const body = (x: number, y: number, vx = 0, vy = 0): Body => ({ x, y, w: 12, h: 14, vx, vy });

describe('moveBody', () => {
  it('lands on solid ground and reports onGround', () => {
    const b = body(40, 60, 0, 600);
    for (let i = 0; i < 60; i++) moveBody(ROOM, b);
    expect(b.y).toBe(112 - 14);
    expect(b.vy).toBe(0);
    expect(contacts(ROOM, b).onGround).toBe(true);
  });

  it('stops at a wall, zeroes vx and reports the wall side', () => {
    const b = body(40, 98, 300, 0);
    let c = moveBody(ROOM, b);
    for (let i = 0; i < 60; i++) { b.vx = 300; c = moveBody(ROOM, b); }
    expect(b.x).toBe(144 - 12);
    expect(b.vx).toBe(0);
    expect(c.onWallRight).toBe(true);
    expect(c.onWallLeft).toBe(false);
  });

  it('bonks a ceiling', () => {
    const b = body(40, 20, 0, -400);
    const c = moveBody(ROOM, b);
    expect(b.y).toBe(16);
    expect(b.vy).toBe(0);
    expect(c.onCeiling).toBe(true);
  });

  it('passes up through a one-way platform and lands on it from above', () => {
    const up = body(66, 70, 0, -300);          // under the planks at row 3 (y 48..64)
    for (let i = 0; i < 10; i++) { up.vy = -300; moveBody(ROOM, up); }
    expect(up.y).toBe(20);                     // rose straight through the planks
    expect(up.vy).toBe(-300);
    const down = body(66, 30, 0, 300);
    for (let i = 0; i < 30; i++) { down.vy = 300; moveBody(ROOM, down); }
    expect(down.y).toBe(48 - 14);
    expect(contacts(ROOM, down).onGround).toBe(true);
  });

  it('drops through a one-way platform when asked', () => {
    const b = body(66, 34, 0, 300);
    for (let i = 0; i < 30; i++) { b.vy = 300; moveBody(ROOM, b, { dropThrough: true }); }
    expect(b.y).toBe(112 - 14);
  });

  it('never tunnels through a one-tile wall at high speed', () => {
    const b = body(20, 98, 12000, 0);           // 200 px per tick; the wall at x 144 is 16 px thick
    moveBody(ROOM, b);
    expect(b.x).toBe(144 - 12);
    expect(b.vx).toBe(0);
  });

  it('reports a wall it is resting against with zero velocity', () => {
    const c = contacts(ROOM, body(16, 98));
    expect(c.onWallLeft).toBe(true);
    expect(c.onWallRight).toBe(false);
  });

  it('displacement is velocity times DT', () => {
    const b = body(40, 40, 60, 0);
    moveBody(ROOM, b);
    expect(b.x).toBeCloseTo(40 + 60 * DT, 9);
  });
});
