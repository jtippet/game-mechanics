import type { Camera } from './camera';
import { TILE, VIEW_H, VIEW_W } from './constants';
import type { Rect } from './geom';
import type { Level } from './tilemap';
import { tileAt } from './tilemap';

/** The whole look of the sampler. Nothing outside this file picks a colour except a demo's single accent. */
export const PALETTE = {
  bg: '#0b1020',
  backdropFar: '#141a30',
  backdropNear: '#1c2440',
  tile: '#3a4258',
  tileEdge: '#59627a',
  plank: '#8a7a55',
  spike: '#c9ced8',
  climb: '#2c3448',
  climbHatch: '#4a5570',
  door: '#8a5a2a',
  doorEdge: '#c48a4a',
  player: '#f2b632',
  eye: '#0b1020',
  enemy: '#4fb3e8',
  projectile: '#ffffff',
  pickup: '#8ce86a',
  key: '#f2e26a',
  text: '#e6e9f0',
  muted: '#9aa3b8',
  danger: '#e85a5a',
  dangerEdge: '#ff9a8a',
  poison: '#4fbf5a',
  poisonBubble: '#a9f0a0',
  ice: '#8fd3ff',
  iceSheen: '#d9f2ff',
  sand: '#c9b27a',
  sandDot: '#a8915a',
  belt: '#2a2f3d',
  beltChevron: '#6b7590',
  ladder: '#b08a5a',
} as const;

export function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

export function drawLevel(ctx: CanvasRenderingContext2D, level: Level, camera: Camera, ticks = 0): void {
  const c0 = Math.max(0, Math.floor(camera.x / TILE));
  const c1 = Math.min(level.cols - 1, Math.floor((camera.x + camera.viewW) / TILE));
  const r0 = Math.max(0, Math.floor(camera.y / TILE));
  const r1 = Math.min(level.rows - 1, Math.floor((camera.y + camera.viewH) / TILE));
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      const x = col * TILE;
      const y = row * TILE;
      const kind = tileAt(level, col, row);
      switch (kind) {
        case 'solid':
          ctx.fillStyle = PALETTE.tile;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = PALETTE.tileEdge;
          ctx.fillRect(x, y, TILE, 1);
          break;
        case 'oneway':
          drawPlank(ctx, { x, y: y + 2, w: TILE, h: 3 });
          break;
        case 'spike':
          ctx.fillStyle = PALETTE.spike;
          ctx.beginPath();
          ctx.moveTo(x, y + TILE); ctx.lineTo(x + 4, y + 8); ctx.lineTo(x + 8, y + TILE);
          ctx.moveTo(x + 8, y + TILE); ctx.lineTo(x + 12, y + 8); ctx.lineTo(x + 16, y + TILE);
          ctx.closePath();
          ctx.fill();
          break;
        case 'climb':
          ctx.fillStyle = PALETTE.climb;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = PALETTE.climbHatch;
          ctx.fillRect(x + 3, y, 2, TILE);
          ctx.fillRect(x + 11, y, 2, TILE);
          break;
        case 'door':
          ctx.fillStyle = PALETTE.door;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = PALETTE.doorEdge;
          ctx.fillRect(x + 2, y + 2, TILE - 4, 1);
          ctx.fillRect(x + 2, y + 2, 1, TILE - 4);
          ctx.fillRect(x + 6, y + 7, 3, 4);
          break;
        case 'ice':
          ctx.fillStyle = PALETTE.ice; ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = PALETTE.iceSheen; ctx.fillRect(x + 2, y + 2, 6, 1); ctx.fillRect(x + 9, y + 5, 4, 1);
          break;
        case 'sand':
          ctx.fillStyle = PALETTE.sand; ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = PALETTE.sandDot; ctx.fillRect(x + 3, y + 4, 1, 1); ctx.fillRect(x + 9, y + 7, 1, 1); ctx.fillRect(x + 6, y + 11, 1, 1); ctx.fillRect(x + 12, y + 12, 1, 1);
          break;
        case 'beltR':
        case 'beltL': {
          ctx.fillStyle = PALETTE.belt; ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = PALETTE.beltChevron;
          const dir = kind === 'beltR' ? 1 : -1;
          const phase = ((ticks >> 2) * dir) & 7;           // chevrons crawl in the belt's direction
          for (let i = 0; i < 2; i++) {
            const cx = x + ((i * 8 + phase) & 15);
            ctx.fillRect(cx, y + 6, 2, 1); ctx.fillRect(cx + (dir > 0 ? 2 : -2), y + 7, 2, 2); ctx.fillRect(cx, y + 9, 2, 1);
          }
          break;
        }
        case 'poison': {
          // A pool: the liquid fills the lower three quarters of the cell, and its surface bobs a pixel so it reads as wet.
          const bob = ((ticks >> 4) + col) & 1;
          ctx.fillStyle = PALETTE.poison;
          ctx.fillRect(x, y + 4 + bob, TILE, TILE - 4 - bob);
          ctx.fillStyle = PALETTE.poisonBubble;
          ctx.fillRect(x + ((col * 5 + (ticks >> 3)) & 15), y + 8 + ((ticks >> 5) & 3), 1, 1);
          break;
        }
        case 'ladder':
          ctx.fillStyle = PALETTE.ladder;
          ctx.fillRect(x + 3, y, 2, TILE); ctx.fillRect(x + 11, y, 2, TILE);
          ctx.fillRect(x + 5, y + 4, 6, 1); ctx.fillRect(x + 5, y + 12, 6, 1);
          break;
        default:
          break;
      }
    }
  }
}

