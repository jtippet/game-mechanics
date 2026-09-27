import { TILE } from './constants';
import type { Rect, Vec } from './geom';
import { overlaps } from './geom';
import { isSolidKind } from './physics';

export type TileKind = 'empty' | 'solid' | 'oneway' | 'spike' | 'climb' | 'door' | 'ice' | 'sand' | 'beltR' | 'beltL' | 'ladder';

export interface PortalMarker { id: 'P' | 'Q'; x: number; y: number }

export interface Level {
  cols: number;
  rows: number;
  tiles: TileKind[];      // row-major
  spawn: Vec;             // pixel top-left of the '@' cell
  pickups: Vec[];         // pixel top-left of each '*' cell
  keys: Vec[];            // pixel top-left of each 'k' cell
  doors: Vec[];           // pixel top-left of each 'd' cell
  levers: Vec[];           // pixel top-left of each 'L' cell
  portals: PortalMarker[]; // pixel top-left of each 'P'/'Q' cell
  slides: Vec[];           // pixel top-left of each '~' cell
  mines: Vec[];            // pixel top-left of each 'M' cell
  jets: Vec[];             // pixel top-left of each 'F' cell
  rocks: Vec[];            // pixel top-left of each 'R' cell
  turrets: Vec[];          // pixel top-left of each 'T' cell
  pixelWidth: number;
  pixelHeight: number;
}

export interface Cell { col: number; row: number; kind: TileKind }

const CHARS: Record<string, TileKind> = {
  '.': 'empty', '#': 'solid', '-': 'oneway', '^': 'spike', '|': 'climb', 'd': 'door',
  'i': 'ice', 's': 'sand', '>': 'beltR', '<': 'beltL', 'H': 'ladder',
  '@': 'empty', '*': 'empty', 'k': 'empty',
  'L': 'empty', 'P': 'empty', 'Q': 'empty', '~': 'empty', 'M': 'empty', 'F': 'empty', 'R': 'empty', 'T': 'empty',
};

export function parseLevel(rows: readonly string[]): Level {
  if (rows.length === 0) throw new Error('level has no rows');
  const cols = rows[0].length;
  const tiles: TileKind[] = [];
  const pickups: Vec[] = [];
  const keys: Vec[] = [];
  const doors: Vec[] = [];
  const levers: Vec[] = [];
  const portals: PortalMarker[] = [];
  const slides: Vec[] = [];
  const mines: Vec[] = [];
  const jets: Vec[] = [];
  const rocks: Vec[] = [];
  const turrets: Vec[] = [];
  let spawn: Vec | undefined;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (row.length !== cols) throw new Error(`level row ${r} has length ${row.length}, expected ${cols}`);
    for (let c = 0; c < cols; c++) {
      const ch = row[c];
      const kind = CHARS[ch];
      if (kind === undefined) throw new Error(`unknown tile '${ch}' at row ${r} col ${c}`);
      tiles.push(kind);
      const px = { x: c * TILE, y: r * TILE };
      if (ch === '@') {
        if (spawn) throw new Error(`second spawn '@' at row ${r} col ${c}`);
        spawn = px;
      } else if (ch === '*') pickups.push(px);
      else if (ch === 'k') keys.push(px);
      else if (ch === 'd') doors.push(px);
      else if (ch === 'L') levers.push(px);
      else if (ch === 'P' || ch === 'Q') portals.push({ id: ch, x: px.x, y: px.y });
      else if (ch === '~') slides.push(px);
      else if (ch === 'M') mines.push(px);
      else if (ch === 'F') jets.push(px);
      else if (ch === 'R') rocks.push(px);
      else if (ch === 'T') turrets.push(px);
    }
  }
  if (!spawn) throw new Error("level has no spawn '@'");
  return {
    cols, rows: rows.length, tiles, spawn, pickups, keys, doors,
    levers, portals, slides, mines, jets, rocks, turrets,
    pixelWidth: cols * TILE, pixelHeight: rows.length * TILE,
  };
}

/** Out of bounds is solid: every level is boxed in without needing a border. */
export function tileAt(level: Level, col: number, row: number): TileKind {
  if (col < 0 || row < 0 || col >= level.cols || row >= level.rows) return 'solid';
  return level.tiles[row * level.cols + col];
}

export function setTile(level: Level, col: number, row: number, kind: TileKind): void {
  if (col < 0 || row < 0 || col >= level.cols || row >= level.rows) return;
  level.tiles[row * level.cols + col] = kind;
}

/** Every cell a rect overlaps. Edges that merely touch do not count. */
export function cellsUnder(level: Level, r: Rect): Cell[] {
  const c0 = Math.floor(r.x / TILE);
  const c1 = Math.ceil((r.x + r.w) / TILE) - 1;
  const r0 = Math.floor(r.y / TILE);
  const r1 = Math.ceil((r.y + r.h) / TILE) - 1;
  const out: Cell[] = [];
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) out.push({ col, row, kind: tileAt(level, col, row) });
  }
  return out;
}

export function touchesKind(level: Level, r: Rect, kind: TileKind): boolean {
  return cellsUnder(level, r).some(c => c.kind === kind);
}

/** Spikes hurt only in the lower half of their cell, so brushing past one sideways is fair. */
export function hazardAt(level: Level, r: Rect): boolean {
  return cellsUnder(level, r).some(c =>
    c.kind === 'spike' && overlaps(r, { x: c.col * TILE, y: c.row * TILE + TILE / 2, w: TILE, h: TILE / 2 }));
}

/** The kind of blocking tile under the body's feet (widest x-overlap wins, first column on a tie), or null in the air. */
export function surfaceUnder(level: Level, body: Rect): TileKind | null {
  const probe = { x: body.x, y: body.y + body.h, w: body.w, h: 0.01 };
  let best: TileKind | null = null;
  let bestOverlap = 0;
  for (const c of cellsUnder(level, probe)) {
    if (!isSolidKind(c.kind)) continue;
    const left = Math.max(body.x, c.col * TILE);
    const right = Math.min(body.x + body.w, (c.col + 1) * TILE);
    const overlap = right - left;
    if (overlap > bestOverlap) { bestOverlap = overlap; best = c.kind; }
  }
  return best;
}
