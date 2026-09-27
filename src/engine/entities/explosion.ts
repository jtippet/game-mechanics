import type { Rect } from '../geom';
import { PALETTE } from '../renderer';
import type { Entity } from '../scene';

/** A blast radius that the owning scene applies damage from on the tick it is created; the entity itself only draws an expanding ring. */
export class Explosion implements Entity {
  dead = false;
  private age = 0;

  constructor(readonly cx: number, readonly cy: number, readonly radius: number, private readonly ticks = 20, private readonly color: string = PALETTE.danger) {}

  inRange(r: Rect): boolean {
    const nx = Math.max(r.x, Math.min(this.cx, r.x + r.w));
    const ny = Math.max(r.y, Math.min(this.cy, r.y + r.h));
    const dx = this.cx - nx;
    const dy = this.cy - ny;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  update(): void {
    if (++this.age >= this.ticks) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const r = this.radius * this.age / this.ticks;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, Math.max(1, r), 0, Math.PI * 2);
    ctx.stroke();
  }
}
