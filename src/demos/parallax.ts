import type { Camera } from '../engine/camera';
import { drawBackdrop, PALETTE } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#1c2440';

const LEVEL = [
  '################################################################################',
  '#..............................................................................#',
  '#..............................................................................#',
  '#..............................................................................#',
  '#..............................................................................#',
  '#..............................................................................#',
  '#..............................................................................#',
  '#..........####..............####....................####..........####........#',
  '#..@...........................................................................#',
  '#..............................................................................#',
  '################################################################################',
  '################################################################################',
];

class ParallaxScene extends BaseScene {
  protected override drawBackground(ctx: CanvasRenderingContext2D, camera: Camera): void {
    drawBackdrop(ctx, camera, 0.3, PALETTE.backdropFar, 1);
    drawBackdrop(ctx, camera, 0.6, PALETTE.backdropNear, 2);
  }

  protected override afterUpdate(): void {
    this.hud = [`camera x ${Math.round(this.camera.x)}`, 'far layer scrolls at 0.3x, near at 0.6x, ground at 1x'];
  }
}

export const parallax: Demo = {
  id: 'parallax',
  title: 'Parallax scroll',
  category: 'World',
  blurb: 'Two background layers scroll slower than the ground, which is what makes a flat picture feel deep.',
  controls: BASE_CONTROLS,
  create: () => new ParallaxScene(LEVEL, { accent: ACCENT }),
};
