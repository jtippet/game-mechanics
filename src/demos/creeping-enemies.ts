import { overlaps } from '../engine/geom';
import { HpScene } from '../engine/hp-scene';
import { Respawner, type Spot } from './arena';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#7fe0d0';   // not PALETTE.enemy's blue, so the hearts don't read as another creeper

// A wide flat floor with a two-tile-high ledge in the middle. Every creeper
// only moves while the player's back is turned: face one and it freezes.
const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#.................######...............#',
  '#...................@..................#',
  '########################################',
  '########################################',
];

const SPOTS: Spot[] = [
  { cell: { x: 5 * 16, y: 9 * 16 }, dir: 1, turnAtLedges: true, kind: 'creep' },
  { cell: { x: 34 * 16, y: 9 * 16 }, dir: -1, turnAtLedges: true, kind: 'creep' },
  { cell: { x: 20 * 16, y: 7 * 16 }, dir: -1, turnAtLedges: true, kind: 'creep' },
];

export class CreepScene extends HpScene {
  readonly spawner: Respawner;

  constructor(rows: readonly string[] = LEVEL, spots: Spot[] = SPOTS) {
    super(rows, { accent: ACCENT });
    this.spawner = new Respawner(this, spots);
  }

  protected override afterUpdate(): void {
    this.spawner.update();
    if (!this.tickDying()) {
      const b = this.hp.body;
      for (const e of this.spawner.enemies()) if (overlaps(e.body, b)) this.damage(e.body.x + 6);
    }
    this.hud = [`deaths ${this.deaths}`, 'they only move while your back is turned'];
  }
}

export const creepingEnemies: Demo = {
  id: 'creeping-enemies',
  title: 'Creeping enemies',
  category: 'Combat',
  blurb: "Face one and it freezes; look away and it creeps closer. It only moves while your back is turned.",
  controls: BASE_CONTROLS,
  create: () => new CreepScene(),
};
