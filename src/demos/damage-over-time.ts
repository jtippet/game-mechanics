import { HpScene } from '../engine/hp-scene';
import { PALETTE } from '../engine/renderer';
import { touchesKind } from '../engine/tilemap';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = PALETTE.danger;
/** Ticks the poison lasts after the last touch (5 s). */
export const POISON_TICKS = 300;
/** Ticks between hearts lost while poisoned (1 s). */
export const DRAIN_TICKS = 60;
const MAX_HP = 8;

// Two poison pools ('p') one tile deep, so a jump clears the wall. The left
// one is three tiles wide and can be jumped over; the right one cannot, so
// the way across is through it.
const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..@...................................#',
  '########...##############......#########',
  '########ppp##############pppppp#########',
  '########################################',
  '########################################',
];

export class PoisonScene extends HpScene {
  /** Ticks of poison remaining; refreshed to POISON_TICKS on every tick the player touches a pool. */
  poisonLeft = 0;
  private drainTimer = DRAIN_TICKS;
  drains = 0;

  constructor() {
    super(LEVEL, { accent: ACCENT, maxHp: MAX_HP });
  }

  get poisoned(): boolean { return this.poisonLeft > 0; }

  protected override afterUpdate(): void {
    if (this.tickDying()) return;
    if (touchesKind(this.level, this.player.body, 'poison')) this.poisonLeft = POISON_TICKS;
    if (this.poisonLeft > 0) {
      this.poisonLeft--;
      // The drain clock runs from the first touch, not the last: standing in the pool keeps costing a heart a second.
      if (--this.drainTimer === 0) {
        this.drainTimer = DRAIN_TICKS;
        if (this.drain()) this.drains++;
      }
      if (this.poisonLeft === 0) this.drainTimer = DRAIN_TICKS;
    }
    const secs = (this.poisonLeft / 60).toFixed(1);
    this.hud = [this.poisoned ? `poisoned ${secs} s   deaths ${this.deaths}` : `deaths ${this.deaths}`, 'the pool poisons: a heart a second for 5 s after'];
  }

  protected override onRespawn(): void {
    this.poisonLeft = 0;
    this.drainTimer = DRAIN_TICKS;
  }

  protected override drawWorld(ctx: CanvasRenderingContext2D): void {
    if (!this.poisoned) return;
    const b = this.player.body;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = PALETTE.poison;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.globalAlpha = 1;
  }
}

export const damageOverTime: Demo = {
  id: 'damage-over-time',
  title: 'Damage over time',
  category: 'Combat',
  blurb: 'Touch a poison pool and you keep losing a heart a second for the next five seconds, long after you have climbed out.',
  controls: BASE_CONTROLS,
  create: () => new PoisonScene(),
};
