import { DT, TILE } from './constants';
import type { Rect } from './geom';
import type { Level, TileKind } from './tilemap';
import { cellsUnder } from './tilemap';

export interface Body extends Rect { vx: number; vy: number }

export interface Contacts { onGround: boolean; onCeiling: boolean; onWallLeft: boolean; onWallRight: boolean }

export const NO_CONTACTS: Contacts = { onGround: false, onCeiling: false, onWallLeft: false, onWallRight: false };

export interface MoveOptions { dropThrough?: boolean }

/** Largest displacement per sub-step; below a tile so nothing can skip a cell. */
const MAX_STEP = 8;
const EPS = 0.01;

const blocks = (k: TileKind): boolean => k === 'solid' || k === 'door' || k === 'climb';

/**
 * Move a body by vx*DT, vy*DT through the level, axis by axis, in sub-steps.
 * Corrects the position out of any blocking tile, zeroes the blocked velocity
 * component, and returns the contacts the body ends the tick with.
 */
export function moveBody(level: Level, body: Body, opts: MoveOptions = {}): Contacts {
  const dx = body.vx * DT;
  const dy = body.vy * DT;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MAX_STEP));
  const sx = dx / n;
  const sy = dy / n;
  for (let i = 0; i < n; i++) {
    if (sx !== 0 && body.vx !== 0) {
      body.x += sx;
      let hit: number | null = null;
      for (const c of cellsUnder(level, body)) {
        if (!blocks(c.kind)) continue;
        hit = hit === null ? c.col : sx > 0 ? Math.min(hit, c.col) : Math.max(hit, c.col);
      }
      if (hit !== null) {
        body.x = sx > 0 ? hit * TILE - body.w : (hit + 1) * TILE;
        body.vx = 0;
      }
    }
    if (sy !== 0 && body.vy !== 0) {
      const prevBottom = body.y + body.h;
      body.y += sy;
      let hit: number | null = null;
      for (const c of cellsUnder(level, body)) {
        const top = c.row * TILE;
        const landOnPlank = sy > 0 && c.kind === 'oneway' && !opts.dropThrough && prevBottom <= top + EPS;
        if (!(blocks(c.kind) || landOnPlank)) continue;
        hit = hit === null ? c.row : sy > 0 ? Math.min(hit, c.row) : Math.max(hit, c.row);
      }
      if (hit !== null) {
        body.y = sy > 0 ? hit * TILE - body.h : (hit + 1) * TILE;
        body.vy = 0;
      }
    }
  }
  return contacts(level, body, opts);
}

/** Probe a hair outside each side of the rect. Works for a resting body too. */
export function contacts(level: Level, r: Rect, opts: MoveOptions = {}): Contacts {
  const bottom = r.y + r.h;
  const below = cellsUnder(level, { x: r.x, y: bottom, w: r.w, h: EPS });
  const onGround = below.some(c =>
    blocks(c.kind) || (c.kind === 'oneway' && !opts.dropThrough && Math.abs(c.row * TILE - bottom) < EPS));
  const onCeiling = cellsUnder(level, { x: r.x, y: r.y - EPS, w: r.w, h: EPS }).some(c => blocks(c.kind));
  const onWallLeft = cellsUnder(level, { x: r.x - EPS, y: r.y, w: EPS, h: r.h }).some(c => blocks(c.kind));
  const onWallRight = cellsUnder(level, { x: r.x + r.w, y: r.y, w: EPS, h: r.h }).some(c => blocks(c.kind));
  return { onGround, onCeiling, onWallLeft, onWallRight };
}
