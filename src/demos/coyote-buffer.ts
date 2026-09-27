import { Player } from '../engine/entities/player';
import type { Input } from '../engine/input';
import { drawBar } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#ffd166';
export const COYOTE_TICKS = 6;
export const BUFFER_TICKS = 8;

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..@...................................#',
  '####..####..####..####...####..####..###',
  '####^^####^^####^^####^^^####^^####^^###',
  '########################################',
];

export class CoyotePlayer extends Player {
  /** Starts spent: a player that begins in the air has no window until it lands. */
  sinceGround = COYOTE_TICKS + 1;
  buffer = 0;
  coyoteJumps = 0;
  bufferedJumps = 0;

  protected override canJump(): boolean {
    return this.contacts.onGround || (this.sinceGround <= COYOTE_TICKS && this.body.vy >= 0);
  }

  protected override control(scene: BaseScene, input: Input): void {
    if (input.pressed('jump') && !this.canJump()) this.buffer = BUFFER_TICKS;
    super.control(scene, input);
    if (this.buffer > 0 && this.canJump()) {
      this.buffer = 0;
      this.bufferedJumps++;
      this.jump();
    } else if (this.buffer > 0) {
      this.buffer--;
    }
  }

  protected override onJump(): void {
    if (!this.contacts.onGround) this.coyoteJumps++;
    this.sinceGround = COYOTE_TICKS + 1;          // the window is spent
  }

  protected override integrate(scene: BaseScene): void {
    super.integrate(scene);
    if (this.contacts.onGround) this.sinceGround = 0; else this.sinceGround++;
  }
}

class CoyoteScene extends BaseScene {
  deaths = 0;

  protected override afterUpdate(): void {
    const p = this.player as CoyotePlayer;
    if (this.hurtByHazard()) { this.deaths++; this.respawn(); }
    this.hud = [
      `coyote jumps ${p.coyoteJumps}   buffered jumps ${p.bufferedJumps}   falls ${this.deaths}`,
      'jump late off an edge, or early before landing',
    ];
  }

  protected override drawHud(ctx: CanvasRenderingContext2D): void {
    super.drawHud(ctx);
    const p = this.player as CoyotePlayer;
    const coyoteLeft = p.contacts.onGround ? 1 : Math.max(0, COYOTE_TICKS - p.sinceGround) / COYOTE_TICKS;
    drawBar(ctx, 4, 26, 60, 4, coyoteLeft, ACCENT);
    drawBar(ctx, 70, 26, 60, 4, p.buffer / BUFFER_TICKS, ACCENT);
  }
}

export const coyoteBuffer: Demo = {
  id: 'coyote-buffer',
  title: 'Coyote time and jump buffering',
  category: 'Movement',
  blurb: 'Jump still works for a few frames after leaving a ledge, and a jump pressed just before landing fires on landing. The bars show both windows.',
  controls: [...BASE_CONTROLS, 'Jump late, jump early'],
  create: () => new CoyoteScene(LEVEL, { accent: ACCENT, player: spawn => new CoyotePlayer(spawn) }),
};
