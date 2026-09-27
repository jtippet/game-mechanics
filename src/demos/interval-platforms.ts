import { IntervalPlatform } from '../engine/entities/interval-platform';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#c9a36a';
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
  '#......................................#',
  '#####^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^#####',
  '########################################',
];

export class IntervalScene extends BaseScene {
  readonly platforms: IntervalPlatform[] = [];
  falls = 0;

  constructor() {
    super(LEVEL, { accent: ACCENT });
    for (let i = 0; i < 7; i++) this.platforms.push(new IntervalPlatform({ x: 96 + i * 64, y: 144 }, 32, 120, 90, i % 2 === 0 ? 0 : 105));
    this.entities.push(...this.platforms);
  }

  protected override afterUpdate(): void {
    if (this.hurtByHazard()) { this.falls++; this.respawn(); }
    this.hud = [`falls ${this.falls}`, 'planks blink before they go; wait for the next one'];
  }
}

export const intervalPlatforms: Demo = {
  id: 'interval-platforms',
  title: 'Interval platforms',
  category: 'Platforms and surfaces',
  blurb: 'Planks that come and go on a fixed timer. They blink before vanishing, and neighbours never vanish together.',
  controls: BASE_CONTROLS,
  create: () => new IntervalScene(),
};
