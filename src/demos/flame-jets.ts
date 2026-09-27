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
  /** Whether each jet was already active as of the previous tick: the ignition frame itself is a grace frame. */
  private readonly hot: boolean[];
  constructor() {
    super(LEVEL, { accent: ACCENT });
    this.jets = this.level.jets.map((c, i) => new FlameJet(c, 'up', 120, 120, i * 48));
    this.entities.push(...this.jets);
    this.hot = this.jets.map(() => false);
  }
  protected override afterUpdate(): void {
    const dying = this.tickDying();
    this.jets.forEach((j, i) => {
      if (!dying && this.hot[i] && j.hits(this.hp.body)) this.damage(j.cell.x + 8);
      this.hot[i] = j.active;
    });
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
