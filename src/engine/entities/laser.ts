import { TILE } from '../constants';
import type { Rect } from '../geom';
import { overlaps } from '../geom';
import { isSolidKind } from '../physics';
import type { Entity } from '../scene';
import type { Level } from '../tilemap';
import { tileAt } from '../tilemap';

/** An instant beam along one row, resolved at construction; drawn for a few ticks. */
export class Laser implements Entity {
  readonly beam: Rect;
  dead = false;

  constructor(x: number, y: number, dir: 1 | -1, level: Level, private readonly color: string, private life = 8) {
    const row = Math.floor(y / TILE);
    let col = Math.floor(x / TILE);
    while (col >= 0 && col < level.cols && !isSolidKind(tileAt(level, col + dir, row))) col += dir;
    const end = dir > 0 ? (col + 1) * TILE : col * TILE;
    this.beam = { x: Math.min(x, end), y: y - 1, w: Math.abs(end - x), h: 2 };
  }

  hits(r: Rect): boolean { return overlaps(this.beam, r); }

  update(): void { if (--this.life <= 0) this.dead = true; }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color;
    const thin = this.life <= 3;
    ctx.fillRect(this.beam.x, this.beam.y + (thin ? 1 : 0), this.beam.w, thin ? 1 : 2);
  }
}
