import { TILE } from '../engine/constants';
import type { Vec } from '../engine/geom';
import { overlaps } from '../engine/geom';
import { drawFlag } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#8ce86a';
const DEATH_TICKS = 30;

const LEVEL = [
  '############################################################',
  '#..........................................................#',
  '#..........................................................#',
  '#..........................................................#',
  '#..........................................................#',
  '#..........................................................#',
  '#..........................................................#',
  '#..........................................................#',
  '#..@...........*.................*.................*.......#',
  '#.........^^........^^^.........^^^.........^^^............#',
  '############################################################',
  '############################################################',
];

export class CheckpointScene extends BaseScene {
  readonly flags: Vec[];
  active = -1;
  deaths = 0;
  private dying = 0;
  private toast = 0;

  constructor(rows: readonly string[]) {
    super(rows, { accent: ACCENT });
    this.flags = this.level.pickups;
  }

  override respawn(): void {
    this.player.moveTo(this.active >= 0 ? this.flags[this.active] : this.level.spawn);
  }

  protected override afterUpdate(): void {
    const p = this.player;
    this.flags.forEach((f, i) => {
      if (i !== this.active && overlaps(p.body, { x: f.x, y: f.y, w: TILE, h: TILE })) { this.active = i; this.toast = 60; }
    });
    if (this.toast > 0) this.toast--;
    if (this.dying > 0) {
      if (--this.dying === 0) { this.respawn(); p.flicker = false; }
    } else if (this.hurtByHazard()) {
      this.deaths++;
      this.dying = DEATH_TICKS;
      p.flicker = true;
      p.controlLock = DEATH_TICKS;
      p.body.vx = 0;
      p.body.vy = -120;
    }
    this.hud = [
      `checkpoint ${this.active + 1}/${this.flags.length}   deaths ${this.deaths}`,
      this.toast > 0 ? 'checkpoint!' : '',
    ];
  }

  protected override drawWorld(ctx: CanvasRenderingContext2D): void {
    this.flags.forEach((f, i) => drawFlag(ctx, f.x, f.y, i === this.active, ACCENT));
  }
}

export const checkpoint: Demo = {
  id: 'checkpoint',
  title: 'Checkpoint and respawn',
  category: 'Items',
  blurb: 'Touch a flag to raise it. When the spikes get you, you come back at the last raised flag instead of the start.',
  controls: BASE_CONTROLS,
  create: () => new CheckpointScene(LEVEL),
};
