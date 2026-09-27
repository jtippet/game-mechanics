import { Player } from '../engine/entities/player';
import type { Input } from '../engine/input';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#9ee6ff';
const GLIDE_FALL = 30;

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#............###.......................#',
  '#......................................#',
  '#........###...........................#',
  '#......................................#',
  '#....###................#######........#',
  '#..@...................................#',
  '################^^^^^^^^################',
  '########################################',
];

export class GlidePlayer extends Player {
  gliding = false;

  protected override control(scene: BaseScene, input: Input): void {
    super.control(scene, input);
    this.gliding = !this.contacts.onGround && this.body.vy > 0 && input.held('jump');
    this.maxFall = this.gliding ? GLIDE_FALL : 260;
  }
}

export class GlideScene extends BaseScene {
  falls = 0;

  constructor() {
    super(LEVEL, { accent: ACCENT, player: spawn => new GlidePlayer(spawn) });
  }

  protected override afterUpdate(): void {
    if (this.hurtByHazard()) { this.falls++; this.respawn(); }
    const p = this.player as GlidePlayer;
    this.hud = [p.gliding ? 'gliding' : 'climb the steps, run off, and HOLD jump to glide'];
  }
}

export const gliding: Demo = {
  id: 'gliding',
  title: 'Gliding',
  category: 'Movement',
  blurb: 'Falling with jump held caps your fall speed, turning a drop into a glide across the spikes.',
  controls: [...BASE_CONTROLS, 'hold jump while falling: glide'],
  create: () => new GlideScene(),
};
