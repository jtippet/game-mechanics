import { TILE } from '../constants';
import type { Vec } from '../geom';
import { PALETTE } from '../renderer';
import type { BaseScene, Entity } from '../scene';

export class Turret implements Entity {
  constructor(readonly cell: Vec, readonly dir: 1 | -1, private readonly every: number, private readonly fire: (x: number, y: number, dir: 1 | -1) => void, private readonly phase = 0) {}
  update(scene: BaseScene): void {
    if ((scene.ticks + this.phase) % this.every === 0) this.fire(this.dir > 0 ? this.cell.x + TILE : this.cell.x, this.cell.y + 6, this.dir);
  }
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = PALETTE.tileEdge;
    ctx.fillRect(this.cell.x + 2, this.cell.y + 2, TILE - 4, TILE - 4);
    ctx.fillStyle = PALETTE.text;
    ctx.fillRect(this.dir > 0 ? this.cell.x + TILE - 4 : this.cell.x, this.cell.y + 5, 4, 3);
  }
}
