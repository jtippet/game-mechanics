import { PALETTE } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#7ec8ff';

// One screen, no side walls: the tiles repeat past every edge (Level.wrap).
// The hole in the floor and the hole in the ceiling share columns, so a
// drop through the floor comes back in through the ceiling; the platform
// under the right half of the hole is there to land on.
const LEVEL = [
  '#######......#######',
  '....................',
  '....................',
  '....................',
  '....................',
  '..........####......',
  '....................',
  '....................',
  '...............###..',
  '..@.................',
  '#######......#######',
];

export class WrapScene extends BaseScene {
  wraps = 0;

  constructor() {
    super(LEVEL, { accent: ACCENT, wrap: true });
  }

  protected override afterUpdate(): void {
    // The tiles already wrapped during the move; once the body is entirely past an edge, re-home it on the other side.
    const b = this.player.body;
    const W = this.level.pixelWidth;
    const H = this.level.pixelHeight;
    if (b.x >= W) { b.x -= W; this.wraps++; } else if (b.x + b.w <= 0) { b.x += W; this.wraps++; }
    if (b.y >= H) { b.y -= H; this.wraps++; } else if (b.y + b.h <= 0) { b.y += H; this.wraps++; }
    this.hud = [`wraps ${this.wraps}`, 'walk off either side; drop through the floor'];
  }

  /** One screen: the camera never moves. */
  protected override updateCamera(): void {}

  /** The ceiling is the top row of the screen, so the HUD gets a dark backing to stay legible over it. */
  protected override drawHud(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = PALETTE.bg;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(16, 2, 232, 22);
    ctx.globalAlpha = 1;
    super.drawHud(ctx);
  }

  /** While the body straddles an edge, draw its other half on the far side. */
  protected override drawWorld(ctx: CanvasRenderingContext2D): void {
    const b = this.player.body;
    const W = this.level.pixelWidth;
    const H = this.level.pixelHeight;
    const dx = b.x < 0 ? W : b.x + b.w > W ? -W : 0;
    const dy = b.y < 0 ? H : b.y + b.h > H ? -H : 0;
    const offsets: Array<[number, number]> = [];
    if (dx) offsets.push([dx, 0]);
    if (dy) offsets.push([0, dy]);
    if (dx && dy) offsets.push([dx, dy]);
    for (const [ox, oy] of offsets) {
      ctx.save();
      ctx.translate(ox, oy);
      this.player.draw(ctx);
      ctx.restore();
    }
  }
}

export const wraparound: Demo = {
  id: 'wraparound',
  title: 'Wraparound room',
  category: 'World',
  blurb: 'Leave through one edge and you come back in through the opposite one: left to right, and through the floor to the ceiling.',
  controls: BASE_CONTROLS,
  create: () => new WrapScene(),
};
