import type { Camera } from '../engine/camera';
import { Player } from '../engine/entities/player';
import { center } from '../engine/geom';
import { drawBackdrop, PALETTE } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#1c2440';
export const PARALLAX_JUMP = 290;

// Four extra rows of sky so the camera has room to rise on a jump and the
// layers can show vertical parallax too. The platforms are three tiles up,
// so the player gets the taller jump (290 rises ~70 px); it also lifts the
// camera out of its dead zone, which the standard 42 px jump never did.
const LEVEL = [
  '################################################################################',
  '#..............................................................................#',
  '#..............................................................................#',
  '#..............................................................................#',
  '#..............................................................................#',
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
  /** No vertical dead zone: the camera tracks every pixel of a jump, so the layers' vertical parallax is visible from the floor and not only from a platform. */
  protected override updateCamera(): void {
    const c = center(this.player.body);
    this.camera.follow(c.x, c.y, 24, 0);
  }

  protected override drawBackground(ctx: CanvasRenderingContext2D, camera: Camera): void {
    drawBackdrop(ctx, camera, 0.35, PALETTE.backdropFar, 1);
    drawBackdrop(ctx, camera, 0.6, PALETTE.backdropNear, 2);
  }

  protected override afterUpdate(): void {
    this.hud = [`camera x ${Math.round(this.camera.x)}`, 'far 0.35x, near 0.6x, ground 1x; jump to see it lift'];
  }
}

export const parallax: Demo = {
  id: 'parallax',
  title: 'Parallax scroll',
  category: 'World',
  blurb: 'Two background layers scroll slower than the ground, which is what makes a flat picture feel deep.',
  controls: BASE_CONTROLS,
  create: () => new ParallaxScene(LEVEL, { accent: ACCENT, player: spawn => Object.assign(new Player(spawn), { jumpSpeed: PARALLAX_JUMP }) }),
};
