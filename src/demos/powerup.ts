import { Pickup } from '../engine/entities/pickup';
import type { Vec } from '../engine/geom';
import { drawBar, PALETTE } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#ff9de2';
export const BOOST_TICKS = 300;
const RETURN_TICKS = 60;
const BOOST_SPEED = 170;

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..@...........*.......................#',
  '#.........#.....#.....#.....#.....#....#',
  '########################################',
  '########################################',
];

export class PowerupScene extends BaseScene {
  boost = 0;
  private returnAt = 0;
  private readonly baseSpeed: number;
  private readonly cell: Vec;

  constructor(rows: readonly string[]) {
    super(rows, { accent: ACCENT });
    this.baseSpeed = this.player.runSpeed;
    this.cell = this.level.pickups[0];
    this.place();
  }

  private place(): void {
    this.entities.push(new Pickup(this.cell, () => {
      this.boost = BOOST_TICKS;
      this.player.runSpeed = BOOST_SPEED;
      this.player.color = ACCENT;
    }, ACCENT));
  }

  protected override afterUpdate(): void {
    if (this.boost > 0 && --this.boost === 0) {
      this.player.runSpeed = this.baseSpeed;
      this.player.color = PALETTE.player;
      this.returnAt = this.ticks + RETURN_TICKS;
    }
    if (this.returnAt > 0 && this.ticks >= this.returnAt) { this.returnAt = 0; this.place(); }
    this.hud = [this.boost > 0 ? `speed boost ${(this.boost / 60).toFixed(1)}s` : 'grab the pickup'];
  }

  protected override drawHud(ctx: CanvasRenderingContext2D): void {
    super.drawHud(ctx);
    drawBar(ctx, 4, 16, 80, 4, this.boost / BOOST_TICKS, ACCENT);
  }
}

export const powerup: Demo = {
  id: 'powerup',
  title: 'Powerup',
  category: 'Items',
  blurb: 'A pickup grants a timed effect, here speed, with a countdown. It returns a moment after the effect ends.',
  controls: BASE_CONTROLS,
  create: () => new PowerupScene(LEVEL),
};
