import { CrumblingPlatform } from '../engine/entities/crumbling-platform';
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

export class CrumblingScene extends BaseScene {
  readonly platforms: CrumblingPlatform[] = [];
  falls = 0;

  constructor() {
    super(LEVEL, { accent: ACCENT });
    for (let i = 0; i < 7; i++) this.platforms.push(new CrumblingPlatform({ x: 96 + i * 64, y: 144 }, 32, 'fade'));
    for (let i = 0; i < 6; i++) this.platforms.push(new CrumblingPlatform({ x: 128 + i * 64, y: 112 }, 32, 'fall'));
    this.entities.push(...this.platforms);
  }

  protected override afterUpdate(): void {
    if (this.hurtByHazard()) { this.falls++; this.respawn(); }
    this.hud = [`falls ${this.falls}`, 'lower planks fade after a moment; upper planks drop'];
  }
}

export const crumblingPlatforms: Demo = {
  id: 'crumbling-platforms',
  title: 'Crumbling platforms',
  category: 'Platforms and surfaces',
  blurb: 'Stand on a plank for half a second and it gives way: the lower row fades out, the upper row drops. Both come back.',
  controls: BASE_CONTROLS,
  create: () => new CrumblingScene(),
};
