import type { Rect, Vec } from '../geom';
import { overlaps } from '../geom';
import { drawPickup } from '../renderer';
import type { BaseScene, Entity } from '../scene';

export class Pickup implements Entity {
  rect: Rect;
  dead = false;

  constructor(cell: Vec, private readonly onCollect: () => void, public color?: string) {
    this.rect = { x: cell.x + 4, y: cell.y + 4, w: 8, h: 8 };
  }

  update(scene: BaseScene): void {
    if (overlaps(this.rect, scene.player.body)) {
      this.dead = true;
      this.onCollect();
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawPickup(ctx, this.rect.x + 4, this.rect.y + 4, this.color);
  }
}
