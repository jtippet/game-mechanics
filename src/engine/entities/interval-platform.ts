import type { Vec } from '../geom';
import type { BaseScene } from '../scene';
import { PlatformBody } from './platform-body';

const WARN_TICKS = 30;

/** Solid for onTicks, gone for offTicks, forever; blinks through the last WARN_TICKS of the on phase. */
export class IntervalPlatform extends PlatformBody {
  constructor(cell: Vec, w: number, private readonly onTicks: number, private readonly offTicks: number, private readonly phase = 0) {
    super({ x: cell.x, y: cell.y, w, h: 6 });
  }

  protected override move(scene: BaseScene): void {
    const t = (scene.ticks + this.phase) % (this.onTicks + this.offTicks);
    this.solid = t < this.onTicks;
    const warning = this.solid && t >= this.onTicks - WARN_TICKS;
    this.visible = this.solid && (!warning || ((scene.ticks >> 2) & 1) === 0);
  }
}
