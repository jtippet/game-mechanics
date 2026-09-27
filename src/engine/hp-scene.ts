import { HpPlayer } from './entities/hp-player';
import { drawText, PALETTE } from './renderer';
import { BaseScene, type SceneOptions } from './scene';

const DEATH_TICKS = 40;

/** A scene with a hearts player and the shared dying/respawn sequence. Subclasses call tickDying() first in afterUpdate, then damage() from their sources. */
export class HpScene extends BaseScene {
  deaths = 0;
  dying = 0;

  constructor(rows: readonly string[], opts: SceneOptions & { maxHp?: number } = {}) {
    super(rows, { accent: opts.accent ?? PALETTE.danger, player: opts.player ?? (spawn => new HpPlayer(spawn, opts.maxHp ?? 3)) });
  }

  get hp(): HpPlayer { return this.player as HpPlayer; }

  protected damage(fromX: number): boolean {
    if (this.dying > 0) return false;
    const landed = this.hp.hurt(fromX);
    if (this.hp.hp === 0 && this.dying === 0) {
      this.dying = DEATH_TICKS;
      this.deaths++;
      this.hp.controlLock = DEATH_TICKS;
      this.hp.flicker = true;
    }
    return landed;
  }

  protected tickDying(): boolean {
    if (this.dying === 0) return false;
    if (--this.dying === 0) {
      this.respawn();
      this.hp.hp = this.hp.maxHp;
      this.hp.invuln = 0;
      this.hp.armor = 0;
      this.hp.flicker = false;
      this.onRespawn();
    }
    return true;
  }

  protected onRespawn(): void {}

  protected override drawHud(ctx: CanvasRenderingContext2D): void {
    const p = this.hp;
    for (let i = 0; i < p.maxHp; i++) {
      ctx.fillStyle = i < p.hp ? this.accent : PALETTE.climb;
      ctx.fillRect(20 + i * 10, 4, 8, 6);
    }
    if (p.armor > 0) {
      const x = 20 + p.maxHp * 10 + 4;
      ctx.fillStyle = PALETTE.text;
      ctx.fillRect(x, 4, 8, 1); ctx.fillRect(x, 4, 1, 5); ctx.fillRect(x + 7, 4, 1, 5); ctx.fillRect(x + 1, 9, 6, 1); ctx.fillRect(x + 3, 10, 2, 1);
    }
    this.hud.forEach((line, i) => drawText(ctx, line, 20, 14 + i * 10));
  }
}
