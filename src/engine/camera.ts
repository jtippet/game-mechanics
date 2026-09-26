import type { Vec } from './geom';

export class Camera {
  x = 0;
  y = 0;

  constructor(readonly viewW: number, readonly viewH: number, readonly boundsW: number, readonly boundsH: number) {}

  /** Centre on the target immediately (use when a scene is created). */
  snap(tx: number, ty: number): void {
    this.x = tx - this.viewW / 2;
    this.y = ty - this.viewH / 2;
    this.clamp();
  }

  /** Move only when the target leaves a dead zone around the centre. */
  follow(tx: number, ty: number, deadX = 24, deadY = 16): void {
    const cx = this.x + this.viewW / 2;
    const cy = this.y + this.viewH / 2;
    if (tx > cx + deadX) this.x += tx - (cx + deadX);
    else if (tx < cx - deadX) this.x -= (cx - deadX) - tx;
    if (ty > cy + deadY) this.y += ty - (cy + deadY);
    else if (ty < cy - deadY) this.y -= (cy - deadY) - ty;
    this.clamp();
  }

  offset(parallax = 1): Vec {
    return { x: Math.round(this.x * parallax), y: Math.round(this.y * parallax) };
  }

  apply(ctx: CanvasRenderingContext2D, parallax = 1): void {
    const o = this.offset(parallax);
    ctx.translate(-o.x, -o.y);
  }

  private clamp(): void {
    this.x = Math.min(Math.max(0, this.x), Math.max(0, this.boundsW - this.viewW));
    this.y = Math.min(Math.max(0, this.y), Math.max(0, this.boundsH - this.viewH));
  }
}
