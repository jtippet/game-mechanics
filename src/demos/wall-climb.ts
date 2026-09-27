import { Player } from '../engine/entities/player';
import type { Input } from '../engine/input';
import { moveBody } from '../engine/physics';
import { BaseScene } from '../engine/scene';
import { touchesKind } from '../engine/tilemap';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#b8f0a0';
const SLIDE_SPEED = 25;
const CLIMB_SPEED = 50;
const KICK_SPEED = 130;

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#.............|........................#',
  '#.............|........................#',
  '#.............|.........|..............#',
  '#.............|.........|..............#',
  '#.............|.........|...########...#',
  '#.............|.........|..............#',
  '#.............|.........|..............#',
  '#.............|.........|..............#',
  '#......@......|.........|..............#',
  '#.............|.........|..............#',
  '########################################',
];

export class WallPlayer extends Player {
  clinging = false;
  private climbUp = false;

  protected override control(scene: BaseScene, input: Input): void {
    const b = this.body;
    const leftClimb = this.contacts.onWallLeft && touchesKind(scene.level, { x: b.x - 1, y: b.y, w: 1, h: b.h }, 'climb');
    const rightClimb = this.contacts.onWallRight && touchesKind(scene.level, { x: b.x + b.w, y: b.y, w: 1, h: b.h }, 'climb');
    const side: -1 | 0 | 1 = leftClimb ? -1 : rightClimb ? 1 : 0;
    const pushing = side !== 0 && input.held(side < 0 ? 'left' : 'right');
    const canCling = !this.contacts.onGround && (b.vy >= 0 || this.clinging);
    this.clinging = pushing && canCling;
    this.climbUp = this.clinging && input.held('up');

    if (this.clinging && input.pressed('jump')) {
      b.vx = -side * KICK_SPEED;
      b.vy = -this.jumpSpeed;
      this.facing = side < 0 ? 1 : -1;
      this.controlLock = 10;
      this.clinging = false;
      this.onJump();
      return;
    }
    super.control(scene, input);
  }

  protected override integrate(scene: BaseScene): void {
    if (!this.clinging) { super.integrate(scene); return; }
    this.body.vy = this.climbUp ? -CLIMB_SPEED : SLIDE_SPEED;
    this.prevBottom = this.body.y + this.body.h;
    this.contacts = moveBody(scene.level, this.body);
  }
}

class WallClimbScene extends BaseScene {
  protected override afterUpdate(): void {
    const p = this.player as WallPlayer;
    this.hud = [p.clinging ? 'clinging: up to climb, jump to kick off' : 'push into a hatched wall while airborne'];
  }
}

export const wallClimb: Demo = {
  id: 'wall-climb',
  title: 'Wall climb and wall jump',
  category: 'Movement',
  blurb: 'Push into a hatched wall while airborne to cling and slide slowly; hold up to climb; jump to kick away.',
  controls: [...BASE_CONTROLS, '↑ or W: climb while clinging'],
  touch: [{ action: 'up', label: 'CLIMB' }],
  create: () => new WallClimbScene(LEVEL, { accent: ACCENT, player: spawn => new WallPlayer(spawn) }),
};
