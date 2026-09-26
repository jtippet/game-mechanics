import type { Body } from '../physics';
import { moveBody } from '../physics';
import { drawProjectile } from '../renderer';
import type { BaseScene, Entity } from '../scene';

export class Projectile implements Entity {
  body: Body;
  dead = false;
  life = 90;

  constructor(x: number, y: number, dir: 1 | -1, speed = 260, public color?: string) {
    this.body = { x, y, w: 4, h: 2, vx: dir * speed, vy: 0 };
  }

  update(scene: BaseScene): void {
    const vx = this.body.vx;
    moveBody(scene.level, this.body);
    if ((vx !== 0 && this.body.vx === 0) || --this.life <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawProjectile(ctx, this.body, this.color);
  }
}
