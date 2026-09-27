import { DT, TILE } from '../constants';
import type { Vec } from '../geom';
import { overlaps } from '../geom';
import type { Body } from '../physics';
import { isSolidKind, moveBody } from '../physics';
import { PALETTE } from '../renderer';
import type { BaseScene, Entity } from '../scene';
import { cellsUnder } from '../tilemap';

/** A boulder that rolls back and forth, bouncing off walls and shoving the player aside. */
export class RollingRock implements Entity {
  body: Body;
  crushed = false;
  private angle = 0;

  constructor(cell: Vec, public dir: 1 | -1 = 1, private readonly speed = 60) {
    this.body = { x: cell.x, y: cell.y, w: TILE, h: TILE, vx: 0, vy: 0 };
  }

  update(scene: BaseScene): void {
    this.crushed = false;
    this.body.vx = this.dir * this.speed;
    this.body.vy = Math.min(this.body.vy + 600 * DT, 260);
    const c = moveBody(scene.level, this.body);
    if ((this.dir < 0 && c.onWallLeft) || (this.dir > 0 && c.onWallRight)) this.dir = (-this.dir) as 1 | -1;
    this.angle += (this.dir * this.speed * DT) / (TILE / 2);
    const p = scene.player.body;
    if (!overlaps(this.body, p)) return;
    const pushRight = p.x + p.w / 2 >= this.body.x + this.body.w / 2;
    const targetX = pushRight ? this.body.x + this.body.w : this.body.x - p.w;
    const probe = { x: targetX, y: p.y, w: p.w, h: p.h };
    if (cellsUnder(scene.level, probe).some(k => isSolidKind(k.kind))) { this.crushed = true; return; }
    p.x = targetX;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const cx = this.body.x + TILE / 2;
    const cy = this.body.y + TILE / 2;
    ctx.fillStyle = PALETTE.tileEdge;
    ctx.beginPath();
    ctx.arc(cx, cy, TILE / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(Math.round(cx + Math.cos(this.angle) * 4) - 1, Math.round(cy + Math.sin(this.angle) * 4) - 1, 2, 2);
  }
}
