import { HpPlayer } from '../engine/entities/hp-player';
import { overlaps } from '../engine/geom';
import { HpScene } from '../engine/hp-scene';
import { Respawner, type Spot } from './arena';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#e85a5a';

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..........######..........######......#',
  '#......................................#',
  '#..@...................................#',
  '#.........^^^.............^^^^.........#',
  '########################################',
  '########################################',
];

const SPOTS: Spot[] = [
  { cell: { x: 13 * 16, y: 5 * 16 }, dir: -1, turnAtLedges: true },
  { cell: { x: 29 * 16, y: 5 * 16 }, dir: -1, turnAtLedges: true },
  { cell: { x: 20 * 16, y: 9 * 16 }, dir: -1, turnAtLedges: false },
];

export class HitPointsScene extends HpScene {
  private readonly spawner: Respawner;

  constructor(rows: readonly string[], spots: Spot[] = SPOTS) {
    super(rows, { accent: ACCENT, player: spawn => Object.assign(new HpPlayer(spawn), { jumpSpeed: 290 }) });
    this.spawner = new Respawner(this, spots);
  }

  protected override afterUpdate(): void {
    this.spawner.update();
    if (!this.tickDying()) {
      const b = this.hp.body;
      if (this.hurtByHazard()) this.damage(b.x + b.w / 2 + this.hp.facing);
      for (const e of this.spawner.enemies()) if (overlaps(e.body, b)) this.damage(e.body.x + e.body.w / 2);
    }
    this.hud = [`deaths ${this.deaths}`];
  }
}

export const hitPoints: Demo = {
  id: 'hit-points',
  title: 'Hit points',
  category: 'Combat',
  blurb: 'Three hearts. Spikes and enemies take one each, knock you back and make you briefly untouchable. At zero you respawn.',
  controls: BASE_CONTROLS,
  create: () => new HitPointsScene(LEVEL),
};
