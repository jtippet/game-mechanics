import { TILE } from '../constants';
import type { Vec } from '../geom';
import { overlaps } from '../geom';
import type { Input } from '../input';
import { PALETTE } from '../renderer';
import type { BaseScene, Entity } from '../scene';

export class Lever implements Entity {
  on = false;

  constructor(readonly cell: Vec, private readonly onToggle: (on: boolean) => void) {}

  update(scene: BaseScene, input: Input): void {
    if (!input.pressed('act')) return;
    if (!overlaps(scene.player.body, { x: this.cell.x, y: this.cell.y, w: TILE, h: TILE })) return;
    this.on = !this.on;
    this.onToggle(this.on);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.cell;
    ctx.fillStyle = PALETTE.tileEdge;
    ctx.fillRect(x + 4, y + 12, 8, 4);
    ctx.fillStyle = this.on ? PALETTE.pickup : PALETTE.danger;
    const tip = this.on ? x + 12 : x + 3;
    ctx.fillRect(Math.min(tip, x + 8), y + 6, Math.abs(tip - (x + 8)) + 1, 2);
    ctx.fillRect(tip - 1, y + 4, 3, 3);
  }
}
