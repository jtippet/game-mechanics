import { DT, TILE } from '../constants';
import type { Vec } from '../geom';
import type { Body } from '../physics';
import { isSolidKind, moveBody } from '../physics';
import { drawActor, PALETTE } from '../renderer';
import type { BaseScene, Entity } from '../scene';
import { cellsUnder } from '../tilemap';

/** Walks back and forth; turns at walls, and (optionally) at the edge of a drop. */
export class Patroller implements Entity {
  body: Body;
  dead = false;
  speed = 40;
  gravity = 600;

  constructor(cell: Vec, public dir: 1 | -1 = -1, public turnAtLedges = true) {
    this.body = { x: cell.x + 2, y: cell.y + 2, w: 12, h: 14, vx: 0, vy: 0 };
  }

  update(scene: BaseScene): void {
    this.body.vx = this.dir * this.speed;
    this.body.vy = Math.min(this.body.vy + this.gravity * DT, 260);
    const c = moveBody(scene.level, this.body);
    if ((this.dir < 0 && c.onWallLeft) || (this.dir > 0 && c.onWallRight)) {
      this.dir = -this.dir as 1 | -1;
    } else if (this.turnAtLedges && c.onGround) {
      const aheadX = this.dir > 0 ? this.body.x + this.body.w : this.body.x - 1;
      // Width 0.5, not 1: a full-pixel probe's far edge lands exactly on the
      // tile boundary being tested for, so float drift in body.x (accumulated
      // from repeated +=speed*DT) can tip Math.ceil onto the next tile and
      // report a floor that isn't there yet, letting the patroller overshoot
      // the ledge by a tick before turning.
      const ahead = { x: aheadX, y: this.body.y + this.body.h, w: 0.5, h: 1 };
      const floorAhead = cellsUnder(scene.level, ahead).some(k => isSolidKind(k.kind) || k.kind === 'oneway');
      if (!floorAhead) {
        // The turn happens right at the tile boundary, but body.x got there
        // by ~300 accumulated += speed*DT steps, so it can be a few ULPs
        // past the exact edge. Snap the leading edge back onto the grid line
        // so the patroller never reports as having crossed it.
        const leading = this.dir > 0 ? this.body.x + this.body.w : this.body.x;
        const snapped = Math.round(leading / TILE) * TILE;
        this.body.x += snapped - leading;
        this.dir = -this.dir as 1 | -1;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawActor(ctx, this.body, PALETTE.enemy, this.dir);
  }
}
