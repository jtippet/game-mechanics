import { TILE } from '../engine/constants';
import type { Body } from '../engine/physics';
import { drawText } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { Respawner, Seeker, type Spot } from './arena';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#4fb3e8';

// A staircase of ledges down to a floor with two pits. The seeker starts on
// the top ledge and walks toward you, off every edge on the way.
const LEVEL = [
  '########################################',
  '#......................................#',
  '#.....####.............................#',
  '#......................................#',
  '#.........####.........................#',
  '#......................................#',
  '#.............####.....................#',
  '#......................................#',
  '#.................####.................#',
  '#......................................#',
  '#..@...................................#',
  '#.............................######...#',
  '########...#################...#########',
  '########################################',
];

const PIT_Y = 12 * TILE;
const PIT_RESPAWN_TICKS = 30;

const SPOTS: Spot[] = [
  { cell: { x: 7 * 16, y: 1 * 16 }, dir: -1, turnAtLedges: false, seek: true },
  { cell: { x: 15 * 16, y: 5 * 16 }, dir: -1, turnAtLedges: true },
  { cell: { x: 20 * 16, y: 11 * 16 }, dir: -1, turnAtLedges: false },
];

export class PatrolScene extends BaseScene {
  private readonly spawner: Respawner;
  touched = 0;
  falls = 0;

  constructor(rows: readonly string[], spots: Spot[] = SPOTS, private readonly pitY = PIT_Y) {
    super(rows, { accent: ACCENT });
    this.spawner = new Respawner(this, spots);
  }

  private fellIn(b: Body): boolean {
    return b.y + b.h > this.pitY + 0.5;
  }

  protected override afterUpdate(): void {
    if (this.spawner.update() && this.spawner.hurtPlayer()) { this.touched++; this.respawn(); }
    if (this.fellIn(this.player.body)) { this.falls++; this.respawn(); }
    for (const e of this.spawner.enemies()) if (this.fellIn(e.body)) this.spawner.kill(e, PIT_RESPAWN_TICKS);
    this.hud = [`touched ${this.touched}   pit falls ${this.falls}`, 'red one hunts you; a pit sends anyone home'];
  }

  protected override drawWorld(ctx: CanvasRenderingContext2D): void {
    for (const e of this.spawner.enemies()) {
      const label = e instanceof Seeker ? 'seek' : e.turnAtLedges ? 'ledge' : 'wall';
      drawText(ctx, label, e.body.x - 4, e.body.y - 10, ACCENT);
    }
  }
}


export const enemyPatrol: Demo = {
  id: 'enemy-patrol',
  title: 'Enemy patrol',
  category: 'Combat',
  blurb: 'Blue enemies patrol: one turns at ledges, one only at walls. The red one walks straight toward you, ledges or not. Fall in a pit and you respawn; so do they.',
  controls: BASE_CONTROLS,
  create: () => new PatrolScene(LEVEL),
};
