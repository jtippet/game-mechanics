import { Player } from '../engine/entities/player';
import type { Rect } from '../engine/geom';
import type { Input } from '../engine/input';
import { moveBody } from '../engine/physics';
import { drawBar } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#ff7a59';
export const DASH_SPEED = 320;
const DASH_TICKS = 12;
const COOLDOWN_TICKS = 30;

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
  '######^^^^^^######^^^^^^######^^^^######',
  '########################################',
];

export class DashPlayer extends Player {
  dashing = 0;
  cooldown = 0;
  private dir: 1 | -1 = 1;
  trail: Rect[] = [];

  protected override control(scene: BaseScene, input: Input): void {
    if (this.cooldown > 0) this.cooldown--;
    if (this.dashing === 0 && this.cooldown === 0 && input.pressed('act')) {
      this.dashing = DASH_TICKS;
      this.cooldown = DASH_TICKS + COOLDOWN_TICKS;
      this.dir = this.facing;
    }
    if (this.dashing > 0) {
      this.body.vx = this.dir * DASH_SPEED;
      return;
    }
    super.control(scene, input);
  }

  protected override integrate(scene: BaseScene): void {
    if (this.dashing > 0) {
      this.dashing--;
      this.body.vy = 0;
      this.trail.push({ ...this.body });
      if (this.trail.length > 6) this.trail.shift();
      this.prevBottom = this.body.y + this.body.h;
      this.contacts = moveBody(scene.level, this.body);
      if (this.dashing === 0) this.body.vx = this.dir * this.runSpeed;
      return;
    }
    if (this.trail.length > 0) this.trail.shift();
    super.integrate(scene);
  }

  override draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = ACCENT;
    this.trail.forEach((r, i) => {
      const inset = (this.trail.length - i);
      ctx.fillRect(r.x + inset, r.y + inset, Math.max(1, r.w - inset * 2), Math.max(1, r.h - inset * 2));
    });
    super.draw(ctx);
  }
}

export class DashScene extends BaseScene {
  falls = 0;

  protected override afterUpdate(): void {
    if (this.hurtByHazard()) { this.falls++; this.respawn(); }
    const p = this.player as DashPlayer;
    this.hud = [p.cooldown === 0 ? 'dash ready' : 'cooling down', `falls ${this.falls}`];
  }

  protected override drawHud(ctx: CanvasRenderingContext2D): void {
    super.drawHud(ctx);
    const p = this.player as DashPlayer;
    drawBar(ctx, 20, 26, 60, 4, 1 - p.cooldown / (DASH_TICKS + COOLDOWN_TICKS), ACCENT);
  }

  override respawn(): void {
    super.respawn();
    const p = this.player as DashPlayer;
    p.dashing = 0;
    p.cooldown = 0;
    p.trail = [];
  }
}

export const dash: Demo = {
  id: 'dash',
  title: 'Dash',
  category: 'Movement',
  blurb: 'A short burst in the facing direction that ignores gravity, with a cooldown. The gaps are too wide to jump.',
  controls: [...BASE_CONTROLS, 'X: dash'],
  touch: [{ action: 'act', label: 'DASH' }],
  create: () => new DashScene(LEVEL, { accent: ACCENT, player: spawn => new DashPlayer(spawn) }),
};
