import { DT } from '../engine/constants';
import { Patroller } from '../engine/entities/patroller';
import type { Vec } from '../engine/geom';
import { overlaps } from '../engine/geom';
import { isSolidKind, moveBody } from '../engine/physics';
import { drawActor, PALETTE } from '../engine/renderer';
import type { BaseScene } from '../engine/scene';
import { cellsUnder } from '../engine/tilemap';

export const ARENA = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..............#######.................#',
  '#......................................#',
  '#......................................#',
  '#..@...........................######..#',
  '#......................................#',
  '########################################',
  '########################################',
];

export interface Spot { cell: Vec; dir: 1 | -1; turnAtLedges: boolean; seek?: boolean; kind?: 'patrol' | 'seek' | 'creep' }

/** A patroller that naively walks toward the player's x, ledges or not. */
export class Seeker extends Patroller {
  override update(scene: BaseScene): void {
    this.dir = scene.player.body.x < this.body.x ? -1 : 1;
    super.update(scene);
  }

  override draw(ctx: CanvasRenderingContext2D): void {
    drawActor(ctx, this.body, PALETTE.danger, this.dir);
  }
}

/**
 * A patroller that only moves while the player isn't looking at it: frozen
 * whenever the player faces the side it's on, otherwise it walks toward the
 * player (ledges and walls still apply, via Patroller.update).
 */
export class Creeper extends Patroller {
  frozen = false;
  /** True on a tick it stands still at the edge of its ledge (turnAtLedges), as opposed to standing still because it's watched. */
  waiting = false;

  override update(scene: BaseScene): void {
    const p = scene.player;
    const side: 1 | -1 = this.body.x < p.body.x ? -1 : 1;   // where the creeper is, from the player
    this.frozen = p.facing === side;                          // the player is looking at it
    if (this.frozen) {
      this.waiting = false;
      this.body.vx = 0;
      this.body.vy = Math.min(this.body.vy + this.gravity * DT, 260);
      moveBody(scene.level, this.body);
      return;
    }
    this.dir = side === -1 ? 1 : -1;                          // walk toward the player
    // Patroller.update re-decides this.dir at a ledge, but this class resets
    // it right back toward the player every tick above, which would erase
    // that turn and let it step off. Stop here instead, before moving, so
    // there's nothing for next tick's chase to overwrite: it waits at the
    // edge (still able to freeze) rather than turning away from the player.
    if (this.turnAtLedges && this.atLedge(scene)) {
      this.waiting = true;
      this.body.vx = 0;
      this.body.vy = Math.min(this.body.vy + this.gravity * DT, 260);
      moveBody(scene.level, this.body);
      return;
    }
    this.waiting = false;
    super.update(scene);
  }

  /** True when the ground it's standing on doesn't continue in the direction it's about to walk. Mirrors Patroller's own post-move probe, but checked before moving. */
  private atLedge(scene: BaseScene): boolean {
    const floor = (r: { x: number; y: number; w: number; h: number }): boolean =>
      cellsUnder(scene.level, r).some(k => isSolidKind(k.kind) || k.kind === 'oneway');
    const underFoot = { x: this.body.x, y: this.body.y + this.body.h, w: this.body.w, h: 1 };
    if (!floor(underFoot)) return false;                     // already airborne: not a ledge to wait at
    const aheadX = this.dir > 0 ? this.body.x + this.body.w : this.body.x - 1;
    const ahead = { x: aheadX, y: this.body.y + this.body.h, w: 0.5, h: 1 };
    return !floor(ahead);
  }

  override draw(ctx: CanvasRenderingContext2D): void {
    drawActor(ctx, this.body, PALETTE.enemy, this.dir);
    if (this.frozen) {
      // Cover the eye pixels drawActor just painted: a frozen creeper reads
      // as watching back, with no telltale eyes to give its next move away.
      ctx.fillStyle = PALETTE.enemy;
      const ex = this.dir === 1
        ? [this.body.x + this.body.w - 7, this.body.x + this.body.w - 4]
        : [this.body.x + 2, this.body.x + 5];
      ctx.fillRect(ex[0], this.body.y + 4, 2, 2);
      ctx.fillRect(ex[1], this.body.y + 4, 2, 2);
    }
  }
}

export const ARENA_SPOTS: Spot[] = [
  { cell: { x: 18 * 16, y: 4 * 16 }, dir: -1, turnAtLedges: true },
  { cell: { x: 33 * 16, y: 7 * 16 }, dir: -1, turnAtLedges: true },
  { cell: { x: 25 * 16, y: 9 * 16 }, dir: -1, turnAtLedges: false },
];

const RESPAWN_TICKS = 120;
const GRACE_TICKS = 60;

/** Keeps every spot populated: a killed patroller comes back at its spot after a delay. */
export class Respawner {
  private pending: Array<{ spot: Spot; at: number }> = [];
  private readonly alive = new Map<Patroller, Spot>();
  private graceUntil = 0;
  private flickering = false;

  constructor(private readonly scene: BaseScene, private readonly spots: Spot[]) {
    for (const spot of spots) this.spawn(spot);
  }

  private spawn(spot: Spot): void {
    const kind = spot.kind ?? (spot.seek ? 'seek' : 'patrol');
    const p = kind === 'seek' ? new Seeker(spot.cell, spot.dir, false)
      : kind === 'creep' ? new Creeper(spot.cell, spot.dir, spot.turnAtLedges)
      : new Patroller(spot.cell, spot.dir, spot.turnAtLedges);
    this.alive.set(p, spot);
    this.scene.entities.push(p);
  }

  enemies(): Patroller[] {
    return [...this.alive.keys()];
  }

  kill(p: Patroller, delay = RESPAWN_TICKS): void {
    const spot = this.alive.get(p);
    if (!spot) return;
    p.dead = true;
    this.alive.delete(p);
    this.pending.push({ spot, at: this.scene.ticks + delay });
  }

  /**
   * Call once a tick when `update()` reports a touch, to decide whether it
   * actually hurts: right after a respawn the player sits back on the spawn
   * cell, which an idle patroller can be standing on or walk through on the
   * very next tick, so a raw overlap would count another touch every tick
   * it stays there. Returns false while a grace window from a prior hurt is
   * still running; otherwise starts a new one and returns true.
   */
  hurtPlayer(): boolean {
    if (this.scene.ticks < this.graceUntil) return false;
    this.graceUntil = this.scene.ticks + GRACE_TICKS;
    this.flickering = true;
    this.scene.player.flicker = true;
    return true;
  }

  /** Call from afterUpdate. Returns true when the player touches a live enemy. */
  update(): boolean {
    const due = this.pending.filter(p => p.at <= this.scene.ticks);
    this.pending = this.pending.filter(p => p.at > this.scene.ticks);
    for (const d of due) this.spawn(d.spot);
    if (this.flickering && this.scene.ticks >= this.graceUntil) {
      this.flickering = false;
      this.scene.player.flicker = false;
    }
    return this.enemies().some(e => overlaps(e.body, this.scene.player.body));
  }
}
