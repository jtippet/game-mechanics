import { Player } from '../engine/entities/player';
import type { Input } from '../engine/input';
import { BaseScene } from '../engine/scene';
import { surfaceUnder } from '../engine/tilemap';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#8fd3ff';
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
  '############iiiiiiiiiiiiiisssssssssssss#',
  '########################################',
];

/** Run tunables follow the surface under the feet. */
export class SurfacePlayer extends Player {
  surface: 'stone' | 'ice' | 'sand' | 'air' = 'stone';

  protected override control(scene: BaseScene, input: Input): void {
    const k = surfaceUnder(scene.level, this.body);
    this.surface = k === null ? 'air' : k === 'ice' ? 'ice' : k === 'sand' ? 'sand' : 'stone';
    if (this.surface === 'ice') { this.friction = 80; this.accel = 300; this.runSpeed = 90; }
    else if (this.surface === 'sand') { this.friction = 1200; this.accel = 400; this.runSpeed = 50; }
    else if (this.surface === 'stone') { this.friction = 800; this.accel = 900; this.runSpeed = 90; }
    super.control(scene, input);
  }
}

class SurfaceScene extends BaseScene {
  protected override afterUpdate(): void {
    const p = this.player as SurfacePlayer;
    this.hud = [`surface: ${p.surface}`, 'stone grips, ice slides, sand drags'];
  }
}

export const iceAndSand: Demo = {
  id: 'ice-and-sand',
  title: 'Ice and sand',
  category: 'Platforms and surfaces',
  blurb: 'The floor changes underfoot: ice barely slows you down once you are moving, sand makes every step a plod.',
  controls: BASE_CONTROLS,
  create: () => new SurfaceScene(LEVEL, { accent: ACCENT, player: spawn => new SurfacePlayer(spawn) }),
};