export function drawPlank(ctx: CanvasRenderingContext2D, r: Rect): void {
  ctx.fillStyle = PALETTE.plank;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = PALETTE.tileEdge;
  ctx.fillRect(r.x, r.y, r.w, 1);
}

/** The hero and every enemy: a rounded block with two eye pixels on the facing side. */
export function drawActor(ctx: CanvasRenderingContext2D, r: Rect, color: string, facing: 1 | -1): void {
  ctx.fillStyle = color;
  ctx.fillRect(r.x + 1, r.y, r.w - 2, r.h);
  ctx.fillRect(r.x, r.y + 1, r.w, r.h - 2);
  ctx.fillStyle = PALETTE.eye;
  const ex = facing === 1 ? [r.x + r.w - 7, r.x + r.w - 4] : [r.x + 2, r.x + 5];
  ctx.fillRect(ex[0], r.y + 4, 2, 2);
  ctx.fillRect(ex[1], r.y + 4, 2, 2);
}

export function drawProjectile(ctx: CanvasRenderingContext2D, r: Rect, color: string = PALETTE.projectile): void {
  ctx.fillStyle = color;
  ctx.fillRect(r.x, r.y, r.w, r.h);
}

export function drawPickup(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string = PALETTE.pickup): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 4); ctx.lineTo(cx + 4, cy); ctx.lineTo(cx, cy + 4); ctx.lineTo(cx - 4, cy);
  ctx.closePath();
  ctx.fill();
}

export function drawKey(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.fillStyle = PALETTE.key;
  ctx.fillRect(cx - 5, cy - 2, 4, 4);
  ctx.fillRect(cx - 1, cy - 1, 6, 2);
  ctx.fillRect(cx + 3, cy + 1, 1, 2);
}

/** An 8x7 shield outline, top-left at (x, y): the HUD's armor badge and the armor demo's pickup share this. */
export function drawShield(ctx: CanvasRenderingContext2D, x: number, y: number, color: string = PALETTE.text): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 8, 1); ctx.fillRect(x, y, 1, 5); ctx.fillRect(x + 7, y, 1, 5); ctx.fillRect(x + 1, y + 5, 6, 1); ctx.fillRect(x + 3, y + 6, 2, 1);
}

/** A checkpoint flag at a cell's top-left; raised flags fly the colour. */
export function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, raised: boolean, color: string): void {
  ctx.fillStyle = PALETTE.tileEdge;
  ctx.fillRect(x + 6, y + 2, 1, TILE - 2);
  ctx.fillStyle = raised ? color : PALETTE.muted;
  if (raised) ctx.fillRect(x + 7, y + 2, 7, 5);
  else ctx.fillRect(x + 7, y + 9, 4, 3);
}

/** Silkscreen at its native 8 px lands every glyph pixel on the logical grid; the shell waits for it to load before the first frame. */
export const HUD_FONT = '8px Silkscreen, monospace';

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string = PALETTE.text): void {
  ctx.font = HUD_FONT;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function drawBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fraction: number, color: string): void {
  ctx.fillStyle = PALETTE.climb;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, fraction))), h);
}

const mod = (n: number, m: number): number => ((n % m) + m) % m;

/**
 * A deterministic skyline of blocks, drawn in world space at a parallax
 * factor. Seed picks a different skyline per layer.
 */
export function drawBackdrop(ctx: CanvasRenderingContext2D, camera: Camera, parallax: number, color: string, seed: number): void {
  ctx.save();
  camera.apply(ctx, parallax);
  ctx.fillStyle = color;
  const o = camera.offset(parallax);
  const first = Math.floor(o.x / 40) - 1;
  const last = Math.floor((o.x + camera.viewW) / 40) + 1;
  // Vertical parallax: the skyline sits on the viewport bottom when the camera
  // rests at the bottom of its range, and shifts by `parallax` times however
  // far the camera has risen from there (a jump lifts the camera, the far
  // layer barely moves, the near layer moves more).
  const rest = Math.max(0, camera.boundsH - camera.viewH);
  const lift = (rest - camera.y) * parallax;
  for (let i = first; i <= last; i++) {
    const h = 30 + mod(i * 7919 + seed * 104729, 71);
    const w = 24 + mod(i * 31 + seed * 17, 14);
    ctx.fillRect(i * 40, VIEW_H - h + o.y + lift, w, h);
  }
  ctx.restore();
}
