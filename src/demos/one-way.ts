import { Player } from '../engine/entities/player';
import type { Input } from '../engine/input';
import { BaseScene } from '../engine/scene';
import { touchesKind } from '../engine/tilemap';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#8a7a55';
const DROP_TICKS = 10;

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......------------.....------------...#',
  '#......................................#',
  '#..------------.....------------.......#',
  '#......................................#',
  '#......------------.....------------...#',
  '#......................................#',
  '#..@...------------.....------------...#',
  '#......................................#',
  '########################################',
  '########################################',
];

export class OneWayPlayer extends Player {
  private drop = 0;

  protected override control(scene: BaseScene, input: Input): void {
    if (this.drop > 0) this.drop--;
    const b = this.body;
    const onPlank = this.contacts.onGround && touchesKind(scene.level, { x: b.x, y: b.y + b.h, w: b.w, h: 1 }, 'oneway');
    if (onPlank && input.held('down') && input.pressed('jump')) this.drop = DROP_TICKS;
    this.dropThrough = this.drop > 0;
    super.control(scene, input);
  }

  protected override canJump(): boolean {
    return this.drop === 0 && super.canJump();
  }
}

class OneWayScene extends BaseScene {
  protected override afterUpdate(): void {
    this.hud = ['jump up through the planks; ↓ + jump to drop down'];
  }
}

export const oneWay: Demo = {
  id: 'one-way',
  title: 'One-way platforms',
  category: 'World',
  blurb: 'Planks you can jump up through and stand on. Hold down and jump to drop through.',
  controls: [...BASE_CONTROLS, '↓ + jump: drop through'],
  touch: [{ action: 'down', label: 'DROP' }],
  create: () => new OneWayScene(LEVEL, { accent: ACCENT, player: spawn => new OneWayPlayer(spawn) }),
};
