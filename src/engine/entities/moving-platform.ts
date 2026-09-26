import type { Rect, Vec } from '../geom';
import { drawPlank } from '../renderer';
import type { BaseScene, Entity } from '../scene';

/**
 * Glides between two points and back. The player is not a tile, so this
 * entity does the carrying itself: it runs after the player each tick, and
 * either keeps a riding player glued to its top or catches one landing on it.
 */
export class MovingPlatform implements Entity {
  rect: Rect;
  riding = false;
  private t = 0;

  constructor(private readonly from: Vec, private readonly to: Vec, w = 48, private readonly period = 180) {
    this.rect = { x: from.x, y: from.y, w, h: 6 };
  }

  update(scene: BaseScene): void {
    const prevX = this.rect.x;
    const prevTop = this.rect.y;
    this.t = (this.t + 1) % (this.period * 2);
    const u = this.t < this.period ? this.t / this.period : 2 - this.t / this.period;
    this.rect.x = this.from.x + (this.to.x - this.from.x) * u;
    this.rect.y = this.from.y + (this.to.y - this.from.y) * u;
    const dx = this.rect.x - prevX;

    const p = scene.player;
    const b = p.body;
    const xOverlap = b.x < this.rect.x + this.rect.w && b.x + b.w > this.rect.x;
    const bottom = b.y + b.h;
    const settle = (): void => {
      b.x += dx;
      b.y = this.rect.y - b.h;
      b.vy = 0;
      p.contacts = { ...p.contacts, onGround: true };
      this.riding = true;
    };
    if (this.riding && xOverlap && b.vy >= 0) settle();
    else if (b.vy >= 0 && xOverlap && p.prevBottom <= prevTop + 0.01 && bottom >= this.rect.y - 0.01) settle();
    else this.riding = false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawPlank(ctx, this.rect);
  }
}
