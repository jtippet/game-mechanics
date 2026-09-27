import { TILE } from '../constants';
import type { Rect, Vec } from '../geom';
import { overlaps } from '../geom';
import { PALETTE } from '../renderer';
import type { BaseScene, Entity } from '../scene';

const WARN_TICKS = 20;
export type JetDir = 'up' | 'down' | 'left' | 'right';

/** A nozzle that cycles on/off, warning before it relights, with a flame rect that reaches one cell past the nozzle. */
export class FlameJet implements Entity {
  readonly rect: Rect;
  active = false;
  warning = false;
  private ticks = 0;

  constructor(readonly cell: Vec, readonly dir: JetDir, private readonly onTicks: number, private readonly offTicks: number, private readonly phase = 0) {
    const { x, y } = cell;
    this.rect = dir === 'up' ? { x, y: y - TILE, w: TILE, h: 2 * TILE }
      : dir === 'down' ? { x, y, w: TILE, h: 2 * TILE }
      : dir === 'left' ? { x: x - TILE, y, w: 2 * TILE, h: TILE }
      : { x, y, w: 2 * TILE, h: TILE };
  }

  hits(r: Rect): boolean {
    return this.active && overlaps(this.rect, r);
  }

  update(scene: BaseScene): void {
    this.ticks = scene.ticks;
    const period = this.onTicks + this.offTicks;
    const t = (scene.ticks + this.phase) % period;
    this.active = t < this.onTicks;
    this.warning = !this.active && t >= period - WARN_TICKS;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.cell;
    ctx.fillStyle = PALETTE.tileEdge;
    ctx.fillRect(x + 4, y + 12, 8, 4);
    if (this.active) {
      ctx.fillStyle = ((this.ticks >> 1) & 1) ? PALETTE.danger : PALETTE.key;
      ctx.fillRect(this.rect.x + 2, this.rect.y + 2, this.rect.w - 4, this.rect.h - 4);
    } else if (this.warning) {
      ctx.fillStyle = PALETTE.muted;
      ctx.fillRect(x + 7, y + 8, 2, 2);
    }
  }
}
