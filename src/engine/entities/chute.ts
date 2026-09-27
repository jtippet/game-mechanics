import { DT, TILE } from '../constants';
import type { Vec } from '../geom';
import { center, overlaps } from '../geom';
import type { BaseScene, Entity } from '../scene';

/** Ticks without progress toward the current waypoint before the chute gives up (three quarters of a second). */
const STUCK_TICKS = 45;

/** A fixed path that carries the player from its first cell to its last (slides, waterfalls). */
export class Chute implements Entity {
  active = false;
  readonly waypoints: Vec[];
  private next = 1;
  private savedGravity = 600;
  private bestDist = Infinity;
  private stuck = 0;

  constructor(cells: Vec[], private readonly color: string, private readonly speed = 120) {
    if (cells.length < 2) throw new Error('a chute needs at least two waypoints');
    this.waypoints = cells.map(c => ({ x: c.x + TILE / 2, y: c.y + TILE / 2 }));   // centres
  }

  update(scene: BaseScene): void {
    const p = scene.player;
    const b = p.body;
    if (!this.active) {
      const entry = { x: this.waypoints[0].x - TILE / 2, y: this.waypoints[0].y - TILE / 2, w: TILE, h: TILE };
      if (!overlaps(b, entry)) return;
      this.active = true;
      this.next = 1;
      this.savedGravity = p.gravity;
      p.gravity = 0;
      p.noJump = true;
      this.bestDist = Infinity;
      this.stuck = 0;
    }
    p.controlLock = 2;
    const c = center(b);
    const target = this.waypoints[this.next];
    const dx = target.x - c.x;
    const dy = target.y - c.y;
    const dist = Math.hypot(dx, dy);
    const stepLen = this.speed * DT;
    if (dist <= stepLen) {
      b.x = target.x - b.w / 2;
      b.y = target.y - b.h / 2;
      this.next++;
      this.bestDist = Infinity;
      this.stuck = 0;
      if (this.next >= this.waypoints.length) this.release(p);
      return;
    }
    if (dist < this.bestDist - 0.01) {
      this.bestDist = dist;
      this.stuck = 0;
    } else {
      this.stuck++;
    }
    if (this.stuck >= STUCK_TICKS) {
      this.release(p);
      return;
    }
    b.vx = (dx / dist) * this.speed;
    b.vy = (dy / dist) * this.speed;
  }

  private release(p: BaseScene['player']): void {
    this.active = false;
    p.gravity = this.savedGravity;
    p.noJump = false;
    p.controlLock = 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    this.waypoints.forEach((w, i) => (i === 0 ? ctx.moveTo(w.x, w.y) : ctx.lineTo(w.x, w.y)));
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
