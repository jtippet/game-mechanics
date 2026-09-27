import { FlameJet } from '../engine/entities/flame-jet';
import { HpScene } from '../engine/hp-scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#ff9a3c';
const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..@...................................#',
  '#......F.....F.....F.....F.....F.......#',
  '########################################',
  '########################################',
];

export class FlameScene extends HpScene {
  readonly jets: FlameJet[];
  constructor() {
    super(LEVEL, { accent: ACCENT });
    this.jets = this.level.jets.map((c, i) => new FlameJet(c, 'up', 120, 120, i * 48));
    this.entities.push(...this.jets);
  }
  protected override afterUpdate(): void {
    if (!this.tickDying()) for (const j of this.jets) if (j.hits(this.hp.body)) this.damage(j.cell.x + 8);
    this.hud = [`deaths ${this.deaths}`, 'jets rest, warn, then fire; time your run'];
  }
}

export const flameJets: Demo = {
  id: 'flame-jets',
  title: 'Flame jets',
  category: 'Hazards and obstacles',
  blurb: 'Jets that fire on a timer with a warning puff first. Cross while they rest.',
  controls: BASE_CONTROLS,
  create: () => new FlameScene(),
};
