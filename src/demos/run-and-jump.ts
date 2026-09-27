import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..............................####....#',
  '#..........................###.........#',
  '#......................###.............#',
  '#.................###..................#',
  '#..@.........###.......................#',
  '#......................................#',
  '#####.....##############################',
  '########################################',
];

class RunAndJumpScene extends BaseScene {
  protected override afterUpdate(): void {
    const b = this.player.body;
    this.hud = [
      this.player.contacts.onGround ? 'on ground' : 'in the air',
      `speed ${Math.abs(Math.round(b.vx))} px/s`,
    ];
  }
}

export const runAndJump: Demo = {
  id: 'run-and-jump',
  title: 'Run and jump',
  category: 'Movement',
  blurb: 'The baseline: acceleration, friction, gravity and a single jump. Every other demo builds on this.',
  controls: BASE_CONTROLS,
  create: () => new RunAndJumpScene(LEVEL),
};
