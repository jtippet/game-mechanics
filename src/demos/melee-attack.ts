import type { Rect } from '../engine/geom';
import { overlaps } from '../engine/geom';
import type { Input } from '../engine/input';
import { BaseScene } from '../engine/scene';
import { ARENA, ARENA_SPOTS, Respawner, type Spot } from './arena';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#8ce86a';   // green, per Jeff 2026-09-27
const SWING_TICKS = 8;
const SWING_COOLDOWN = 20;
const REACH = 14;

export class MeleeScene extends BaseScene {
  private readonly spawner: Respawner;
  private swing = 0;
  private cooldown = 0;
  hits = 0;
  touched = 0;

  constructor(rows: readonly string[], spots: Spot[] = ARENA_SPOTS) {
    super(rows, { accent: ACCENT });
    this.spawner = new Respawner(this, spots);
  }

  private hitbox(): Rect {
    const b = this.player.body;
    return { x: this.player.facing > 0 ? b.x + b.w : b.x - REACH, y: b.y + 2, w: REACH, h: 10 };
  }

  protected override afterUpdate(input: Input): void {
    if (this.cooldown > 0) this.cooldown--;
    if (input.pressed('act') && this.cooldown === 0) {
      this.swing = SWING_TICKS;
      this.cooldown = SWING_TICKS + SWING_COOLDOWN;
    }
    if (this.swing > 0) {
      this.swing--;
      const box = this.hitbox();
      for (const enemy of this.spawner.enemies()) {
        if (overlaps(box, enemy.body)) { this.spawner.kill(enemy); this.hits++; }
      }
    }
    if (this.spawner.update() && this.spawner.hurtPlayer()) { this.touched++; this.respawn(); }
    this.hud = [`hits ${this.hits}   touched ${this.touched}`];
  }

  protected override drawWorld(ctx: CanvasRenderingContext2D): void {
    if (this.swing === 0) return;
    const box = this.hitbox();
    const shrink = (SWING_TICKS - this.swing) / 2;
    ctx.fillStyle = ACCENT;
    ctx.fillRect(box.x, box.y + shrink, box.w, Math.max(1, box.h - shrink * 2));
  }
}

export const meleeAttack: Demo = {
  id: 'melee-attack',
  title: 'Melee attack',
  category: 'Combat',
  blurb: 'A short swing in front of you: a hit box that exists for a few frames, then a cooldown.',
  controls: [...BASE_CONTROLS, 'X: swing'],
  create: () => new MeleeScene(ARENA),
};
