import { Player } from '../engine/entities/player';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#8ce8ff';

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#.................................######',
  '#......................................#',
  '#......................................#',
  '#..........................####........#',
  '#......................................#',
  '#......................................#',
  '#...................####...............#',
  '#......................................#',
  '#.....@................................#',
  '#...........####..........^^^^^^^^^....#',
  '########################################',
];

interface Puff { x: number; y: number; t: number }

export class DoubleJumpPlayer extends Player {
  airJumps = 1;
  jumpsLeft = 1;
  puffs: Puff[] = [];

  protected override canJump(): boolean {
    return this.contacts.onGround || this.jumpsLeft > 0;
  }

  protected override onJump(): void {
    if (this.contacts.onGround) return;
    this.jumpsLeft--;
    this.puffs.push({ x: this.body.x + this.body.w / 2, y: this.body.y + this.body.h, t: 12 });
  }

  protected override integrate(scene: BaseScene): void {
    super.integrate(scene);
    if (this.contacts.onGround) this.jumpsLeft = this.airJumps;
    for (const p of this.puffs) p.t--;
    this.puffs = this.puffs.filter(p => p.t > 0);
  }

  override draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = ACCENT;
    for (const p of this.puffs) {
      const r = p.t / 2;
      ctx.fillRect(p.x - r, p.y - 1, r * 2, 2);
    }
    super.draw(ctx);
  }
}

class DoubleJumpScene extends BaseScene {
  protected override afterUpdate(): void {
    const p = this.player as DoubleJumpPlayer;
    this.hud = [p.contacts.onGround ? 'on ground' : p.jumpsLeft > 0 ? 'air jump ready' : 'air jump used'];
  }
}

export const doubleJump: Demo = {
  id: 'double-jump',
  title: 'Double jump',
  category: 'Movement',
  blurb: 'A second jump while already in the air, once per flight. The ledges are too far apart for a single jump.',
  controls: [...BASE_CONTROLS, 'Jump again in the air'],
  create: () => new DoubleJumpScene(LEVEL, { accent: ACCENT, player: spawn => new DoubleJumpPlayer(spawn) }),
};
