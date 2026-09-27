import { Patroller } from '../engine/entities/patroller';
import type { Vec } from '../engine/geom';
import { overlaps } from '../engine/geom';
import { drawActor, PALETTE } from '../engine/renderer';
import type { BaseScene } from '../engine/scene';

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

export interface Spot { cell: Vec; dir: 1 | -1; turnAtLedges: boolean; seek?: boolean }

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
    const p = spot.seek
      ? new Seeker(spot.cell, spot.dir, false)
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
