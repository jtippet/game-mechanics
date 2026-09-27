import { DT } from '../constants';
import type { Rect } from '../geom';
import type { Body } from '../physics';
import { moveBody } from '../physics';
import { drawProjectile } from '../renderer';
import type { BaseScene, Entity } from '../scene';

export interface ProjectileOptions {
  gravity?: number;
  vy0?: number;
  homing?: () => Rect | null;
  turnRate?: number;
  life?: number;
  onImpact?: (x: number, y: number) => void;
}

export class Projectile implements Entity {
  body: Body;
  dead = false;
  life: number;

  constructor(x: number, y: number, dir: 1 | -1, speed = 260, public color?: string, private readonly opts: ProjectileOptions = {}) {
    this.body = { x, y, w: 4, h: 2, vx: dir * speed, vy: opts.vy0 ?? 0 };
    this.life = opts.life ?? 90;
  }

  update(scene: BaseScene): void {
    const o = this.opts;
    if (o.gravity) this.body.vy += o.gravity * DT;
    if (o.homing) {
      const t = o.homing();
      if (t) {
        const speed = Math.hypot(this.body.vx, this.body.vy);
        const want = Math.atan2(t.y + t.h / 2 - (this.body.y + this.body.h / 2), t.x + t.w / 2 - (this.body.x + this.body.w / 2));
        const have = Math.atan2(this.body.vy, this.body.vx);
        let d = want - have;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        const rate = o.turnRate ?? 0.05;
        const a = have + Math.max(-rate, Math.min(rate, d));
        this.body.vx = Math.cos(a) * speed;
        this.body.vy = Math.sin(a) * speed;
      }
    }
    const c = moveBody(scene.level, this.body);
    const hit = c.onGround || c.onCeiling || c.onWallLeft || c.onWallRight;
    if (hit) {
      this.dead = true;
      o.onImpact?.(this.body.x + this.body.w / 2, this.body.y + this.body.h / 2);
      return;
    }
    if (--this.life <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawProjectile(ctx, this.body, this.color);
  }
}
