import type { Rect } from '../geom';
import { drawPlank } from '../renderer';
import type { BaseScene, Entity } from '../scene';

/**
 * A solid rectangle the player can stand on. Subclasses move it (or change
 * `solid`/`visible`) in `move()`; this class keeps a riding player glued to
 * the top and catches one landing from above — exactly the logic that lived
 * in MovingPlatform. A non-solid platform neither carries nor catches.
 */
export abstract class PlatformBody implements Entity {
  rect: Rect;
  solid = true;
  visible = true;
  riding = false;
  dead = false;

  constructor(rect: Rect) { this.rect = rect; }

  protected abstract move(scene: BaseScene): void;

  update(scene: BaseScene): void {
    const prevX = this.rect.x;
    const prevTop = this.rect.y;
    this.move(scene);
    if (!this.solid) { this.riding = false; return; }
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
    if (this.visible) drawPlank(ctx, this.rect);
  }
}
