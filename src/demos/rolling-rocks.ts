import { RollingRock } from '../engine/entities/rolling-rock';
import { HpScene } from '../engine/hp-scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#a8a8a8';
const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..@.......#...........................#',
  '#..........#........R..................#',
  '########################################',
  '########################################',
];

export class RockScene extends HpScene {
  readonly rocks: RollingRock[];
  crushes = 0;
  constructor() {
    super(LEVEL, { accent: ACCENT });
    this.rocks = this.level.rocks.map(c => new RollingRock(c, 1, 70));
    this.entities.push(...this.rocks);
  }
  protected override afterUpdate(): void {
    if (!this.tickDying()) for (const r of this.rocks) if (r.crushed && this.damage(r.body.x + 8)) this.crushes++;
    this.hud = [`crushes ${this.crushes}`, 'the rock shoves you; pinned against a wall, you lose a heart'];
  }
}

export const rollingRocks: Demo = {
  id: 'rolling-rocks',
  title: 'Rolling rocks',
  category: 'Hazards and obstacles',
  blurb: 'A rock rolls the corridor and pushes you along. Get pinned against a wall and it costs a heart.',
  controls: BASE_CONTROLS,
  create: () => new RockScene(),
};
