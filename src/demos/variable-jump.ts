import { TILE } from '../engine/constants';
import { Player } from '../engine/entities/player';
import type { Input } from '../engine/input';
import { drawText } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#ff9de2';

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..................................#####',
  '#.........................#####........#',
  '#..@..............#####................#',
  '########################################',
  '########################################',
];

const FLOOR_Y = 10 * TILE;

export class VariableJumpPlayer extends Player {
  peak = 0;
  lastPeak = 0;
  private cut = false;
  private jumpStartY = 0;

  protected override onJump(): void {
    this.cut = false;
    this.jumpStartY = this.body.y;
    this.peak = 0;
  }

  protected override control(scene: BaseScene, input: Input): void {
    super.control(scene, input);
    if (this.body.vy < 0 && !input.held('jump') && !this.cut) {
      this.body.vy *= 0.4;              // let go early: the rest of the rise is cut short
      this.cut = true;
    }
  }

  protected override integrate(scene: BaseScene): void {
    super.integrate(scene);
    this.peak = Math.max(this.peak, this.jumpStartY - this.body.y);
    if (this.contacts.onGround && this.peak > 0) { this.lastPeak = this.peak; this.peak = 0; }
  }
}

class VariableJumpScene extends BaseScene {
  protected override afterUpdate(): void {
    const p = this.player as VariableJumpPlayer;
    this.hud = [
      'tap for a hop, hold for full height',
      `last jump: ${(p.lastPeak / TILE).toFixed(1)} tiles`,
    ];
  }

  protected override drawWorld(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = ACCENT;
    for (let i = 1; i <= 4; i++) {
      const y = FLOOR_Y - i * TILE;
      ctx.fillRect(TILE, y, 6, 1);
      drawText(ctx, String(i), TILE + 8, y - 4, ACCENT);
    }
  }
}

export const variableJump: Demo = {
  id: 'variable-jump',
  title: 'Variable jump height',
  category: 'Movement',
  blurb: 'Release the button early for a short hop, hold it for the full arc. The ruler shows how high you got.',
  controls: [...BASE_CONTROLS, 'Tap vs hold jump'],
  create: () => new VariableJumpScene(LEVEL, { accent: ACCENT, player: spawn => new VariableJumpPlayer(spawn) }),
};
