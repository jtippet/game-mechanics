import { DT } from '../engine/constants';
import { overlaps } from '../engine/geom';
import { HpScene } from '../engine/hp-scene';
import type { Input } from '../engine/input';
import type { Body } from '../engine/physics';
import { moveBody } from '../engine/physics';
import type { BaseScene, Entity } from '../engine/scene';
import { ARENA, ARENA_SPOTS, Respawner, type Spot } from './arena';
import { detonate } from './blast';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#8fe388';
const THROW_COOLDOWN = 30;
const RADIUS = 36;
const GRAVITY = 600;
const FUSE_TICKS = 180;

/** A thrown body that bounces once off the floor, settles, and blows after its fuse. Never dies against a wall — walls just bounce it back. */
export class Grenade implements Entity {
  body: Body;
  dead = false;
  resting = false;
  bounces = 1;
  fuse = FUSE_TICKS;

  constructor(x: number, y: number, facing: 1 | -1, private readonly onBoom: (cx: number, cy: number) => void) {
    this.body = { x, y, w: 4, h: 4, vx: facing * 140, vy: -160 };
  }

  update(scene: BaseScene): void {
    if (this.resting) {
      if (--this.fuse <= 0) {
        this.dead = true;
        this.onBoom(this.body.x + this.body.w / 2, this.body.y + this.body.h / 2);
      }
      return;
    }
    this.body.vy += GRAVITY * DT;
    const vxBefore = this.body.vx;
    const vyBefore = this.body.vy;
    const c = moveBody(scene.level, this.body);
    if (c.onWallLeft || c.onWallRight) this.body.vx = -vxBefore * 0.5;
    if (c.onGround) {
      if (this.bounces > 0) {
        this.body.vy = -vyBefore * 0.5;
        this.body.vx *= 0.6;
        this.bounces--;
      } else {
        this.body.vx = 0;
        this.body.vy = 0;
        this.resting = true;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = ACCENT;
    ctx.fillRect(this.body.x, this.body.y, this.body.w, this.body.h);
    if (this.resting) {
      const w = 8 * this.fuse / FUSE_TICKS;
      ctx.fillRect(this.body.x + this.body.w / 2 - w / 2, this.body.y - 4, w, 2);
    }
  }
}

export class GrenadeScene extends HpScene {
  readonly spawner: Respawner;
  private cooldown = 0;
  hits = 0;

  constructor(rows: readonly string[] = ARENA, spots: Spot[] = ARENA_SPOTS) {
    super(rows, { accent: ACCENT });
    this.spawner = new Respawner(this, spots);
  }

  protected override afterUpdate(input: Input): void {
    this.spawner.update();
    if (!this.tickDying()) {
      if (this.cooldown > 0) this.cooldown--;
      const b = this.hp.body;
      if (input.pressed('act') && this.cooldown === 0) {
        this.cooldown = THROW_COOLDOWN;
        const facing = this.hp.facing;
        const x = facing > 0 ? b.x + b.w : b.x - 4;
        this.entities.push(new Grenade(x, b.y + 4, facing, (cx, cy) => { this.hits += detonate(this, this.spawner, cx, cy, RADIUS, ACCENT); }));
      }
      for (const enemy of this.spawner.enemies()) if (overlaps(enemy.body, b)) this.damage(enemy.body.x + enemy.body.w / 2);
    }
    this.hud = [`hits ${this.hits}   deaths ${this.deaths}`, 'the blast hurts them and you'];
  }
}

export const grenades: Demo = {
  id: 'grenades',
  title: 'Grenades',
  category: 'Combat',
  blurb: 'Throw a grenade. It bounces once off the floor, settles, and blows after a short fuse — stay clear.',
  controls: [...BASE_CONTROLS, 'X: throw'],
  touch: [{ action: 'act', label: 'THROW' }],
  create: () => new GrenadeScene(ARENA),
};
