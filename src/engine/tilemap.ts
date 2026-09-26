import { TILE } from './constants';
import type { Rect, Vec } from './geom';
import { overlaps } from './geom';

export type TileKind = 'empty' | 'solid' | 'oneway' | 'spike' | 'climb' | 'door';

export interface Level {
  cols: number;
  rows: number;
  tiles: TileKind[];      // row-major
  spawn: Vec;             // pixel top-left of the '@' cell
  pickups: Vec[];         // pixel top-left of each '*' cell
  keys: Vec[];            // pixel top-left of each 'k' cell
  doors: Vec[];           // pixel top-left of each 'd' cell
  pixelWidth: number;
  pixelHeight: number;
}

export interface Cell { col: number; row: number; kind: TileKind }

const CHARS: Record<string, TileKind> = {
  '.': 'empty', '#': 'solid', '-': 'oneway', '^': 'spike', '|': 'climb', 'd': 'door',
  '@': 'empty', '*': 'empty', 'k': 'empty',
};

export function parseLevel(rows: readonly string[]): Level {
  if (rows.length === 0) throw new Error('level has no rows');
  const cols = rows[0].length;
  const tiles: TileKind[] = [];
  const pickups: Vec[] = [];
  const keys: Vec[] = [];
  const doors: Vec[] = [];
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
    }
  }
  if (!spawn) throw new Error("level has no spawn '@'");
  return { cols, rows: rows.length, tiles, spawn, pickups, keys, doors, pixelWidth: cols * TILE, pixelHeight: rows.length * TILE };
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
