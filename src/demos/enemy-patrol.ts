import { TILE } from '../engine/constants';
import type { Body } from '../engine/physics';
import { tileAt } from '../engine/tilemap';
import { drawText, PALETTE } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { Respawner, Seeker, type Spot } from './arena';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#4fb3e8';

// A staircase of ledges down to a floor with two pits. The seeker starts on
// the top ledge and walks toward you, off every edge on the way. You start
// on a two-tile ledge at the left that no enemy can climb (none of them
// jump); the top ledge sits far enough right that a seeker dropping off it
// (still drifting sideways at walking speed) lands on the floor beside your
// ledge, not on it. The wall-turning enemy is boxed between two one-tile
// walls so it bounces instead of walking into a pit.
export const PATROL_LEVEL = [
  '########################################',
  '#......................................#',
  '#........####..........................#',
  '#......................................#',
  '#............####......................#',
  '#......................................#',
  '#................####..................#',
  '#......................................#',
  '#....................####..............#',
  '#.@....................................#',
  '####...................................#',
  '####.........#...........#......######.#',
  '#########...#################...########',
  '########################################',
];

const PIT_Y = 12 * TILE;
const PIT_RESPAWN_TICKS = 30;

export const PATROL_SPOTS: Spot[] = [
  { cell: { x: 10 * 16, y: 1 * 16 }, dir: -1, turnAtLedges: false, seek: true },
  { cell: { x: 18 * 16, y: 5 * 16 }, dir: -1, turnAtLedges: true },
  { cell: { x: 20 * 16, y: 11 * 16 }, dir: -1, turnAtLedges: false },
];

export class PatrolScene extends BaseScene {
  private readonly spawner: Respawner;
  touched = 0;
  falls = 0;

  constructor(rows: readonly string[], spots: Spot[] = PATROL_SPOTS, private readonly pitY = PIT_Y) {
    super(rows, { accent: ACCENT });
    this.spawner = new Respawner(this, spots);
  }

  private fellIn(b: Body): boolean {
    return b.y + b.h > this.pitY + 0.5;
  }

  protected override afterUpdate(): void {
    if (this.spawner.update() && this.spawner.hurtPlayer()) { this.touched++; this.respawn(); }
    if (this.fellIn(this.player.body)) { this.falls++; this.respawn(); }
    for (const e of this.spawner.enemies()) if (this.fellIn(e.body)) this.spawner.kill(e, PIT_RESPAWN_TICKS);
    this.hud = [`touched ${this.touched}   pit falls ${this.falls}`, 'red one hunts you; red floor sends anyone home'];
  }

  /** The solid cells directly under each gap in the pit row: the pit floors, drawn red. */
  pitFloorCells(): Array<{ col: number; row: number }> {
    const row = this.pitY / TILE;
    const out: Array<{ col: number; row: number }> = [];
    for (let col = 0; col < this.level.cols; col++) {
      if (tileAt(this.level, col, row) === 'empty' && tileAt(this.level, col, row + 1) === 'solid') out.push({ col, row: row + 1 });
    }
    return out;
  }

  protected override drawWorld(ctx: CanvasRenderingContext2D): void {
    for (const c of this.pitFloorCells()) {
      ctx.fillStyle = PALETTE.danger;
      ctx.fillRect(c.col * TILE, c.row * TILE, TILE, TILE);
      ctx.fillStyle = PALETTE.dangerEdge;
      ctx.fillRect(c.col * TILE, c.row * TILE, TILE, 2);
    }
    for (const e of this.spawner.enemies()) {
      const label = e instanceof Seeker ? 'seek' : e.turnAtLedges ? 'ledge' : 'wall';
      drawText(ctx, label, e.body.x - 4, e.body.y - 10, ACCENT);
    }
  }
}


export const enemyPatrol: Demo = {
  id: 'enemy-patrol',
  title: 'Enemy patrol',
  category: 'Combat',
  blurb: 'Blue enemies patrol: one turns at ledges, one bounces between the small walls. The red one walks straight toward you, ledges or not, but it cannot climb onto your start ledge. Fall onto a red pit floor and you respawn; so do they.',
  controls: BASE_CONTROLS,
  create: () => new PatrolScene(PATROL_LEVEL),
};
