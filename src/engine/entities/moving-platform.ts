import type { Vec } from '../geom';
import { PlatformBody } from './platform-body';

/**
 * Glides between two points and back. `PlatformBody` carries a riding
 * player and catches one landing on it; this class only computes the
 * ping-pong motion.
 */
export class MovingPlatform extends PlatformBody {
  private t = 0;

  constructor(private readonly from: Vec, private readonly to: Vec, w = 48, private readonly period = 180) {
    super({ x: from.x, y: from.y, w, h: 6 });
  }

  protected override move(): void {
    this.t = (this.t + 1) % (this.period * 2);
    const u = this.t < this.period ? this.t / this.period : 2 - this.t / this.period;
    this.rect.x = this.from.x + (this.to.x - this.from.x) * u;
    this.rect.y = this.from.y + (this.to.y - this.from.y) * u;
  }
}
