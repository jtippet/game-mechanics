import { MovingPlatform } from '../engine/entities/moving-platform';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#8a7a55';

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..................................#####',
  '#..@...................................#',
  '#......................................#',
  '######^^^^^^^^^^#######^^^^^^^^^^^^^####',
  '########################################',
];

class MovingPlatformScene extends BaseScene {
  falls = 0;

  constructor(rows: readonly string[]) {
    super(rows, { accent: ACCENT });
    this.entities.push(new MovingPlatform({ x: 96, y: 144 }, { x: 160, y: 144 }, 48, 150));
    this.entities.push(new MovingPlatform({ x: 376, y: 150 }, { x: 500, y: 100 }, 48, 180));
  }

  protected override afterUpdate(): void {
    if (this.hurtByHazard()) { this.falls++; this.respawn(); }
    this.hud = [`falls ${this.falls}`, 'the platform carries you; jump off whenever'];
  }
}

export const movingPlatforms: Demo = {
  id: 'moving-platforms',
  title: 'Moving platforms',
  category: 'Platforms and surfaces',
  blurb: 'Platforms that glide sideways and diagonally, carrying whoever stands on them.',
  controls: BASE_CONTROLS,
  create: () => new MovingPlatformScene(LEVEL),
};
