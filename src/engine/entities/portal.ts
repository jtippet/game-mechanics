import { TILE } from '../constants';
import type { Vec } from '../geom';
import { overlaps } from '../geom';
import type { BaseScene, Entity } from '../scene';

const COOLDOWN = 30;

export class Portal implements Entity {
  teleports = 0;
  private cooldown = 0;
  private armed = true;

  constructor(readonly a: Vec, readonly b: Vec, readonly twoWay: boolean, private readonly color: string) {}

  private pad(c: Vec) { return { x: c.x, y: c.y, w: TILE, h: TILE }; }

  update(scene: BaseScene): void {
    if (this.cooldown > 0) { this.cooldown--; return; }
    const body = scene.player.body;
    const onA = overlaps(body, this.pad(this.a));
    const onB = overlaps(body, this.pad(this.b));
    if (!onA && !onB) this.armed = true;
    if (!this.armed) return;
    if (onA) this.go(scene, this.b);
    else if (this.twoWay && onB) this.go(scene, this.a);
  }

  private go(scene: BaseScene, to: Vec): void {
    const b = scene.player.body;
    b.x = to.x + (TILE - b.w) / 2;
    b.y = to.y + TILE - b.h;
    this.cooldown = COOLDOWN;
    this.teleports++;
    this.armed = false;
    scene.camera.snap(b.x + b.w / 2, b.y + b.h / 2);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    for (const [c, dashed] of [[this.a, false], [this.b, !this.twoWay]] as Array<[Vec, boolean]>) {
      ctx.setLineDash(dashed ? [2, 2] : []);
      ctx.beginPath();
      ctx.arc(c.x + TILE / 2, c.y + TILE / 2, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
}
