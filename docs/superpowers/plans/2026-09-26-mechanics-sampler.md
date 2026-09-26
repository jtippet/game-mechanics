# Mechanics Sampler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A self-contained static SPA with a hand-written 2D engine and eighteen one-mechanic demos behind a hash-routed menu.

**Architecture:** `src/engine/` is a demo-agnostic engine (loop, input, tilemap, physics, camera, renderer, entities, BaseScene), unit-tested under vitest without a browser. `src/demos/` holds one file per mechanic exporting a `Demo` object; `src/demos/index.ts` is the ordered catalogue. `src/shell/` is plain DOM: router, menu, demo view, touch bar. Vite builds with a relative base so `dist/` works at any path on any host.

**Tech Stack:** TypeScript 5.9, Vite 8, Vitest 5, pnpm 11.12.0, Canvas 2D. Zero runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-09-26-mechanics-sampler-design.md`

## Global Constraints

- Zero runtime dependencies; no framework, no React, no `@tippet/ui`, no CDN, no runtime network request.
- Vite `base: './'`; hash routing only (`#/` menu, `#/<id>` demo); no server-side routing.
- Logical viewport 320 × 180, tile 16 px, fixed 60 Hz simulation (`DT = 1/60`), accumulator capped at 0.25 s.
- Velocities are in pixels per second; positions in pixels; `moveBody` multiplies by `DT`.
- Art is procedural only (no image assets); palette and shapes live in `src/engine/renderer.ts` and nowhere else; a demo may use one accent colour.
- Every demo: control hints on screen, `R` resets, `Escape` returns to the menu, level is a string-array literal in the demo's own file.
- Tests are Node-only vitest under `test/`; nothing in tests needs a browser or a real canvas.
- The host (static.tippet.net, `root@10.180.1.108:/srv/static/mechanics/`) appears only in `scripts/deploy.sh` and `README.md`.
- Commit after every task; never `git reset`, `git rebase`, or `--amend`.
- Row lengths in a level literal are checked by `parseLevel`; if a row is off by one, fix the row, never the parser or the test.

## Review Focus

1. Holding a key while the window loses focus: the action must not stay stuck down. Test in Task 4 (`releaseAll` on blur).
2. Space and arrow keys must not scroll the page while a demo is open. Test in Task 4 (`preventDefault` called for mapped keys only).
3. A tab in the background for a minute must not run thousands of catch-up ticks when it resumes. Test in Task 5 (`advance(60)` runs 15 ticks).
4. A dash into a one-tile wall must never tunnel through it. Test in Task 3.
5. A phone narrower than 320 CSS px must render at scale 1, never 0. Test in Task 10 (`scaleFor(300, 600) === 1`).

---

### Task 1: Scaffold, toolchain, CI

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/shell/styles.css`, `.gitignore`, `.forgejo/workflows/ci.yml`, `README.md`, `test/smoke.test.ts`

**Interfaces:**
- Produces: `pnpm dev|build|typecheck|test` scripts every later task runs.

- [ ] **Step 1: package.json**

```json
{
  "name": "mechanics",
  "private": true,
  "version": "0.1.0",
  "description": "A sampler of 2D game mechanics, one demo each, on a hand-written canvas engine",
  "type": "module",
  "packageManager": "pnpm@11.12.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

Then install the dev toolchain (this writes the pinned versions and the lockfile):

```bash
cd ~/code/mechanics
pnpm add -D typescript@5.9 vite@8 vitest@5
```

- [ ] **Step 2: tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "types": ["vite/client"]
  },
  "include": ["src", "test", "vite.config.ts"]
}
```

- [ ] **Step 3: vite.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset URLs: the same dist/ works at /, /mechanics/, or file://.
  base: './',
  build: { target: 'es2022' },
  test: { environment: 'node', include: ['test/**/*.test.ts'] },
});
```

- [ ] **Step 4: index.html, src/main.ts, styles.css, .gitignore**

`index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Mechanics</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

`src/main.ts` (placeholder wiring, replaced in Task 10):

```ts
import './shell/styles.css';

const root = document.getElementById('app');
if (root) root.textContent = 'mechanics: scaffold';
```

`src/shell/styles.css`:

```css
:root { color-scheme: dark; --bg: #0b1020; --panel: #141a30; --edge: #2c3448; --text: #e6e9f0; --muted: #9aa3b8; --accent: #f2b632; }
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.4 system-ui, sans-serif; }
#app { max-width: 1000px; margin: 0 auto; padding: 12px; }
```

`.gitignore`:

```
node_modules
dist
```

- [ ] **Step 5: a smoke test so `pnpm test` has something to run**

`test/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('toolchain', () => {
  it('runs', () => { expect(1 + 1).toBe(2); });
});
```

- [ ] **Step 6: run everything**

Run: `pnpm typecheck && pnpm test && pnpm build && ls dist/index.html`
Expected: typecheck clean, 1 test passes, `dist/index.html` exists and its script tag uses a relative `./assets/...` path (`grep -o 'src="[^"]*"' dist/index.html`).

- [ ] **Step 7: CI workflow**

`.forgejo/workflows/ci.yml`:

```yaml
# mechanics CI (homelab forge). Self-contained: no external actions; checkout is
# a plain git fetch of the pushed sha with the run's own token. One docker job,
# no secrets: there is no private registry dependency. No deploy job — see
# README.md "Deploy".
name: ci
on: [push]

jobs:
  web:
    runs-on: docker
    container:
      image: docker.io/library/node:22-bookworm
    steps:
      - name: checkout
        run: |
          set -e
          mkdir src
          cd src
          git init -q
          git remote add origin "https://x-access-token:${{ secrets.GITHUB_TOKEN }}@code.tippet.net/${{ github.repository }}.git"
          git fetch --depth 1 origin "$GITHUB_SHA"
          git checkout -q FETCH_HEAD

      - name: install, typecheck, test, build
        run: |
          set -e
          cd src
          command -v pnpm >/dev/null 2>&1 || corepack enable
          corepack prepare "$(node -p "require('./package.json').packageManager")" --activate
          pnpm install --frozen-lockfile
          pnpm typecheck
          pnpm test
          pnpm build
          test -f dist/index.html
```

- [ ] **Step 8: README**

`README.md`:

```markdown
# mechanics

A sampler of 2D game mechanics: pick one from the menu, play with it on a
canvas. Not a game. Each demo shows one mechanic on the same flat tile art.

Design: `docs/superpowers/specs/2026-09-26-mechanics-sampler-design.md`.

## Develop

    pnpm install
    pnpm dev          # http://localhost:5173/
    pnpm test         # vitest, Node only
    pnpm typecheck
    pnpm build        # dist/, relative asset URLs, works at any path

## Deploy

`dist/` is plain files; put it on any web server at any path. Hash routing
means no server-side rewrite is needed.

The first host is static.tippet.net, filled by hand:

    scripts/deploy.sh   # pnpm build, then rsync dist/ to /srv/static/mechanics/

That script is the only place the host appears. There is no CI deploy: the
host has no deploy account, and adding one is a substrate change.
```

- [ ] **Step 9: commit**

```bash
git add -A
git commit -m "Scaffold: Vite + TypeScript + vitest, Forge CI, README"
```

---

### Task 2: Geometry and tilemap

**Files:**
- Create: `src/engine/constants.ts`, `src/engine/geom.ts`, `src/engine/tilemap.ts`
- Test: `test/tilemap.test.ts`

**Interfaces:**
- Produces: `TILE`, `DT`, `VIEW_W`, `VIEW_H`; `Vec`, `Rect`, `overlaps(a, b)`, `center(r)`, `approach(v, target, step)`; `TileKind`, `Level`, `parseLevel(rows)`, `tileAt(level, col, row)`, `setTile(level, col, row, kind)`, `cellsUnder(level, rect)`, `hazardAt(level, rect)`, `touchesKind(level, rect, kind)`.

- [ ] **Step 1: constants and geometry**

`src/engine/constants.ts`:

```ts
export const TILE = 16;
export const DT = 1 / 60;
export const VIEW_W = 320;
export const VIEW_H = 180;
```

`src/engine/geom.ts`:

```ts
export interface Vec { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

/** Strict overlap: edges that merely touch do not overlap. */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function center(r: Rect): Vec {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** Move v toward target by at most step. */
export function approach(v: number, target: number, step: number): number {
  return v < target ? Math.min(v + step, target) : Math.max(v - step, target);
}
```

- [ ] **Step 2: failing tilemap tests**

`test/tilemap.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cellsUnder, hazardAt, parseLevel, setTile, tileAt, touchesKind } from '../src/engine/tilemap';

const ROWS = [
  '######',
  '#.@..#',
  '#-^|d#',
  '#*k..#',
  '######',
];

describe('parseLevel', () => {
  it('reads size, tiles, spawn and markers in pixels', () => {
    const l = parseLevel(ROWS);
    expect(l.cols).toBe(6);
    expect(l.rows).toBe(5);
    expect(l.pixelWidth).toBe(96);
    expect(l.pixelHeight).toBe(80);
    expect(l.spawn).toEqual({ x: 32, y: 16 });
    expect(l.pickups).toEqual([{ x: 16, y: 48 }]);
    expect(l.keys).toEqual([{ x: 32, y: 48 }]);
    expect(l.doors).toEqual([{ x: 64, y: 32 }]);
    expect(tileAt(l, 1, 2)).toBe('oneway');
    expect(tileAt(l, 2, 2)).toBe('spike');
    expect(tileAt(l, 3, 2)).toBe('climb');
    expect(tileAt(l, 4, 2)).toBe('door');
    expect(tileAt(l, 2, 1)).toBe('empty');
  });

  it('rejects ragged rows with the row number', () => {
    expect(() => parseLevel(['###', '#@', '###'])).toThrow('row 1 has length 2, expected 3');
  });

  it('rejects unknown characters with row and col', () => {
    expect(() => parseLevel(['###', '#@q', '###'])).toThrow("unknown tile 'q' at row 1 col 2");
  });

  it('requires exactly one spawn', () => {
    expect(() => parseLevel(['###', '#.#', '###'])).toThrow("no spawn");
    expect(() => parseLevel(['####', '#@@#', '####'])).toThrow('second spawn');
  });
});

describe('queries', () => {
  it('treats out-of-bounds as solid', () => {
    const l = parseLevel(ROWS);
    expect(tileAt(l, -1, 0)).toBe('solid');
    expect(tileAt(l, 0, 99)).toBe('solid');
  });

  it('cellsUnder lists overlapped cells and ignores touching edges', () => {
    const l = parseLevel(ROWS);
    expect(cellsUnder(l, { x: 16, y: 16, w: 16, h: 16 }).map(c => [c.col, c.row])).toEqual([[1, 1]]);
    expect(cellsUnder(l, { x: 20, y: 20, w: 12, h: 12 }).map(c => [c.col, c.row])).toEqual([[1, 1], [2, 1], [1, 2], [2, 2]]);
  });

  it('setTile changes a cell and ignores out-of-bounds', () => {
    const l = parseLevel(ROWS);
    setTile(l, 4, 2, 'empty');
    expect(tileAt(l, 4, 2)).toBe('empty');
    setTile(l, 99, 99, 'solid');
  });

  it('hazardAt only counts the lower half of a spike cell', () => {
    const l = parseLevel(ROWS);
    // spike cell is col 2, row 2 → pixels x 32..48, y 32..48; hazard is y 40..48
    expect(hazardAt(l, { x: 34, y: 30, w: 8, h: 8 })).toBe(false);
    expect(hazardAt(l, { x: 34, y: 36, w: 8, h: 8 })).toBe(true);
  });

  it('touchesKind reports any overlapped cell of that kind', () => {
    const l = parseLevel(ROWS);
    expect(touchesKind(l, { x: 47, y: 34, w: 4, h: 4 }, 'climb')).toBe(true);
    expect(touchesKind(l, { x: 20, y: 20, w: 4, h: 4 }, 'climb')).toBe(false);
  });
});
```

Run: `pnpm test`
Expected: FAIL, cannot resolve `../src/engine/tilemap`.

- [ ] **Step 3: tilemap implementation**

`src/engine/tilemap.ts`:

```ts
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
```

- [ ] **Step 4: run tests**

Run: `pnpm test && pnpm typecheck`
Expected: all tilemap tests pass.

- [ ] **Step 5: commit**

```bash
git add src/engine test/tilemap.test.ts
git commit -m "Engine: constants, geometry, ASCII tilemap"
```

---

### Task 3: Physics

**Files:**
- Create: `src/engine/physics.ts`
- Test: `test/physics.test.ts`

**Interfaces:**
- Consumes: `Level`, `cellsUnder`, `TILE`, `DT`, `Rect`.
- Produces: `Body extends Rect { vx, vy }`, `Contacts { onGround, onCeiling, onWallLeft, onWallRight }`, `MoveOptions { dropThrough? }`, `moveBody(level, body, opts?) => Contacts`, `contacts(level, rect, opts?) => Contacts`, `NO_CONTACTS`.

- [ ] **Step 1: failing tests**

`test/physics.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DT } from '../src/engine/constants';
import type { Body } from '../src/engine/physics';
import { contacts, moveBody } from '../src/engine/physics';
import { parseLevel } from '../src/engine/tilemap';

const ROOM = parseLevel([
  '##########',
  '#........#',
  '#........#',
  '#...--...#',
  '#........#',
  '#..@.....#',
  '#........#',
  '##########',
]);

const body = (x: number, y: number, vx = 0, vy = 0): Body => ({ x, y, w: 12, h: 14, vx, vy });

describe('moveBody', () => {
  it('lands on solid ground and reports onGround', () => {
    const b = body(40, 60, 0, 600);
    for (let i = 0; i < 60; i++) moveBody(ROOM, b);
    expect(b.y).toBe(112 - 14);
    expect(b.vy).toBe(0);
    expect(contacts(ROOM, b).onGround).toBe(true);
  });

  it('stops at a wall, zeroes vx and reports the wall side', () => {
    const b = body(40, 98, 300, 0);
    let c = moveBody(ROOM, b);
    for (let i = 0; i < 60; i++) { b.vx = 300; c = moveBody(ROOM, b); }
    expect(b.x).toBe(144 - 12);
    expect(b.vx).toBe(0);
    expect(c.onWallRight).toBe(true);
    expect(c.onWallLeft).toBe(false);
  });

  it('bonks a ceiling', () => {
    const b = body(40, 20, 0, -400);
    const c = moveBody(ROOM, b);
    expect(b.y).toBe(16);
    expect(b.vy).toBe(0);
    expect(c.onCeiling).toBe(true);
  });

  it('passes up through a one-way platform and lands on it from above', () => {
    const up = body(66, 70, 0, -300);          // under the planks at row 3 (y 48..64)
    for (let i = 0; i < 10; i++) { up.vy = -300; moveBody(ROOM, up); }
    expect(up.y).toBe(20);                     // rose straight through the planks
    expect(up.vy).toBe(-300);
    const down = body(66, 30, 0, 300);
    for (let i = 0; i < 30; i++) { down.vy = 300; moveBody(ROOM, down); }
    expect(down.y).toBe(48 - 14);
    expect(contacts(ROOM, down).onGround).toBe(true);
  });

  it('drops through a one-way platform when asked', () => {
    const b = body(66, 34, 0, 300);
    for (let i = 0; i < 30; i++) { b.vy = 300; moveBody(ROOM, b, { dropThrough: true }); }
    expect(b.y).toBe(112 - 14);
  });

  it('never tunnels through a one-tile wall at high speed', () => {
    const b = body(20, 98, 6000, 0);            // 100 px per tick, wall is 16 px thick
    moveBody(ROOM, b);
    expect(b.x).toBe(144 - 12);
  });

  it('reports a wall it is resting against with zero velocity', () => {
    const c = contacts(ROOM, body(16, 98));
    expect(c.onWallLeft).toBe(true);
    expect(c.onWallRight).toBe(false);
  });

  it('displacement is velocity times DT', () => {
    const b = body(40, 40, 60, 0);
    moveBody(ROOM, b);
    expect(b.x).toBeCloseTo(40 + 60 * DT, 9);
  });
});
```

Run: `pnpm test physics`
Expected: FAIL, cannot resolve `../src/engine/physics`.

- [ ] **Step 2: implementation**

`src/engine/physics.ts`:

```ts
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
```

- [ ] **Step 3: run tests**

Run: `pnpm test physics && pnpm typecheck`
Expected: all pass. If the one-way "lands from above" case fails, check `prevBottom` is taken before `body.y += sy` inside the sub-step, not once per tick.

- [ ] **Step 4: commit**

```bash
git add src/engine/physics.ts test/physics.test.ts
git commit -m "Engine: AABB body vs tilemap with sub-steps and contact probes"
```

---

### Task 4: Input

**Files:**
- Create: `src/engine/input.ts`
- Test: `test/input.test.ts`

**Interfaces:**
- Produces: `type Action = 'left'|'right'|'up'|'down'|'jump'|'act'|'reset'`, `ACTIONS`, `class Input { press(a); release(a); releaseAll(); tick(); held(a); pressed(a); attachKeyboard(target) => detach }`, `keyToAction(code) => Action | null`.

- [ ] **Step 1: failing tests**

`test/input.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Input, keyToAction } from '../src/engine/input';

describe('Input edges', () => {
  it('pressed is true for exactly one tick; held stays true', () => {
    const i = new Input();
    i.press('jump');
    i.tick();
    expect(i.pressed('jump')).toBe(true);
    expect(i.held('jump')).toBe(true);
    i.tick();
    expect(i.pressed('jump')).toBe(false);
    expect(i.held('jump')).toBe(true);
    i.release('jump');
    i.tick();
    expect(i.held('jump')).toBe(false);
  });

  it('a press and release inside one tick still counts as one pressed tick', () => {
    const i = new Input();
    i.press('act');
    i.release('act');
    i.tick();
    expect(i.pressed('act')).toBe(true);
    expect(i.held('act')).toBe(true);
    i.tick();
    expect(i.pressed('act')).toBe(false);
    expect(i.held('act')).toBe(false);
  });

  it('a repeated press while held does not re-fire pressed', () => {
    const i = new Input();
    i.press('left');
    i.tick();
    i.press('left');
    i.tick();
    expect(i.pressed('left')).toBe(false);
  });

  it('releaseAll clears everything', () => {
    const i = new Input();
    i.press('left');
    i.press('jump');
    i.tick();
    i.releaseAll();
    i.tick();
    expect(i.held('left')).toBe(false);
    expect(i.held('jump')).toBe(false);
  });
});

describe('keyboard mapping', () => {
  it('maps arrows, WASD, Z/Space, X, R', () => {
    expect(keyToAction('ArrowLeft')).toBe('left');
    expect(keyToAction('KeyA')).toBe('left');
    expect(keyToAction('ArrowRight')).toBe('right');
    expect(keyToAction('KeyD')).toBe('right');
    expect(keyToAction('ArrowUp')).toBe('up');
    expect(keyToAction('KeyW')).toBe('up');
    expect(keyToAction('ArrowDown')).toBe('down');
    expect(keyToAction('KeyS')).toBe('down');
    expect(keyToAction('KeyZ')).toBe('jump');
    expect(keyToAction('Space')).toBe('jump');
    expect(keyToAction('KeyX')).toBe('act');
    expect(keyToAction('KeyR')).toBe('reset');
    expect(keyToAction('KeyQ')).toBe(null);
  });

  it('attachKeyboard presses on keydown, releases on keyup and blur, prevents default only for mapped keys', () => {
    type Handler = (e: { code: string; repeat?: boolean; preventDefault: () => void }) => void;
    const handlers: Record<string, Handler[]> = {};
    const target = {
      addEventListener: (type: string, h: Handler) => { (handlers[type] ??= []).push(h); },
      removeEventListener: (type: string, h: Handler) => { handlers[type] = (handlers[type] ?? []).filter(x => x !== h); },
    };
    const i = new Input();
    const detach = i.attachKeyboard(target as unknown as EventTarget);
    let prevented = 0;
    const fire = (type: string, code: string, repeat = false) =>
      (handlers[type] ?? []).forEach(h => h({ code, repeat, preventDefault: () => { prevented++; } }));

    fire('keydown', 'Space');
    i.tick();
    expect(i.held('jump')).toBe(true);
    expect(prevented).toBe(1);
    fire('keydown', 'KeyQ');
    expect(prevented).toBe(1);
    fire('keyup', 'Space');
    i.tick();
    expect(i.held('jump')).toBe(false);

    fire('keydown', 'ArrowLeft');
    (handlers.blur ?? []).forEach(h => h({ code: '', preventDefault: () => {} }));
    i.tick();
    expect(i.held('left')).toBe(false);

    detach();
    fire('keydown', 'KeyZ');
    i.tick();
    expect(i.held('jump')).toBe(false);
  });
});
```

Run: `pnpm test input`
Expected: FAIL, cannot resolve `../src/engine/input`.

- [ ] **Step 2: implementation**

`src/engine/input.ts`:

```ts
export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'act' | 'reset';
export const ACTIONS: readonly Action[] = ['left', 'right', 'up', 'down', 'jump', 'act', 'reset'];

const KEYS: Record<string, Action> = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyZ: 'jump', Space: 'jump',
  KeyX: 'act',
  KeyR: 'reset',
};

export function keyToAction(code: string): Action | null {
  return KEYS[code] ?? null;
}

/**
 * Abstract input with per-tick edges. Physical sources (keyboard, touch
 * buttons) call press/release at any time; the loop calls tick() once per
 * simulation step, after which held()/pressed() describe that step.
 * A press that went down and up between two ticks still reads as one
 * pressed+held tick, so short taps are never lost.
 */
export class Input {
  private down = new Set<Action>();      // physically down right now
  private latched = new Set<Action>();   // went down since the last tick
  private heldNow = new Set<Action>();
  private pressedNow = new Set<Action>();

  press(a: Action): void {
    if (this.down.has(a)) return;        // key repeat
    this.down.add(a);
    this.latched.add(a);
  }

  release(a: Action): void {
    this.down.delete(a);
  }

  releaseAll(): void {
    this.down.clear();
  }

  tick(): void {
    this.pressedNow = new Set(this.latched);
    this.heldNow = new Set([...this.down, ...this.latched]);
    this.latched.clear();
  }

  held(a: Action): boolean { return this.heldNow.has(a); }
  pressed(a: Action): boolean { return this.pressedNow.has(a); }

  /** Wire keydown/keyup/blur on a window-like target. Returns a detach function. */
  attachKeyboard(target: EventTarget): () => void {
    const onDown = (e: Event): void => {
      const k = e as KeyboardEvent;
      const a = keyToAction(k.code);
      if (!a) return;
      k.preventDefault();
      if (k.repeat) return;
      this.press(a);
    };
    const onUp = (e: Event): void => {
      const a = keyToAction((e as KeyboardEvent).code);
      if (a) this.release(a);
    };
    const onBlur = (): void => this.releaseAll();
    target.addEventListener('keydown', onDown);
    target.addEventListener('keyup', onUp);
    target.addEventListener('blur', onBlur);
    return () => {
      target.removeEventListener('keydown', onDown);
      target.removeEventListener('keyup', onUp);
      target.removeEventListener('blur', onBlur);
    };
  }
}
```

- [ ] **Step 3: run tests**

Run: `pnpm test input && pnpm typecheck`
Expected: all pass.

- [ ] **Step 4: commit**

```bash
git add src/engine/input.ts test/input.test.ts
git commit -m "Engine: abstract input with per-tick edges and keyboard mapping"
```

---

### Task 5: Camera and loop

**Files:**
- Create: `src/engine/camera.ts`, `src/engine/loop.ts`
- Test: `test/camera.test.ts`, `test/loop.test.ts`

**Interfaces:**
- Produces: `class Camera { x, y, viewW, viewH, boundsW, boundsH; snap(tx, ty); follow(tx, ty); offset(parallax?) => Vec; apply(ctx, parallax?) }`, `class Loop { constructor(tick, render); advance(elapsedSeconds) => number; start(); stop() }`.

- [ ] **Step 1: failing tests**

`test/camera.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Camera } from '../src/engine/camera';

describe('Camera', () => {
  it('snap centres on the target and clamps to bounds', () => {
    const c = new Camera(320, 180, 640, 192);
    c.snap(320, 96);
    expect(c.x).toBe(160);
    expect(c.y).toBe(6);
    c.snap(0, 0);
    expect(c.x).toBe(0);
    expect(c.y).toBe(0);
    c.snap(10000, 10000);
    expect(c.x).toBe(320);
    expect(c.y).toBe(12);
  });

  it('a level smaller than the view pins to 0', () => {
    const c = new Camera(320, 180, 160, 96);
    c.snap(500, 500);
    expect(c.x).toBe(0);
    expect(c.y).toBe(0);
  });

  it('follow only moves once the target leaves the dead zone', () => {
    const c = new Camera(320, 180, 2000, 2000);
    c.snap(500, 500);
    const x0 = c.x;
    c.follow(510, 500);
    expect(c.x).toBe(x0);
    c.follow(600, 500);
    expect(c.x).toBe(x0 + 100 - 24);
  });

  it('offset scales by parallax and rounds', () => {
    const c = new Camera(320, 180, 2000, 2000);
    c.snap(500, 500);
    expect(c.offset(1)).toEqual({ x: 340, y: 410 });
    expect(c.offset(0.5)).toEqual({ x: 170, y: 205 });
    expect(c.offset(0)).toEqual({ x: 0, y: 0 });
  });
});
```

`test/loop.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DT } from '../src/engine/constants';
import { Loop } from '../src/engine/loop';

describe('Loop.advance', () => {
  it('runs one tick per DT and carries the remainder', () => {
    let ticks = 0;
    const l = new Loop(() => { ticks++; }, () => {});
    expect(l.advance(DT * 2.5)).toBe(2);
    expect(l.advance(DT * 0.6)).toBe(1);
    expect(ticks).toBe(3);
  });

  it('caps a long pause at a quarter second of catch-up', () => {
    let ticks = 0;
    const l = new Loop(() => { ticks++; }, () => {});
    const n = l.advance(60);
    expect(n).toBeGreaterThanOrEqual(14);      // 0.25 s is 15 ticks, give or take float rounding
    expect(n).toBeLessThanOrEqual(15);
    expect(ticks).toBe(n);
  });
});
```

Run: `pnpm test camera loop`
Expected: FAIL, modules missing.

- [ ] **Step 2: implementation**

`src/engine/camera.ts`:

```ts
import type { Vec } from './geom';

export class Camera {
  x = 0;
  y = 0;

  constructor(readonly viewW: number, readonly viewH: number, readonly boundsW: number, readonly boundsH: number) {}

  /** Centre on the target immediately (use when a scene is created). */
  snap(tx: number, ty: number): void {
    this.x = tx - this.viewW / 2;
    this.y = ty - this.viewH / 2;
    this.clamp();
  }

  /** Move only when the target leaves a dead zone around the centre. */
  follow(tx: number, ty: number, deadX = 24, deadY = 16): void {
    const cx = this.x + this.viewW / 2;
    const cy = this.y + this.viewH / 2;
    if (tx > cx + deadX) this.x += tx - (cx + deadX);
    else if (tx < cx - deadX) this.x -= (cx - deadX) - tx;
    if (ty > cy + deadY) this.y += ty - (cy + deadY);
    else if (ty < cy - deadY) this.y -= (cy - deadY) - ty;
    this.clamp();
  }

  offset(parallax = 1): Vec {
    return { x: Math.round(this.x * parallax), y: Math.round(this.y * parallax) };
  }

  apply(ctx: CanvasRenderingContext2D, parallax = 1): void {
    const o = this.offset(parallax);
    ctx.translate(-o.x, -o.y);
  }

  private clamp(): void {
    this.x = Math.min(Math.max(0, this.x), Math.max(0, this.boundsW - this.viewW));
    this.y = Math.min(Math.max(0, this.y), Math.max(0, this.boundsH - this.viewH));
  }
}
```

`src/engine/loop.ts`:

```ts
import { DT } from './constants';

const MAX_CATCHUP = 0.25;

/** Fixed-step simulation, one render per animation frame. */
export class Loop {
  private acc = 0;
  private last = 0;
  private raf = 0;
  running = false;

  constructor(private readonly tick: () => void, private readonly render: () => void) {}

  /** Advance by elapsed seconds; returns how many ticks ran. Pure, for tests. */
  advance(elapsed: number): number {
    this.acc += Math.min(elapsed, MAX_CATCHUP);
    let n = 0;
    while (this.acc >= DT) {
      this.tick();
      this.acc -= DT;
      n++;
    }
    return n;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const frame = (now: number): void => {
      if (!this.running) return;
      this.advance((now - this.last) / 1000);
      this.last = now;
      this.render();
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
```

- [ ] **Step 3: run tests**

Run: `pnpm test camera loop && pnpm typecheck`
Expected: all pass.

- [ ] **Step 4: commit**

```bash
git add src/engine/camera.ts src/engine/loop.ts test/camera.test.ts test/loop.test.ts
git commit -m "Engine: dead-zone camera with parallax offsets; fixed-step loop"
```

---

### Task 6: Renderer

**Files:**
- Create: `src/engine/renderer.ts`
- Test: `test/stub-context.ts` (a helper, used by Task 9's smoke test), `test/renderer.test.ts`

**Interfaces:**
- Consumes: `Level`, `Camera`, `Rect`, `TILE`, `VIEW_W`, `VIEW_H`.
- Produces: `PALETTE`, `setupCanvas(canvas)`, `drawLevel(ctx, level, camera)`, `drawActor(ctx, rect, color, facing)`, `drawProjectile(ctx, rect, color?)`, `drawPickup(ctx, cx, cy, color?)`, `drawKey(ctx, cx, cy)`, `drawFlag(ctx, x, y, raised, color)`, `drawPlank(ctx, rect)`, `drawText(ctx, text, x, y, color?)`, `drawBackdrop(ctx, camera, parallax, color, seed)`, `drawBar(ctx, x, y, w, h, fraction, color)`.

- [ ] **Step 1: the stub context helper and a failing test**

`test/stub-context.ts`:

```ts
/** A CanvasRenderingContext2D stand-in that records method names and accepts any property. */
export function stubContext(): CanvasRenderingContext2D & { calls: string[] } {
  const calls: string[] = [];
  const target: Record<string, unknown> = { calls, measureText: (s: string) => ({ width: s.length * 5 }) };
  return new Proxy(target, {
    get: (t, k) => (typeof k === 'string' && k in t) ? t[k] : (...args: unknown[]) => { calls.push(String(k)); void args; },
    set: (t, k, v) => { t[String(k)] = v; return true; },
  }) as unknown as CanvasRenderingContext2D & { calls: string[] };
}
```

`test/renderer.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Camera } from '../src/engine/camera';
import { drawActor, drawBackdrop, drawLevel, drawText, PALETTE } from '../src/engine/renderer';
import { parseLevel } from '../src/engine/tilemap';
import { stubContext } from './stub-context';

describe('renderer', () => {
  it('draws every tile kind without throwing and only touches visible cells', () => {
    const level = parseLevel(['#-^|d.', '#..@..']);
    const ctx = stubContext();
    const cam = new Camera(320, 180, level.pixelWidth, level.pixelHeight);
    drawLevel(ctx, level, cam);
    expect(ctx.calls.filter(c => c === 'fillRect').length).toBeGreaterThan(4);
  });

  it('draws an actor facing either way and text and a backdrop', () => {
    const ctx = stubContext();
    drawActor(ctx, { x: 10, y: 10, w: 12, h: 14 }, PALETTE.player, 1);
    drawActor(ctx, { x: 10, y: 10, w: 12, h: 14 }, PALETTE.enemy, -1);
    drawText(ctx, 'hello', 4, 4);
    drawBackdrop(ctx, new Camera(320, 180, 2000, 200), 0.5, PALETTE.backdropFar, 3);
    expect(ctx.calls).toContain('fillText');
    expect(ctx.calls).toContain('translate');
  });
});
```

Run: `pnpm test renderer`
Expected: FAIL, module missing.

- [ ] **Step 2: implementation**

`src/engine/renderer.ts`:

```ts
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
} as const;

export function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

export function drawLevel(ctx: CanvasRenderingContext2D, level: Level, camera: Camera): void {
  const c0 = Math.max(0, Math.floor(camera.x / TILE));
  const c1 = Math.min(level.cols - 1, Math.floor((camera.x + camera.viewW) / TILE));
  const r0 = Math.max(0, Math.floor(camera.y / TILE));
  const r1 = Math.min(level.rows - 1, Math.floor((camera.y + camera.viewH) / TILE));
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      const x = col * TILE;
      const y = row * TILE;
      switch (tileAt(level, col, row)) {
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

/** A checkpoint flag at a cell's top-left; raised flags fly the colour. */
export function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, raised: boolean, color: string): void {
  ctx.fillStyle = PALETTE.tileEdge;
  ctx.fillRect(x + 6, y + 2, 1, TILE - 2);
  ctx.fillStyle = raised ? color : PALETTE.muted;
  if (raised) ctx.fillRect(x + 7, y + 2, 7, 5);
  else ctx.fillRect(x + 7, y + 9, 4, 3);
}

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string = PALETTE.text): void {
  ctx.font = '8px monospace';
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
  for (let i = first; i <= last; i++) {
    const h = 30 + ((i * 7919 + seed * 104729) % 71);
    const w = 24 + ((i * 31 + seed * 17) % 14);
    ctx.fillRect(i * 40, VIEW_H - h + o.y, w, h);
  }
  ctx.restore();
}
```

- [ ] **Step 3: run tests**

Run: `pnpm test renderer && pnpm typecheck`
Expected: pass. (The `% 71` on a negative `i` gives a negative remainder; heights still stay positive because 30 − 70 < 0 would only happen for large negative i, which `first ≥ −1` prevents. Leave it.)

- [ ] **Step 4: commit**

```bash
git add src/engine/renderer.ts test/stub-context.ts test/renderer.test.ts
git commit -m "Engine: procedural renderer and the one palette"
```

---

### Task 7: Player and BaseScene

**Files:**
- Create: `src/engine/entities/player.ts`, `src/engine/scene.ts`
- Test: `test/scene.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `interface Scene { readonly camera: Camera; update(input: Input): void; draw(ctx, camera): void }`
  - `interface Entity { dead?: boolean; update(scene: BaseScene, input: Input): void; draw(ctx): void }`
  - `class BaseScene implements Scene { level; player; camera; entities: Entity[]; hud: string[]; ticks; accent; constructor(rows, opts?: { accent?, player?: (spawn: Vec) => Player }); respawn(); protected beforeUpdate(input); protected afterUpdate(input); protected drawBackground(ctx, camera); protected drawWorld(ctx); protected drawHud(ctx) }`
  - `class Player implements Entity { body: Body; facing: 1|-1; contacts: Contacts; prevBottom; ticks; flicker; dropThrough; color; runSpeed; accel; airAccel; friction; gravity; jumpSpeed; maxFall; controlLock; update(scene, input); jump(); moveTo(cell: Vec); protected control(scene, input); protected canJump(); protected onJump(); protected integrate(scene) }`

- [ ] **Step 1: failing tests**

`test/scene.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';
import { stubContext } from './stub-context';

const ROWS = [
  '############',
  '#..........#',
  '#..........#',
  '#..........#',
  '#..@.......#',
  '############',
];

function run(scene: BaseScene, input: Input, ticks: number, held: Array<'left' | 'right' | 'jump'> = []): void {
  for (let i = 0; i < ticks; i++) {
    for (const a of ['left', 'right', 'jump'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
    input.tick();
    scene.update(input);
  }
}

describe('BaseScene + Player', () => {
  it('spawns the player standing on the spawn cell floor', () => {
    const s = new BaseScene(ROWS);
    expect(s.player.body.x).toBe(48 + 2);
    expect(s.player.body.y).toBe(64 + 16 - 14);
    const input = new Input();
    run(s, input, 5);
    expect(s.player.contacts.onGround).toBe(true);
  });

  it('runs right, stops at the wall, and jumps only from the ground', () => {
    const s = new BaseScene(ROWS);
    const input = new Input();
    run(s, input, 120, ['right']);
    expect(s.player.body.x).toBe(176 - 12);
    expect(s.player.facing).toBe(1);
    run(s, input, 1, ['jump']);
    expect(s.player.body.vy).toBeLessThan(0);
    const yTop = s.player.body.y;
    run(s, input, 1);
    run(s, input, 1, ['jump']);          // a second press in the air does nothing
    expect(s.player.body.vy).toBeLessThan(0);
    run(s, input, 60);
    expect(s.player.body.y).toBeGreaterThan(yTop);
    expect(s.player.contacts.onGround).toBe(true);
  });

  it('draws with a stub context and shows hud lines', () => {
    const s = new BaseScene(ROWS);
    s.hud = ['hello'];
    const ctx = stubContext();
    s.draw(ctx, s.camera);
    expect(ctx.calls).toContain('fillText');
  });

  it('respawn returns the player to spawn with zero velocity', () => {
    const s = new BaseScene(ROWS);
    const input = new Input();
    run(s, input, 30, ['right']);
    s.respawn();
    expect(s.player.body.x).toBe(50);
    expect(s.player.body.vx).toBe(0);
  });
});
```

Run: `pnpm test scene`
Expected: FAIL, modules missing.

- [ ] **Step 2: Player**

`src/engine/entities/player.ts`:

```ts
import { DT, TILE } from '../constants';
import type { Vec } from '../geom';
import { approach } from '../geom';
import type { Input } from '../input';
import type { Body, Contacts } from '../physics';
import { moveBody, NO_CONTACTS } from '../physics';
import { drawActor, PALETTE } from '../renderer';
import type { BaseScene, Entity } from '../scene';

export const PLAYER_W = 12;
export const PLAYER_H = 14;

/**
 * The hero. Run, jump, gravity, facing. Demos subclass and override the
 * protected hooks; nothing here knows about any one mechanic.
 */
export class Player implements Entity {
  body: Body;
  facing: 1 | -1 = 1;
  contacts: Contacts = NO_CONTACTS;
  prevBottom = 0;
  ticks = 0;
  flicker = false;
  dropThrough = false;
  /** Ticks during which horizontal input is ignored (wall kicks, knockback). */
  controlLock = 0;
  color: string = PALETTE.player;

  runSpeed = 90;
  accel = 900;
  airAccel = 500;
  friction = 800;
  gravity = 600;
  jumpSpeed = 230;
  maxFall = 260;

  constructor(spawn: Vec) {
    this.body = { x: 0, y: 0, w: PLAYER_W, h: PLAYER_H, vx: 0, vy: 0 };
    this.moveTo(spawn);
  }

  /** Stand on the floor of a cell, centred. */
  moveTo(cell: Vec): void {
    this.body.x = cell.x + (TILE - this.body.w) / 2;
    this.body.y = cell.y + TILE - this.body.h;
    this.body.vx = 0;
    this.body.vy = 0;
  }

  update(scene: BaseScene, input: Input): void {
    this.ticks++;
    this.control(scene, input);
    this.integrate(scene);
  }

  protected control(_scene: BaseScene, input: Input): void {
    if (this.controlLock > 0) this.controlLock--;
    const dir = this.controlLock > 0 ? 0 : (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
    const onGround = this.contacts.onGround;
    if (dir !== 0) {
      this.body.vx = approach(this.body.vx, dir * this.runSpeed, (onGround ? this.accel : this.airAccel) * DT);
      this.facing = dir;
    } else if (this.controlLock === 0) {
      this.body.vx = approach(this.body.vx, 0, (onGround ? this.friction : this.airAccel * 0.5) * DT);
    }
    if (input.pressed('jump') && this.canJump()) this.jump();
  }

  protected canJump(): boolean {
    return this.contacts.onGround;
  }

  jump(): void {
    this.body.vy = -this.jumpSpeed;
    this.onJump();
  }

  protected onJump(): void {}

  protected integrate(scene: BaseScene): void {
    this.body.vy = Math.min(this.body.vy + this.gravity * DT, this.maxFall);
    this.prevBottom = this.body.y + this.body.h;
    this.contacts = moveBody(scene.level, this.body, { dropThrough: this.dropThrough });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.flicker && ((this.ticks >> 2) & 1)) return;
    drawActor(ctx, this.body, this.color, this.facing);
  }
}
```

- [ ] **Step 3: Scene and BaseScene**

`src/engine/scene.ts`:

```ts
import { Camera } from './camera';
import { VIEW_H, VIEW_W } from './constants';
import { center, type Rect, type Vec } from './geom';
import type { Input } from './input';
import { drawLevel, drawText, PALETTE } from './renderer';
import type { Level } from './tilemap';
import { hazardAt, parseLevel } from './tilemap';
import { Player } from './entities/player';

export interface Scene {
  readonly camera: Camera;
  update(input: Input): void;
  draw(ctx: CanvasRenderingContext2D, camera: Camera): void;
}

export interface Entity {
  dead?: boolean;
  update(scene: BaseScene, input: Input): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export interface SceneOptions {
  accent?: string;
  player?: (spawn: Vec) => Player;
}

/** Level + player + entities + camera + HUD. Demos extend this and override hooks. */
export class BaseScene implements Scene {
  readonly level: Level;
  readonly player: Player;
  readonly camera: Camera;
  entities: Entity[] = [];
  hud: string[] = [];
  ticks = 0;
  accent: string;

  constructor(rows: readonly string[], opts: SceneOptions = {}) {
    this.level = parseLevel(rows);
    this.accent = opts.accent ?? PALETTE.player;
    this.player = opts.player ? opts.player(this.level.spawn) : new Player(this.level.spawn);
    this.camera = new Camera(VIEW_W, VIEW_H, this.level.pixelWidth, this.level.pixelHeight);
    const c = center(this.player.body);
    this.camera.snap(c.x, c.y);
  }

  update(input: Input): void {
    this.ticks++;
    this.beforeUpdate(input);
    this.player.update(this, input);
    for (const e of this.entities.slice()) e.update(this, input);
    this.entities = this.entities.filter(e => !e.dead);
    this.afterUpdate(input);
    const c = center(this.player.body);
    this.camera.follow(c.x, c.y);
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.drawBackground(ctx, camera);
    ctx.save();
    camera.apply(ctx);
    drawLevel(ctx, this.level, camera);
    for (const e of this.entities) e.draw(ctx);
    this.player.draw(ctx);
    this.drawWorld(ctx);
    ctx.restore();
    this.drawHud(ctx);
  }

  respawn(): void {
    this.player.moveTo(this.level.spawn);
  }

  hurtByHazard(r: Rect = this.player.body): boolean {
    return hazardAt(this.level, r);
  }

  protected beforeUpdate(_input: Input): void {}
  protected afterUpdate(_input: Input): void {}
  protected drawBackground(_ctx: CanvasRenderingContext2D, _camera: Camera): void {}
  /** Drawn in world space after the player. */
  protected drawWorld(_ctx: CanvasRenderingContext2D): void {}
  protected drawHud(ctx: CanvasRenderingContext2D): void {
    this.hud.forEach((line, i) => drawText(ctx, line, 4, 4 + i * 10));
  }
}
```

- [ ] **Step 4: run tests**

Run: `pnpm test scene && pnpm typecheck`
Expected: pass. Note `player.ts` imports `BaseScene` as a type only, so the circular import is erased at runtime.

- [ ] **Step 5: commit**

```bash
git add src/engine/scene.ts src/engine/entities/player.ts test/scene.test.ts
git commit -m "Engine: Player with overridable hooks; BaseScene wiring level, entities, camera, HUD"
```

---

### Task 8: Shared entities

**Files:**
- Create: `src/engine/entities/patroller.ts`, `src/engine/entities/projectile.ts`, `src/engine/entities/pickup.ts`, `src/engine/entities/moving-platform.ts`
- Test: `test/entities.test.ts`

**Interfaces:**
- Consumes: `Entity`, `BaseScene`, `Player`, `moveBody`, `cellsUnder`, renderer draw functions.
- Produces:
  - `class Patroller { body: Body; dir: 1|-1; speed; turnAtLedges; dead; constructor(cell: Vec, dir?: 1|-1, turnAtLedges?: boolean) }`
  - `class Projectile { body: Body; dead; life; constructor(x, y, dir: 1|-1, speed?) }`
  - `class Pickup { rect: Rect; dead; constructor(cell: Vec, onCollect: () => void, color?: string) }`
  - `class MovingPlatform { rect: Rect; riding; constructor(from: Vec, to: Vec, w?, periodTicks?) }`

- [ ] **Step 1: failing tests**

`test/entities.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MovingPlatform } from '../src/engine/entities/moving-platform';
import { Patroller } from '../src/engine/entities/patroller';
import { Pickup } from '../src/engine/entities/pickup';
import { Projectile } from '../src/engine/entities/projectile';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';

const ROWS = [
  '##########',
  '#........#',
  '#........#',
  '#..####..#',
  '#........#',
  '#.@......#',
  '##########',
];

const idle = (scene: BaseScene, ticks: number): void => {
  const input = new Input();
  for (let i = 0; i < ticks; i++) { input.tick(); scene.update(input); }
};

describe('Patroller', () => {
  it('turns at ledges and stays on its platform', () => {
    const s = new BaseScene(ROWS);
    const p = new Patroller({ x: 64, y: 32 }, 1, true);
    s.entities.push(p);
    let minX = Infinity, maxX = -Infinity;
    for (let i = 0; i < 300; i++) { idle(s, 1); minX = Math.min(minX, p.body.x); maxX = Math.max(maxX, p.body.x); }
    expect(p.body.y).toBe(48 - 14);
    expect(minX).toBeGreaterThanOrEqual(48);
    expect(maxX + p.body.w).toBeLessThanOrEqual(112);
    expect(maxX - minX).toBeGreaterThan(20);
  });

  it('a wall-only patroller walks the whole floor and turns at walls', () => {
    const s = new BaseScene(ROWS);
    const p = new Patroller({ x: 32, y: 80 }, 1, false);
    s.entities.push(p);
    let minX = Infinity, maxX = -Infinity;
    for (let i = 0; i < 600; i++) { idle(s, 1); minX = Math.min(minX, p.body.x); maxX = Math.max(maxX, p.body.x); }
    expect(minX).toBe(16);
    expect(maxX).toBe(144 - 12);
  });
});

describe('Projectile', () => {
  it('flies right and dies at the wall', () => {
    const s = new BaseScene(ROWS);
    const b = new Projectile(40, 90, 1);
    s.entities.push(b);
    idle(s, 60);
    expect(b.dead).toBe(true);
    expect(s.entities).not.toContain(b);
  });

  it('expires after its life even in open space', () => {
    const s = new BaseScene(['####', '#@.#', '####']);
    const b = new Projectile(20, 20, 1, 0);
    s.entities.push(b);
    idle(s, 91);
    expect(b.dead).toBe(true);
  });
});

describe('Pickup', () => {
  it('is collected when the player overlaps it', () => {
    const s = new BaseScene(ROWS);
    let got = 0;
    const p = new Pickup({ x: 32, y: 80 }, () => { got++; });
    s.entities.push(p);
    idle(s, 2);
    expect(got).toBe(1);
    expect(p.dead).toBe(true);
  });
});

describe('MovingPlatform', () => {
  it('carries a player standing on it', () => {
    const s = new BaseScene(ROWS);
    const plat = new MovingPlatform({ x: 40, y: 80 }, { x: 100, y: 80 }, 48, 60);
    s.entities.push(plat);
    s.player.moveTo({ x: 48, y: 64 });      // stands on the platform's top edge (y 80)
    idle(s, 30);
    expect(plat.riding).toBe(true);
    expect(s.player.body.x).toBeCloseTo(50 + 30, 0);
    expect(s.player.body.y).toBe(66);
    expect(s.player.contacts.onGround).toBe(true);
  });

  it('lets the player jump off', () => {
    const s = new BaseScene(ROWS);
    const plat = new MovingPlatform({ x: 40, y: 80 }, { x: 100, y: 80 }, 48, 60);
    s.entities.push(plat);
    s.player.moveTo({ x: 48, y: 64 });
    idle(s, 5);
    const input = new Input();
    input.press('jump');
    input.tick();
    s.update(input);
    expect(s.player.body.vy).toBeLessThan(0);
    expect(plat.riding).toBe(false);
  });
});
```

Run: `pnpm test entities`
Expected: FAIL, modules missing.

- [ ] **Step 2: implementations**

`src/engine/entities/patroller.ts`:

```ts
import { DT } from '../constants';
import type { Vec } from '../geom';
import type { Body } from '../physics';
import { moveBody } from '../physics';
import { drawActor, PALETTE } from '../renderer';
import type { BaseScene, Entity } from '../scene';
import { cellsUnder } from '../tilemap';

/** Walks back and forth; turns at walls, and (optionally) at the edge of a drop. */
export class Patroller implements Entity {
  body: Body;
  dead = false;
  speed = 40;
  gravity = 600;

  constructor(cell: Vec, public dir: 1 | -1 = -1, public turnAtLedges = true) {
    this.body = { x: cell.x + 2, y: cell.y + 2, w: 12, h: 14, vx: 0, vy: 0 };
  }

  update(scene: BaseScene): void {
    this.body.vx = this.dir * this.speed;
    this.body.vy = Math.min(this.body.vy + this.gravity * DT, 260);
    const c = moveBody(scene.level, this.body);
    if ((this.dir < 0 && c.onWallLeft) || (this.dir > 0 && c.onWallRight)) {
      this.dir = -this.dir;
    } else if (this.turnAtLedges && c.onGround) {
      const aheadX = this.dir > 0 ? this.body.x + this.body.w : this.body.x - 1;
      const ahead = { x: aheadX, y: this.body.y + this.body.h, w: 1, h: 1 };
      const floorAhead = cellsUnder(scene.level, ahead).some(k => k.kind === 'solid' || k.kind === 'oneway' || k.kind === 'door' || k.kind === 'climb');
      if (!floorAhead) this.dir = -this.dir;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawActor(ctx, this.body, PALETTE.enemy, this.dir);
  }
}
```

`src/engine/entities/projectile.ts`:

```ts
import type { Body } from '../physics';
import { moveBody } from '../physics';
import { drawProjectile } from '../renderer';
import type { BaseScene, Entity } from '../scene';

export class Projectile implements Entity {
  body: Body;
  dead = false;
  life = 90;

  constructor(x: number, y: number, dir: 1 | -1, speed = 260, public color?: string) {
    this.body = { x, y, w: 4, h: 2, vx: dir * speed, vy: 0 };
  }

  update(scene: BaseScene): void {
    const vx = this.body.vx;
    moveBody(scene.level, this.body);
    if ((vx !== 0 && this.body.vx === 0) || --this.life <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawProjectile(ctx, this.body, this.color);
  }
}
```

`src/engine/entities/pickup.ts`:

```ts
import type { Rect, Vec } from '../geom';
import { overlaps } from '../geom';
import { drawPickup } from '../renderer';
import type { BaseScene, Entity } from '../scene';

export class Pickup implements Entity {
  rect: Rect;
  dead = false;

  constructor(cell: Vec, private readonly onCollect: () => void, public color?: string) {
    this.rect = { x: cell.x + 4, y: cell.y + 4, w: 8, h: 8 };
  }

  update(scene: BaseScene): void {
    if (overlaps(this.rect, scene.player.body)) {
      this.dead = true;
      this.onCollect();
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawPickup(ctx, this.rect.x + 4, this.rect.y + 4, this.color);
  }
}
```

`src/engine/entities/moving-platform.ts`:

```ts
import type { Rect, Vec } from '../geom';
import { drawPlank } from '../renderer';
import type { BaseScene, Entity } from '../scene';

/**
 * Glides between two points and back. The player is not a tile, so this
 * entity does the carrying itself: it runs after the player each tick, and
 * either keeps a riding player glued to its top or catches one landing on it.
 */
export class MovingPlatform implements Entity {
  rect: Rect;
  riding = false;
  private t = 0;

  constructor(private readonly from: Vec, private readonly to: Vec, w = 48, private readonly period = 180) {
    this.rect = { x: from.x, y: from.y, w, h: 6 };
  }

  update(scene: BaseScene): void {
    const prevX = this.rect.x;
    const prevTop = this.rect.y;
    this.t = (this.t + 1) % (this.period * 2);
    const u = this.t < this.period ? this.t / this.period : 2 - this.t / this.period;
    this.rect.x = this.from.x + (this.to.x - this.from.x) * u;
    this.rect.y = this.from.y + (this.to.y - this.from.y) * u;
    const dx = this.rect.x - prevX;

    const p = scene.player;
    const b = p.body;
    const xOverlap = b.x < this.rect.x + this.rect.w && b.x + b.w > this.rect.x;
    const bottom = b.y + b.h;
    const settle = (): void => {
      b.x += dx;
      b.y = this.rect.y - b.h;
      b.vy = 0;
      p.contacts = { ...p.contacts, onGround: true };
      this.riding = true;
    };
    if (this.riding && xOverlap && b.vy >= 0) settle();
    else if (b.vy >= 0 && xOverlap && p.prevBottom <= prevTop + 0.01 && bottom >= this.rect.y - 0.01) settle();
    else this.riding = false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawPlank(ctx, this.rect);
  }
}
```

- [ ] **Step 3: run tests**

Run: `pnpm test entities && pnpm typecheck`
Expected: pass. If "carries a player" is off by a pixel, check that `settle()` adds `dx` from the platform's *this tick* movement (computed before the player is touched).

- [ ] **Step 4: commit**

```bash
git add src/engine/entities test/entities.test.ts
git commit -m "Engine: patroller, projectile, pickup, moving platform"
```

---

### Task 9: Demo contract, catalogue, first demo, catalogue smoke test

**Files:**
- Create: `src/demos/demo.ts`, `src/demos/index.ts`, `src/demos/run-and-jump.ts`
- Test: `test/catalogue.test.ts`

**Interfaces:**
- Produces: `type Category`, `CATEGORIES`, `interface Demo { id; title; category; blurb; controls: string[]; create(): Scene }`, `catalogue: readonly Demo[]`, `findDemo(id)`.
- Later demo tasks add one file and one array entry each; the smoke test here covers them automatically.

- [ ] **Step 1: demo contract**

`src/demos/demo.ts`:

```ts
import type { Scene } from '../engine/scene';

export type Category = 'Movement' | 'Combat' | 'Items' | 'World';
export const CATEGORIES: readonly Category[] = ['Movement', 'Combat', 'Items', 'World'];

export interface Demo {
  /** URL slug: lowercase letters, digits, dashes. */
  id: string;
  title: string;
  category: Category;
  /** One sentence, shown in the menu and under the canvas. */
  blurb: string;
  /** Short lines shown beside the canvas, e.g. "Z / Space: jump". */
  controls: string[];
  /** A fresh scene every call; R calls it again. */
  create(): Scene;
}

export const BASE_CONTROLS = ['← → or A D: run', 'Z or Space: jump', 'R: reset · Esc: menu'];
```

- [ ] **Step 2: first demo**

`src/demos/run-and-jump.ts`:

```ts
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..........................####........#',
  '#.....................###..............#',
  '#................###...................#',
  '#...........###........................#',
  '#..@...................................#',
  '#.......................#####..........#',
  '#####.....####################...#######',
  '########################################',
];

class RunAndJumpScene extends BaseScene {
  protected override afterUpdate(): void {
    const b = this.player.body;
    this.hud = [
      this.player.contacts.onGround ? 'on ground' : 'in the air',
      `speed ${Math.abs(Math.round(b.vx))} px/s`,
    ];
  }
}

export const runAndJump: Demo = {
  id: 'run-and-jump',
  title: 'Run and jump',
  category: 'Movement',
  blurb: 'The baseline: acceleration, friction, gravity and a single jump. Every other demo builds on this.',
  controls: BASE_CONTROLS,
  create: () => new RunAndJumpScene(LEVEL),
};
```

- [ ] **Step 3: catalogue**

`src/demos/index.ts`:

```ts
import type { Demo } from './demo';
import { runAndJump } from './run-and-jump';

/** Menu order. Adding a demo is one file and one line here. */
export const catalogue: readonly Demo[] = [
  runAndJump,
];

export function findDemo(id: string): Demo | undefined {
  return catalogue.find(d => d.id === id);
}

export type { Demo } from './demo';
export { CATEGORIES } from './demo';
```

- [ ] **Step 4: the smoke test every later demo must pass**

`test/catalogue.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { catalogue, CATEGORIES } from '../src/demos';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';
import { stubContext } from './stub-context';

/** A scripted player: runs back and forth, jumps, acts, climbs and drops now and then. */
function heldAt(t: number): Action[] {
  const held: Action[] = [];
  held.push(t % 200 < 100 ? 'right' : 'left');
  if (t % 45 < 8) held.push('jump');
  if (t % 70 === 0) held.push('act');
  if (t % 130 < 20) held.push('up');
  if (t % 190 < 12) held.push('down');
  return held;
}

const ALL: Action[] = ['left', 'right', 'up', 'down', 'jump', 'act', 'reset'];

describe('catalogue', () => {
  it('has unique slugs and valid categories', () => {
    const ids = catalogue.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of catalogue) {
      expect(d.id).toMatch(/^[a-z0-9-]+$/);
      expect(CATEGORIES).toContain(d.category);
      expect(d.title.length).toBeGreaterThan(0);
      expect(d.blurb.length).toBeGreaterThan(0);
      expect(d.controls.length).toBeGreaterThan(0);
    }
  });

  for (const demo of catalogue) {
    it(`${demo.id} survives 600 scripted ticks and draws`, () => {
      const scene = demo.create();
      const input = new Input();
      const ctx = stubContext();
      for (let t = 0; t < 600; t++) {
        const held = heldAt(t);
        for (const a of ALL) { if (held.includes(a)) input.press(a); else input.release(a); }
        input.tick();
        scene.update(input);
        if (t % 10 === 0) scene.draw(ctx, scene.camera);
        if (scene instanceof BaseScene) {
          expect(Number.isFinite(scene.player.body.x)).toBe(true);
          expect(Number.isFinite(scene.player.body.y)).toBe(true);
        }
      }
      expect(ctx.calls).toContain('fillRect');
    });
  }
});
```

Run: `pnpm test catalogue && pnpm typecheck`
Expected: 2 tests pass (one per demo plus the slug test). Delete `test/smoke.test.ts` now; the catalogue test replaces it.

- [ ] **Step 5: commit**

```bash
git rm -q test/smoke.test.ts
git add src/demos test/catalogue.test.ts
git commit -m "Demos: contract, catalogue, run-and-jump, 600-tick smoke test"
```

---

### Task 10: Shell — router, menu, demo view, touch bar

**Files:**
- Create: `src/shell/router.ts`, `src/shell/scale.ts`, `src/shell/menu.ts`, `src/shell/touch.ts`, `src/shell/demo-view.ts`
- Modify: `src/main.ts`, `src/shell/styles.css`
- Test: `test/router.test.ts`, `test/scale.test.ts`

**Interfaces:**
- Produces: `parseHash(hash) => Route`, `scaleFor(availW, availH) => number`, `renderMenu(root, catalogue)`, `mountTouchBar(slot, input) => unmount`, `mountDemo(root, demo) => unmount`.

- [ ] **Step 1: failing tests**

`test/router.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseHash } from '../src/shell/router';

describe('parseHash', () => {
  it('maps empty, #, #/ to the menu', () => {
    expect(parseHash('')).toEqual({ kind: 'menu' });
    expect(parseHash('#')).toEqual({ kind: 'menu' });
    expect(parseHash('#/')).toEqual({ kind: 'menu' });
  });
  it('maps #/<slug> to a demo, with or without a trailing slash', () => {
    expect(parseHash('#/double-jump')).toEqual({ kind: 'demo', id: 'double-jump' });
    expect(parseHash('#/double-jump/')).toEqual({ kind: 'demo', id: 'double-jump' });
  });
  it('anything else is the menu', () => {
    expect(parseHash('#/Double Jump')).toEqual({ kind: 'menu' });
    expect(parseHash('#foo')).toEqual({ kind: 'menu' });
  });
});
```

`test/scale.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { scaleFor } from '../src/shell/scale';

describe('scaleFor', () => {
  it('is the largest integer that fits both axes', () => {
    expect(scaleFor(1000, 800)).toBe(3);
    expect(scaleFor(640, 1000)).toBe(2);
    expect(scaleFor(1000, 360)).toBe(2);
  });
  it('never drops below 1 on a narrow phone', () => {
    expect(scaleFor(300, 600)).toBe(1);
    expect(scaleFor(0, 0)).toBe(1);
  });
});
```

Run: `pnpm test router scale`
Expected: FAIL, modules missing.

- [ ] **Step 2: router and scale**

`src/shell/router.ts`:

```ts
export type Route = { kind: 'menu' } | { kind: 'demo'; id: string };

export function parseHash(hash: string): Route {
  const m = /^#\/([a-z0-9-]+)\/?$/.exec(hash);
  return m ? { kind: 'demo', id: m[1] } : { kind: 'menu' };
}
```

`src/shell/scale.ts`:

```ts
import { VIEW_H, VIEW_W } from '../engine/constants';

/** Integer upscale that fits the space; never below 1 so a narrow phone overflows instead of blurring. */
export function scaleFor(availW: number, availH: number): number {
  return Math.max(1, Math.floor(Math.min(availW / VIEW_W, availH / VIEW_H)));
}
```

- [ ] **Step 3: menu**

`src/shell/menu.ts`:

```ts
import { CATEGORIES, type Demo } from '../demos/demo';

export function renderMenu(root: HTMLElement, catalogue: readonly Demo[]): void {
  root.innerHTML = '';
  const header = document.createElement('header');
  header.className = 'bar';
  const h1 = document.createElement('h1');
  h1.textContent = 'Mechanics';
  const p = document.createElement('p');
  p.className = 'tagline';
  p.textContent = 'A sampler of 2D game mechanics. Pick one and play with it.';
  header.append(h1, p);
  root.appendChild(header);

  for (const cat of CATEGORIES) {
    const demos = catalogue.filter(d => d.category === cat);
    if (demos.length === 0) continue;
    const section = document.createElement('section');
    section.className = 'group';
    const h2 = document.createElement('h2');
    h2.textContent = cat;
    section.appendChild(h2);
    const ul = document.createElement('ul');
    ul.className = 'cards';
    for (const d of demos) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'card';
      a.href = `#/${d.id}`;
      const b = document.createElement('b');
      b.textContent = d.title;
      const span = document.createElement('span');
      span.textContent = d.blurb;
      a.append(b, span);
      li.appendChild(a);
      ul.appendChild(li);
    }
    section.appendChild(ul);
    root.appendChild(section);
  }
}
```

- [ ] **Step 4: touch bar**

`src/shell/touch.ts`:

```ts
import type { Action, Input } from '../engine/input';

const BUTTONS: ReadonlyArray<[Action, string]> = [['left', '◀'], ['right', '▶'], ['jump', 'JUMP'], ['act', 'ACT']];

/**
 * Four big buttons that feed the same Input as the keyboard. Pointer tracking
 * is by coordinates, so a thumb can slide from ◀ to ▶ without lifting.
 * CSS shows the bar only on coarse-pointer devices.
 */
export function mountTouchBar(slot: HTMLElement, input: Input): () => void {
  const bar = document.createElement('div');
  bar.className = 'touchbar';
  for (const [action, label] of BUTTONS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.action = action;
    b.textContent = label;
    bar.appendChild(b);
  }
  const active = new Map<number, Action>();
  const actionAt = (x: number, y: number): Action | null => {
    const el = document.elementFromPoint(x, y)?.closest('[data-action]') as HTMLElement | null | undefined;
    return (el?.dataset.action as Action | undefined) ?? null;
  };
  const down = (e: PointerEvent): void => {
    const a = actionAt(e.clientX, e.clientY);
    if (!a) return;
    e.preventDefault();
    active.set(e.pointerId, a);
    input.press(a);
  };
  const move = (e: PointerEvent): void => {
    const prev = active.get(e.pointerId);
    if (prev === undefined) return;
    const a = actionAt(e.clientX, e.clientY);
    if (a === prev) return;
    input.release(prev);
    if (a) { active.set(e.pointerId, a); input.press(a); } else active.delete(e.pointerId);
  };
  const up = (e: PointerEvent): void => {
    const a = active.get(e.pointerId);
    if (a === undefined) return;
    input.release(a);
    active.delete(e.pointerId);
  };
  const block = (e: Event): void => e.preventDefault();
  bar.addEventListener('pointerdown', down);
  bar.addEventListener('contextmenu', block);
  bar.addEventListener('touchstart', block, { passive: false });
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  slot.appendChild(bar);
  return () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    bar.remove();
  };
}
```

- [ ] **Step 5: demo view**

`src/shell/demo-view.ts`:

```ts
import type { Demo } from '../demos/demo';
import { VIEW_H, VIEW_W } from '../engine/constants';
import { Input } from '../engine/input';
import { Loop } from '../engine/loop';
import { setupCanvas } from '../engine/renderer';
import type { Scene } from '../engine/scene';
import { scaleFor } from './scale';
import { mountTouchBar } from './touch';

const esc = (s: string): string => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] ?? ch);

/** Mounts one demo into root: header, canvas, hints, touch bar, loop. Returns the unmount. */
export function mountDemo(root: HTMLElement, demo: Demo): () => void {
  root.innerHTML = `
    <header class="bar">
      <a class="back" href="#/">&larr; Menu</a>
      <h1>${esc(demo.title)}</h1>
      <button class="reset" type="button">Reset (R)</button>
    </header>
    <div class="stage">
      <canvas width="${VIEW_W}" height="${VIEW_H}" aria-label="${esc(demo.title)} demo"></canvas>
      <pre class="overlay" hidden></pre>
    </div>
    <p class="blurb">${esc(demo.blurb)}</p>
    <ul class="hints">${demo.controls.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
    <div class="touch-slot"></div>`;

  const canvas = root.querySelector('canvas') as HTMLCanvasElement;
  const stage = root.querySelector('.stage') as HTMLElement;
  const overlay = root.querySelector('.overlay') as HTMLElement;
  const resetButton = root.querySelector('.reset') as HTMLButtonElement;
  const ctx = setupCanvas(canvas);
  const input = new Input();
  const detachKeys = input.attachKeyboard(window);
  const unmountTouch = mountTouchBar(root.querySelector('.touch-slot') as HTMLElement, input);

  let scene: Scene | null = null;
  let crashed = false;
  const crash = (e: unknown): void => {
    crashed = true;
    overlay.hidden = false;
    overlay.textContent = `${e instanceof Error ? e.message : String(e)}\n\nPress R to reset`;
    console.error(e);
  };
  const reset = (): void => {
    crashed = false;
    overlay.hidden = true;
    try { scene = demo.create(); } catch (e) { scene = null; crash(e); }
  };
  const loop = new Loop(
    () => {
      input.tick();
      if (input.pressed('reset')) reset();
      if (crashed || !scene) return;
      try { scene.update(input); } catch (e) { crash(e); }
    },
    () => {
      if (crashed || !scene) return;
      try { scene.draw(ctx, scene.camera); } catch (e) { crash(e); }
    },
  );

  const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') location.hash = '#/'; };
  const onReset = (): void => { reset(); resetButton.blur(); };
  const fit = (): void => {
    const k = scaleFor(stage.clientWidth, window.innerHeight - stage.getBoundingClientRect().top - 140);
    canvas.style.width = `${VIEW_W * k}px`;
    canvas.style.height = `${VIEW_H * k}px`;
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', fit);
  resetButton.addEventListener('click', onReset);
  fit();
  reset();
  loop.start();

  return () => {
    loop.stop();
    detachKeys();
    unmountTouch();
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', fit);
    resetButton.removeEventListener('click', onReset);
    root.innerHTML = '';
  };
}
```

- [ ] **Step 6: main.ts and styles**

`src/main.ts`:

```ts
import './shell/styles.css';
import { catalogue, findDemo } from './demos';
import { mountDemo } from './shell/demo-view';
import { renderMenu } from './shell/menu';
import { parseHash } from './shell/router';

const root = document.getElementById('app');
if (!root) throw new Error('#app missing');

let unmount: () => void = () => {};

function route(): void {
  unmount();
  unmount = () => {};
  const r = parseHash(location.hash);
  const demo = r.kind === 'demo' ? findDemo(r.id) : undefined;
  if (demo) {
    document.title = `${demo.title} · Mechanics`;
    unmount = mountDemo(root as HTMLElement, demo);
  } else {
    document.title = 'Mechanics';
    renderMenu(root as HTMLElement, catalogue);
    window.scrollTo(0, 0);
  }
}

window.addEventListener('hashchange', route);
route();
```

`src/shell/styles.css` (replace the whole file):

```css
:root {
  color-scheme: dark;
  --bg: #0b1020; --panel: #141a30; --edge: #2c3448; --text: #e6e9f0; --muted: #9aa3b8; --accent: #f2b632;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.4 system-ui, sans-serif; }
#app { max-width: 1000px; margin: 0 auto; padding: 12px; }
a { color: var(--accent); }

.bar { display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
.bar h1 { font-size: 22px; margin: 0; }
.bar .tagline { color: var(--muted); margin: 0; }
.bar .back { text-decoration: none; }
.bar .reset { margin-left: auto; background: var(--panel); color: var(--text); border: 1px solid var(--edge); border-radius: 6px; padding: 6px 10px; font: inherit; cursor: pointer; }

.group h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 20px 0 8px; }
.cards { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
.card { display: block; background: var(--panel); border: 1px solid var(--edge); border-radius: 8px; padding: 12px; text-decoration: none; color: var(--text); }
.card:hover, .card:focus-visible { border-color: var(--accent); outline: none; }
.card b { display: block; margin-bottom: 4px; }
.card span { color: var(--muted); font-size: 14px; }

.stage { position: relative; display: flex; justify-content: center; overflow-x: auto; }
.stage canvas { image-rendering: pixelated; image-rendering: crisp-edges; background: var(--bg); display: block; }
.overlay { position: absolute; inset: 0; margin: 0; padding: 16px; background: rgba(11, 16, 32, 0.9); color: #e85a5a; white-space: pre-wrap; font: 14px/1.4 monospace; display: flex; align-items: center; justify-content: center; text-align: center; }
.overlay[hidden] { display: none; }

.blurb { margin: 12px 0 4px; }
.hints { margin: 0; padding: 0; list-style: none; display: flex; gap: 16px; flex-wrap: wrap; color: var(--muted); font-size: 14px; }

.touchbar { display: none; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-top: 12px; touch-action: none; user-select: none; -webkit-user-select: none; }
.touchbar button { height: 64px; font: bold 18px system-ui, sans-serif; background: var(--panel); color: var(--text); border: 1px solid var(--edge); border-radius: 10px; touch-action: none; }
.touchbar button:active { background: var(--edge); }
@media (pointer: coarse) { .touchbar { display: grid; } }
```

- [ ] **Step 7: run everything, then look at it**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: all green.

Then hand-check in a browser (`pnpm dev`, open http://localhost:5173/):
1. Menu shows one card under Movement; clicking it opens the demo, `#/run-and-jump` in the URL.
2. Arrows/WASD run, Z/Space jump, Space does not scroll the page, R resets, Escape returns to the menu, browser Back also returns.
3. Resize the window: the canvas rescales in integer steps and stays crisp.
4. In devtools, toggle a mobile emulation (coarse pointer): the touch bar appears; tapping ◀ ▶ moves, sliding from ◀ to ▶ switches direction without lifting.
5. Temporarily make `RunAndJumpScene.update` throw; the overlay shows the message and R clears it. Revert.

- [ ] **Step 8: commit**

```bash
git add src/shell src/main.ts test/router.test.ts test/scale.test.ts
git commit -m "Shell: hash router, menu, demo view with reset/escape/error overlay, touch bar"
```

---

### Task 11: Movement demos — double jump, variable jump height, coyote time and buffering

**Files:**
- Create: `src/demos/double-jump.ts`, `src/demos/variable-jump.ts`, `src/demos/coyote-buffer.ts`
- Modify: `src/demos/index.ts` (three catalogue lines)
- Test: `test/demos-movement.test.ts`

**Interfaces:**
- Consumes: `Player` hooks (`canJump`, `onJump`, `control`, `integrate`), `BaseScene` hooks, `drawText`, `drawBar`, `TILE`.
- Produces: `doubleJump`, `variableJump`, `coyoteBuffer` demo objects; `DoubleJumpPlayer`, `VariableJumpPlayer`, `CoyotePlayer` classes exported for tests.

- [ ] **Step 1: failing tests**

`test/demos-movement.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CoyotePlayer, COYOTE_TICKS } from '../src/demos/coyote-buffer';
import { DoubleJumpPlayer } from '../src/demos/double-jump';
import { VariableJumpPlayer } from '../src/demos/variable-jump';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';

const FLAT = [
  '############',
  '#..........#',
  '#..........#',
  '#..........#',
  '#..........#',
  '#@.........#',
  '############',
];

const LEDGE = [
  '##########',
  '#........#',
  '#........#',
  '#@.......#',
  '###......#',
  '#........#',
  '##########',
];

function step(scene: BaseScene, input: Input, held: Action[] = []): void {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick();
  scene.update(input);
}

describe('double jump', () => {
  it('allows exactly one extra jump in the air, restored on landing', () => {
    const s = new BaseScene(FLAT, { player: spawn => new DoubleJumpPlayer(spawn) });
    const p = s.player as DoubleJumpPlayer;
    const input = new Input();
    step(s, input);
    step(s, input, ['jump']);
    expect(p.body.vy).toBeLessThan(0);
    for (let i = 0; i < 10; i++) step(s, input);
    const vyBefore = p.body.vy;
    step(s, input, ['jump']);
    expect(p.body.vy).toBeLessThan(vyBefore);
    expect(p.jumpsLeft).toBe(0);
    for (let i = 0; i < 5; i++) step(s, input);
    const vy3 = p.body.vy;
    step(s, input, ['jump']);
    expect(p.body.vy).toBeGreaterThan(vy3);      // third press: just gravity
    for (let i = 0; i < 120; i++) step(s, input);
    expect(p.contacts.onGround).toBe(true);
    expect(p.jumpsLeft).toBe(1);
  });
});

describe('variable jump height', () => {
  it('a tapped jump peaks lower than a held jump', () => {
    const peak = (holdTicks: number): number => {
      const s = new BaseScene(FLAT, { player: spawn => new VariableJumpPlayer(spawn) });
      const p = s.player as VariableJumpPlayer;
      const input = new Input();
      step(s, input);
      const y0 = p.body.y;
      let top = y0;
      for (let i = 0; i < holdTicks; i++) { step(s, input, ['jump']); top = Math.min(top, p.body.y); }
      for (let i = 0; i < 80; i++) { step(s, input); top = Math.min(top, p.body.y); }
      return y0 - top;
    };
    expect(peak(2)).toBeGreaterThan(4);
    expect(peak(2)).toBeLessThan(peak(30) - 8);
  });
});

describe('coyote time and jump buffering', () => {
  it('jumps a few ticks after walking off a ledge', () => {
    const s = new BaseScene(LEDGE, { player: spawn => new CoyotePlayer(spawn) });
    const p = s.player as CoyotePlayer;
    const input = new Input();
    while (p.contacts.onGround || p.ticks < 2) step(s, input, ['right']);
    for (let i = 0; i < COYOTE_TICKS - 2; i++) step(s, input, ['right']);
    step(s, input, ['right', 'jump']);
    expect(p.body.vy).toBeLessThan(0);
    expect(p.coyoteJumps).toBe(1);
  });

  it('a jump pressed just before landing fires on landing', () => {
    const s = new BaseScene(FLAT, { player: spawn => new CoyotePlayer(spawn) });
    const p = s.player as CoyotePlayer;
    p.moveTo({ x: 32, y: 77 });                      // 3 px above the floor
    const input = new Input();
    step(s, input);
    step(s, input, ['jump']);                        // still falling: buffered
    expect(p.body.vy).toBeGreaterThan(0);
    for (let i = 0; i < 12; i++) step(s, input);
    expect(p.bufferedJumps).toBe(1);
    expect(p.body.vy).toBeLessThan(0);
  });
});
```

Run: `pnpm test demos-movement`
Expected: FAIL, modules missing.

- [ ] **Step 2: double jump**

`src/demos/double-jump.ts`:

```ts
import { Player } from '../engine/entities/player';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#8ce8ff';

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#.................................######',
  '#......................................#',
  '#......................................#',
  '#..........................####........#',
  '#......................................#',
  '#......................................#',
  '#...................####...............#',
  '#......................................#',
  '#.....@................................#',
  '#...........####..........^^^^^^^^^....#',
  '########################################',
];

interface Puff { x: number; y: number; t: number }

export class DoubleJumpPlayer extends Player {
  airJumps = 1;
  jumpsLeft = 1;
  puffs: Puff[] = [];

  protected override canJump(): boolean {
    return this.contacts.onGround || this.jumpsLeft > 0;
  }

  protected override onJump(): void {
    if (this.contacts.onGround) return;
    this.jumpsLeft--;
    this.puffs.push({ x: this.body.x + this.body.w / 2, y: this.body.y + this.body.h, t: 12 });
  }

  protected override integrate(scene: BaseScene): void {
    super.integrate(scene);
    if (this.contacts.onGround) this.jumpsLeft = this.airJumps;
    for (const p of this.puffs) p.t--;
    this.puffs = this.puffs.filter(p => p.t > 0);
  }

  override draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = ACCENT;
    for (const p of this.puffs) {
      const r = p.t / 2;
      ctx.fillRect(p.x - r, p.y - 1, r * 2, 2);
    }
    super.draw(ctx);
  }
}

class DoubleJumpScene extends BaseScene {
  protected override afterUpdate(): void {
    const p = this.player as DoubleJumpPlayer;
    this.hud = [p.contacts.onGround ? 'on ground' : p.jumpsLeft > 0 ? 'air jump ready' : 'air jump used'];
  }
}

export const doubleJump: Demo = {
  id: 'double-jump',
  title: 'Double jump',
  category: 'Movement',
  blurb: 'A second jump while already in the air, once per flight. The ledges are too far apart for a single jump.',
  controls: [...BASE_CONTROLS, 'Jump again in the air'],
  create: () => new DoubleJumpScene(LEVEL, { accent: ACCENT, player: spawn => new DoubleJumpPlayer(spawn) }),
};
```

- [ ] **Step 3: variable jump height**

`src/demos/variable-jump.ts`:

```ts
import { TILE } from '../engine/constants';
import { Player } from '../engine/entities/player';
import type { Input } from '../engine/input';
import { drawText } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#ff9de2';

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..................................#####',
  '#.........................#####........#',
  '#..@..............#####................#',
  '########################################',
  '########################################',
];

const FLOOR_Y = 10 * TILE;

export class VariableJumpPlayer extends Player {
  peak = 0;
  lastPeak = 0;
  private cut = false;
  private jumpStartY = 0;

  protected override onJump(): void {
    this.cut = false;
    this.jumpStartY = this.body.y;
    this.peak = 0;
  }

  protected override control(scene: BaseScene, input: Input): void {
    super.control(scene, input);
    if (this.body.vy < 0 && !input.held('jump') && !this.cut) {
      this.body.vy *= 0.4;              // let go early: the rest of the rise is cut short
      this.cut = true;
    }
  }

  protected override integrate(scene: BaseScene): void {
    super.integrate(scene);
    this.peak = Math.max(this.peak, this.jumpStartY - this.body.y);
    if (this.contacts.onGround && this.peak > 0) { this.lastPeak = this.peak; this.peak = 0; }
  }
}

class VariableJumpScene extends BaseScene {
  protected override afterUpdate(): void {
    const p = this.player as VariableJumpPlayer;
    this.hud = [
      'tap for a hop, hold for full height',
      `last jump: ${(p.lastPeak / TILE).toFixed(1)} tiles`,
    ];
  }

  protected override drawWorld(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = ACCENT;
    for (let i = 1; i <= 4; i++) {
      const y = FLOOR_Y - i * TILE;
      ctx.fillRect(TILE, y, 6, 1);
      drawText(ctx, String(i), TILE + 8, y - 4, ACCENT);
    }
  }
}

export const variableJump: Demo = {
  id: 'variable-jump',
  title: 'Variable jump height',
  category: 'Movement',
  blurb: 'Release the button early for a short hop, hold it for the full arc. The ruler shows how high you got.',
  controls: [...BASE_CONTROLS, 'Tap vs hold jump'],
  create: () => new VariableJumpScene(LEVEL, { accent: ACCENT, player: spawn => new VariableJumpPlayer(spawn) }),
};
```

- [ ] **Step 4: coyote time and jump buffering**

`src/demos/coyote-buffer.ts`:

```ts
import { Player } from '../engine/entities/player';
import type { Input } from '../engine/input';
import { drawBar } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#ffd166';
export const COYOTE_TICKS = 6;
export const BUFFER_TICKS = 8;

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..@...................................#',
  '####..####..####..####...####..####..###',
  '####^^####^^####^^####^^^####^^####^^###',
  '########################################',
];

export class CoyotePlayer extends Player {
  /** Starts spent: a player that begins in the air has no window until it lands. */
  sinceGround = COYOTE_TICKS + 1;
  buffer = 0;
  coyoteJumps = 0;
  bufferedJumps = 0;

  protected override canJump(): boolean {
    return this.contacts.onGround || (this.sinceGround <= COYOTE_TICKS && this.body.vy >= 0);
  }

  protected override control(scene: BaseScene, input: Input): void {
    if (input.pressed('jump') && !this.canJump()) this.buffer = BUFFER_TICKS;
    super.control(scene, input);
    if (this.buffer > 0 && this.canJump()) {
      this.buffer = 0;
      this.bufferedJumps++;
      this.jump();
    } else if (this.buffer > 0) {
      this.buffer--;
    }
  }

  protected override onJump(): void {
    if (!this.contacts.onGround) this.coyoteJumps++;
    this.sinceGround = COYOTE_TICKS + 1;          // the window is spent
  }

  protected override integrate(scene: BaseScene): void {
    super.integrate(scene);
    if (this.contacts.onGround) this.sinceGround = 0; else this.sinceGround++;
  }
}

class CoyoteScene extends BaseScene {
  deaths = 0;

  protected override afterUpdate(): void {
    const p = this.player as CoyotePlayer;
    if (this.hurtByHazard()) { this.deaths++; this.respawn(); }
    this.hud = [
      `coyote jumps ${p.coyoteJumps}   buffered jumps ${p.bufferedJumps}   falls ${this.deaths}`,
      'jump late off an edge, or early before landing',
    ];
  }

  protected override drawHud(ctx: CanvasRenderingContext2D): void {
    super.drawHud(ctx);
    const p = this.player as CoyotePlayer;
    const coyoteLeft = p.contacts.onGround ? 1 : Math.max(0, COYOTE_TICKS - p.sinceGround) / COYOTE_TICKS;
    drawBar(ctx, 4, 26, 60, 4, coyoteLeft, ACCENT);
    drawBar(ctx, 70, 26, 60, 4, p.buffer / BUFFER_TICKS, ACCENT);
  }
}

export const coyoteBuffer: Demo = {
  id: 'coyote-buffer',
  title: 'Coyote time and jump buffering',
  category: 'Movement',
  blurb: 'Jump still works for a few frames after leaving a ledge, and a jump pressed just before landing fires on landing. The bars show both windows.',
  controls: [...BASE_CONTROLS, 'Jump late, jump early'],
  create: () => new CoyoteScene(LEVEL, { accent: ACCENT, player: spawn => new CoyotePlayer(spawn) }),
};
```

- [ ] **Step 5: register and test**

In `src/demos/index.ts` add the imports and, after `runAndJump,`:

```ts
  doubleJump,
  variableJump,
  coyoteBuffer,
```

Run: `pnpm test && pnpm typecheck`
Expected: movement tests pass, catalogue smoke test now covers 4 demos. The variable-jump test's "held" case must peak higher than the "tapped" case; if not, check the cut only fires while `vy < 0`.

- [ ] **Step 6: hand-check**

`pnpm dev`: each of the three appears under Movement. Double jump shows a puff. Variable jump readout changes with tap vs hold. Coyote bars drain.

- [ ] **Step 7: commit**

```bash
git add src/demos test/demos-movement.test.ts
git commit -m "Demos: double jump, variable jump height, coyote time + jump buffering"
```

---

### Task 12: Movement demos — wall climb and dash

**Files:**
- Create: `src/demos/wall-climb.ts`, `src/demos/dash.ts`
- Modify: `src/demos/index.ts`
- Test: `test/demos-wall-dash.test.ts`

**Interfaces:**
- Consumes: `touchesKind`, `moveBody`, `Player` hooks, `controlLock`, `hurtByHazard`.
- Produces: `wallClimb`, `dash` demos; `WallPlayer`, `DashPlayer`.

- [ ] **Step 1: failing tests**

`test/demos-wall-dash.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DashPlayer, DASH_SPEED } from '../src/demos/dash';
import { WallPlayer } from '../src/demos/wall-climb';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';

const WALL = [
  '########',
  '#......#',
  '#..|...#',
  '#..|...#',
  '#@.|...#',
  '########',
];

const OPEN = [
  '################',
  '#..............#',
  '#..............#',
  '#..............#',
  '#@.............#',
  '################',
];

function step(scene: BaseScene, input: Input, held: Action[] = []): void {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick();
  scene.update(input);
}

describe('wall climb', () => {
  it('clings while pushing into a climbable wall in the air, climbs up, and kicks off', () => {
    const s = new BaseScene(WALL, { player: spawn => new WallPlayer(spawn) });
    const p = s.player as WallPlayer;
    const input = new Input();
    for (let i = 0; i < 40; i++) step(s, input, ['right']);
    expect(p.body.x).toBe(48 - 12);
    step(s, input, ['right', 'jump']);
    for (let i = 0; i < 30; i++) step(s, input, ['right']);     // rise, then fall into the wall
    expect(p.clinging).toBe(true);
    expect(p.body.vy).toBeGreaterThan(0);
    expect(p.body.vy).toBeLessThan(60);                         // sliding, not falling
    const y = p.body.y;
    for (let i = 0; i < 10; i++) step(s, input, ['right', 'up']);
    expect(p.body.y).toBeLessThan(y);                           // climbed
    step(s, input, ['right', 'jump']);
    expect(p.body.vx).toBeLessThan(0);                          // kicked away from the wall
    expect(p.body.vy).toBeLessThan(0);
    expect(p.clinging).toBe(false);
  });
});

describe('dash', () => {
  it('bursts forward ignoring gravity, then cools down', () => {
    const s = new BaseScene(OPEN, { player: spawn => new DashPlayer(spawn) });
    const p = s.player as DashPlayer;
    const input = new Input();
    step(s, input, ['jump']);
    step(s, input);
    const y = p.body.y;
    step(s, input, ['act']);
    expect(p.body.vx).toBe(DASH_SPEED);
    expect(p.body.y).toBe(y);
    for (let i = 0; i < 4; i++) step(s, input);
    expect(p.body.y).toBe(y);
    expect(p.dashing).toBeGreaterThan(0);
    for (let i = 0; i < 10; i++) step(s, input);
    expect(p.dashing).toBe(0);
    step(s, input, ['act']);
    expect(p.dashing).toBe(0);                                  // still cooling down
    expect(p.cooldown).toBeGreaterThan(0);
  });
});
```

Run: `pnpm test demos-wall-dash`
Expected: FAIL, modules missing.

- [ ] **Step 2: wall climb**

`src/demos/wall-climb.ts`:

```ts
import { Player } from '../engine/entities/player';
import type { Input } from '../engine/input';
import { moveBody } from '../engine/physics';
import { BaseScene } from '../engine/scene';
import { touchesKind } from '../engine/tilemap';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#b8f0a0';
const SLIDE_SPEED = 25;
const CLIMB_SPEED = 50;
const KICK_SPEED = 130;

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#.............|........................#',
  '#.............|........................#',
  '#.............|.........|..............#',
  '#.............|.........|..............#',
  '#.............|.........|...########...#',
  '#.............|.........|..............#',
  '#.............|.........|..............#',
  '#.............|.........|..............#',
  '#......@......|.........|..............#',
  '#.............|.........|..............#',
  '########################################',
];

export class WallPlayer extends Player {
  clinging = false;
  private climbUp = false;

  protected override control(scene: BaseScene, input: Input): void {
    const b = this.body;
    const leftClimb = this.contacts.onWallLeft && touchesKind(scene.level, { x: b.x - 1, y: b.y, w: 1, h: b.h }, 'climb');
    const rightClimb = this.contacts.onWallRight && touchesKind(scene.level, { x: b.x + b.w, y: b.y, w: 1, h: b.h }, 'climb');
    const side: -1 | 0 | 1 = leftClimb ? -1 : rightClimb ? 1 : 0;
    const pushing = side !== 0 && input.held(side < 0 ? 'left' : 'right');
    const canCling = !this.contacts.onGround && (b.vy >= 0 || this.clinging);
    this.clinging = pushing && canCling;
    this.climbUp = this.clinging && input.held('up');

    if (this.clinging && input.pressed('jump')) {
      b.vx = -side * KICK_SPEED;
      b.vy = -this.jumpSpeed;
      this.facing = side < 0 ? 1 : -1;
      this.controlLock = 10;
      this.clinging = false;
      this.onJump();
      return;
    }
    super.control(scene, input);
  }

  protected override integrate(scene: BaseScene): void {
    if (!this.clinging) { super.integrate(scene); return; }
    this.body.vy = this.climbUp ? -CLIMB_SPEED : SLIDE_SPEED;
    this.prevBottom = this.body.y + this.body.h;
    this.contacts = moveBody(scene.level, this.body);
  }
}

class WallClimbScene extends BaseScene {
  protected override afterUpdate(): void {
    const p = this.player as WallPlayer;
    this.hud = [p.clinging ? 'clinging: up to climb, jump to kick off' : 'push into a hatched wall while airborne'];
  }
}

export const wallClimb: Demo = {
  id: 'wall-climb',
  title: 'Wall climb and wall jump',
  category: 'Movement',
  blurb: 'Push into a hatched wall while airborne to cling and slide slowly; hold up to climb; jump to kick away.',
  controls: [...BASE_CONTROLS, '↑ or W: climb while clinging'],
  create: () => new WallClimbScene(LEVEL, { accent: ACCENT, player: spawn => new WallPlayer(spawn) }),
};
```

- [ ] **Step 3: dash**

`src/demos/dash.ts`:

```ts
import { Player } from '../engine/entities/player';
import type { Rect } from '../engine/geom';
import type { Input } from '../engine/input';
import { moveBody } from '../engine/physics';
import { drawBar } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#ff7a59';
export const DASH_SPEED = 320;
const DASH_TICKS = 12;
const COOLDOWN_TICKS = 30;

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..@...................................#',
  '#......................................#',
  '######^^^^^^######^^^^^^######^^^^######',
  '########################################',
];

export class DashPlayer extends Player {
  dashing = 0;
  cooldown = 0;
  private dir: 1 | -1 = 1;
  trail: Rect[] = [];

  protected override control(scene: BaseScene, input: Input): void {
    if (this.cooldown > 0) this.cooldown--;
    if (this.dashing === 0 && this.cooldown === 0 && input.pressed('act')) {
      this.dashing = DASH_TICKS;
      this.cooldown = DASH_TICKS + COOLDOWN_TICKS;
      this.dir = this.facing;
    }
    if (this.dashing > 0) {
      this.body.vx = this.dir * DASH_SPEED;
      return;
    }
    super.control(scene, input);
  }

  protected override integrate(scene: BaseScene): void {
    if (this.dashing > 0) {
      this.dashing--;
      this.body.vy = 0;
      this.trail.push({ ...this.body });
      if (this.trail.length > 6) this.trail.shift();
      this.prevBottom = this.body.y + this.body.h;
      this.contacts = moveBody(scene.level, this.body);
      if (this.dashing === 0) this.body.vx = this.dir * this.runSpeed;
      return;
    }
    if (this.trail.length > 0) this.trail.shift();
    super.integrate(scene);
  }

  override draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = ACCENT;
    this.trail.forEach((r, i) => {
      const inset = (this.trail.length - i);
      ctx.fillRect(r.x + inset, r.y + inset, Math.max(1, r.w - inset * 2), Math.max(1, r.h - inset * 2));
    });
    super.draw(ctx);
  }
}

class DashScene extends BaseScene {
  falls = 0;

  protected override afterUpdate(): void {
    if (this.hurtByHazard()) { this.falls++; this.respawn(); }
    const p = this.player as DashPlayer;
    this.hud = [p.cooldown === 0 ? 'dash ready' : 'cooling down', `falls ${this.falls}`];
  }

  protected override drawHud(ctx: CanvasRenderingContext2D): void {
    super.drawHud(ctx);
    const p = this.player as DashPlayer;
    drawBar(ctx, 4, 26, 60, 4, 1 - p.cooldown / (DASH_TICKS + COOLDOWN_TICKS), ACCENT);
  }
}

export const dash: Demo = {
  id: 'dash',
  title: 'Dash',
  category: 'Movement',
  blurb: 'A short burst in the facing direction that ignores gravity, with a cooldown. The gaps are too wide to jump.',
  controls: [...BASE_CONTROLS, 'X: dash'],
  create: () => new DashScene(LEVEL, { accent: ACCENT, player: spawn => new DashPlayer(spawn) }),
};
```

- [ ] **Step 4: register and test**

Add `wallClimb,` and `dash,` to the catalogue after `coyoteBuffer,`.

Run: `pnpm test && pnpm typecheck`
Expected: pass. If the dash test's `p.body.y` drifts during the dash, gravity is being applied on the dash path; the `integrate` override must not call `super.integrate` while dashing.

- [ ] **Step 5: hand-check and commit**

`pnpm dev`: wall climb clings visibly and the ledge is reachable; the dash crosses the spike gaps and the bar refills.

```bash
git add src/demos test/demos-wall-dash.test.ts
git commit -m "Demos: wall climb + wall jump, dash"
```

---

### Task 13: Combat demos — enemy patrol, ranged weapon, melee attack

**Files:**
- Create: `src/demos/arena.ts` (the shared combat level and an enemy respawner), `src/demos/enemy-patrol.ts`, `src/demos/ranged-weapon.ts`, `src/demos/melee-attack.ts`
- Modify: `src/demos/index.ts`
- Test: `test/demos-combat.test.ts`

**Interfaces:**
- Consumes: `Patroller`, `Projectile`, `overlaps`, `BaseScene`, `drawText`.
- Produces: `ARENA` rows, `class Respawner { constructor(scene, spots: Array<{cell, dir, turnAtLedges}>); kill(p: Patroller); update() }`, demos `enemyPatrol`, `rangedWeapon`, `meleeAttack`; scene classes `RangedScene`, `MeleeScene` exported for tests.

- [ ] **Step 1: failing tests**

`test/demos-combat.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MeleeScene } from '../src/demos/melee-attack';
import { RangedScene } from '../src/demos/ranged-weapon';
import { Patroller } from '../src/engine/entities/patroller';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';

const ROOM = [
  '####################',
  '#..................#',
  '#..................#',
  '#@.................#',
  '####################',
];

function step(scene: BaseScene, input: Input, held: Action[] = []): void {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick();
  scene.update(input);
}

const enemies = (s: BaseScene): Patroller[] => s.entities.filter((e): e is Patroller => e instanceof Patroller);

describe('ranged weapon', () => {
  it('a shot kills a patroller ahead and it respawns later', () => {
    const s = new RangedScene(ROOM, [{ cell: { x: 160, y: 48 }, dir: -1, turnAtLedges: false }]);
    const input = new Input();
    step(s, input);
    expect(enemies(s).length).toBe(1);
    step(s, input, ['act']);
    for (let i = 0; i < 60; i++) step(s, input);
    expect(s.hits).toBe(1);
    expect(enemies(s).length).toBe(0);
    for (let i = 0; i < 130; i++) step(s, input);
    expect(enemies(s).length).toBe(1);
  });
});

describe('melee attack', () => {
  it('a swing only hits inside its short window and reach', () => {
    const s = new MeleeScene(ROOM, [{ cell: { x: 40, y: 48 }, dir: -1, turnAtLedges: false }]);
    const input = new Input();
    step(s, input);
    step(s, input, ['act']);
    for (let i = 0; i < 8; i++) step(s, input);
    expect(s.hits).toBe(1);
    expect(enemies(s).length).toBe(0);
  });
});
```

Run: `pnpm test demos-combat`
Expected: FAIL, modules missing.

- [ ] **Step 2: shared arena and respawner**

`src/demos/arena.ts`:

```ts
import { Patroller } from '../engine/entities/patroller';
import type { Vec } from '../engine/geom';
import { overlaps } from '../engine/geom';
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

export interface Spot { cell: Vec; dir: 1 | -1; turnAtLedges: boolean }

export const ARENA_SPOTS: Spot[] = [
  { cell: { x: 18 * 16, y: 4 * 16 }, dir: -1, turnAtLedges: true },
  { cell: { x: 33 * 16, y: 7 * 16 }, dir: -1, turnAtLedges: true },
  { cell: { x: 25 * 16, y: 9 * 16 }, dir: -1, turnAtLedges: false },
];

const RESPAWN_TICKS = 120;

/** Keeps every spot populated: a killed patroller comes back at its spot after a delay. */
export class Respawner {
  private pending: Array<{ spot: Spot; at: number }> = [];
  private readonly alive = new Map<Patroller, Spot>();

  constructor(private readonly scene: BaseScene, private readonly spots: Spot[]) {
    for (const spot of spots) this.spawn(spot);
  }

  private spawn(spot: Spot): void {
    const p = new Patroller(spot.cell, spot.dir, spot.turnAtLedges);
    this.alive.set(p, spot);
    this.scene.entities.push(p);
  }

  enemies(): Patroller[] {
    return [...this.alive.keys()];
  }

  kill(p: Patroller): void {
    const spot = this.alive.get(p);
    if (!spot) return;
    p.dead = true;
    this.alive.delete(p);
    this.pending.push({ spot, at: this.scene.ticks + RESPAWN_TICKS });
  }

  /** Call from afterUpdate. Returns true when the player touched a live enemy. */
  update(): boolean {
    const due = this.pending.filter(p => p.at <= this.scene.ticks);
    this.pending = this.pending.filter(p => p.at > this.scene.ticks);
    for (const d of due) this.spawn(d.spot);
    return this.enemies().some(e => overlaps(e.body, this.scene.player.body));
  }
}
```

- [ ] **Step 3: enemy patrol**

`src/demos/enemy-patrol.ts`:

```ts
import { drawText } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { ARENA, ARENA_SPOTS, Respawner } from './arena';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#4fb3e8';

class PatrolScene extends BaseScene {
  private readonly spawner = new Respawner(this, ARENA_SPOTS);
  touched = 0;

  protected override afterUpdate(): void {
    if (this.spawner.update()) { this.touched++; this.respawn(); }
    this.hud = [`touched ${this.touched}`, 'two turn at ledges; the floor one only turns at walls'];
  }

  protected override drawWorld(ctx: CanvasRenderingContext2D): void {
    for (const e of this.spawner.enemies()) {
      drawText(ctx, e.turnAtLedges ? 'ledge' : 'wall', e.body.x - 4, e.body.y - 10, ACCENT);
    }
  }
}

export const enemyPatrol: Demo = {
  id: 'enemy-patrol',
  title: 'Enemy patrol',
  category: 'Combat',
  blurb: 'Enemies walk back and forth. Some turn when the floor runs out; one only turns at walls. Touching one sends you back.',
  controls: BASE_CONTROLS,
  create: () => new PatrolScene(ARENA, { accent: ACCENT }),
};
```

- [ ] **Step 4: ranged weapon**

`src/demos/ranged-weapon.ts`:

```ts
import { Projectile } from '../engine/entities/projectile';
import { overlaps } from '../engine/geom';
import type { Input } from '../engine/input';
import { BaseScene } from '../engine/scene';
import { ARENA, ARENA_SPOTS, Respawner, type Spot } from './arena';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#fff275';
const FIRE_COOLDOWN = 10;

export class RangedScene extends BaseScene {
  private readonly spawner: Respawner;
  private cooldown = 0;
  hits = 0;
  touched = 0;

  constructor(rows: readonly string[], spots: Spot[] = ARENA_SPOTS) {
    super(rows, { accent: ACCENT });
    this.spawner = new Respawner(this, spots);
  }

  protected override afterUpdate(input: Input): void {
    if (this.cooldown > 0) this.cooldown--;
    const b = this.player.body;
    if (input.pressed('act') && this.cooldown === 0) {
      this.cooldown = FIRE_COOLDOWN;
      const x = this.player.facing > 0 ? b.x + b.w : b.x - 4;
      this.entities.push(new Projectile(x, b.y + 6, this.player.facing, 260, ACCENT));
    }
    const shots = this.entities.filter((e): e is Projectile => e instanceof Projectile && !e.dead);
    for (const shot of shots) {
      for (const enemy of this.spawner.enemies()) {
        if (overlaps(shot.body, enemy.body)) {
          shot.dead = true;
          this.spawner.kill(enemy);
          this.hits++;
          break;
        }
      }
    }
    if (this.spawner.update()) { this.touched++; this.respawn(); }
    this.hud = [`hits ${this.hits}   touched ${this.touched}`];
  }
}

export const rangedWeapon: Demo = {
  id: 'ranged-weapon',
  title: 'Ranged weapon',
  category: 'Combat',
  blurb: 'Fire a projectile the way you are facing. It stops at walls and takes out a patroller on contact.',
  controls: [...BASE_CONTROLS, 'X: fire'],
  create: () => new RangedScene(ARENA),
};
```

- [ ] **Step 5: melee attack**

`src/demos/melee-attack.ts`:

```ts
import type { Rect } from '../engine/geom';
import { overlaps } from '../engine/geom';
import type { Input } from '../engine/input';
import { BaseScene } from '../engine/scene';
import { ARENA, ARENA_SPOTS, Respawner, type Spot } from './arena';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#ff8fa3';
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
    if (this.spawner.update()) { this.touched++; this.respawn(); }
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
```

- [ ] **Step 6: register and test**

Add `enemyPatrol,`, `rangedWeapon,`, `meleeAttack,` to the catalogue after `dash,`.

Run: `pnpm test && pnpm typecheck`
Expected: pass. The ranged test's patroller stands at x 160 and walks left at 40 px/s; the shot travels 260 px/s and reaches it well inside 60 ticks.

- [ ] **Step 7: hand-check and commit**

`pnpm dev`: labels float above the enemies in Enemy patrol; shots are the accent colour and stop at walls; the swing box appears and shrinks.

```bash
git add src/demos test/demos-combat.test.ts
git commit -m "Demos: enemy patrol, ranged weapon, melee attack on a shared arena"
```

---

### Task 14: Damage demos — hit points, hazards, checkpoint and respawn

**Files:**
- Create: `src/demos/hit-points.ts`, `src/demos/hazards.ts`, `src/demos/checkpoint.ts`
- Modify: `src/demos/index.ts`
- Test: `test/demos-damage.test.ts`

**Interfaces:**
- Consumes: `Respawner`/`Spot` from `./arena`, `hurtByHazard`, `overlaps`, `drawFlag`, `Player.flicker/controlLock`.
- Produces: `hitPoints`, `hazards`, `checkpoint` demos; `HpPlayer`, `HpScene`, `HazardScene`, `CheckpointScene` exported for tests.

- [ ] **Step 1: failing tests**

`test/demos-damage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CheckpointScene } from '../src/demos/checkpoint';
import { HazardScene } from '../src/demos/hazards';
import { HpScene, type HpPlayer, MAX_HP } from '../src/demos/hit-points';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';

const SPIKES = [
  '############',
  '#..........#',
  '#..........#',
  '#@...^.....#',
  '############',
];

const FLAGS = [
  '####################',
  '#..................#',
  '#..................#',
  '#@.....*...^.......#',
  '####################',
];

function step(scene: BaseScene, input: Input, held: Action[] = []): void {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick();
  scene.update(input);
}

describe('hit points', () => {
  it('a spike costs one hp, knocks back, and grants invulnerability', () => {
    const s = new HpScene(SPIKES, []);
    const p = s.player as HpPlayer;
    const input = new Input();
    let ticks = 0;
    while (p.hp === MAX_HP && ticks++ < 200) step(s, input, ['right']);
    expect(p.hp).toBe(MAX_HP - 1);
    expect(p.invuln).toBeGreaterThan(0);
    expect(p.body.vy).toBeLessThan(0);
    expect(p.body.vx).toBeLessThan(0);
    for (let i = 0; i < 20; i++) step(s, input, ['right']);
    expect(p.hp).toBe(MAX_HP - 1);
  });

  it('at zero hp the player respawns with full hp', () => {
    const s = new HpScene(SPIKES, []);
    const p = s.player as HpPlayer;
    const input = new Input();
    for (let i = 0; i < 900; i++) step(s, input, ['right']);
    expect(s.deaths).toBeGreaterThanOrEqual(1);
    expect(p.hp).toBeGreaterThan(0);
  });
});

describe('hazards', () => {
  it('a spike kills and respawns at the start', () => {
    const s = new HazardScene(SPIKES);
    const input = new Input();
    for (let i = 0; i < 120; i++) step(s, input, ['right']);
    expect(s.deaths).toBe(1);
    for (let i = 0; i < 40; i++) step(s, input);
    expect(s.player.body.x).toBe(18);
  });
});

describe('checkpoint', () => {
  it('dying after touching a flag respawns at the flag', () => {
    const s = new CheckpointScene(FLAGS);
    const input = new Input();
    for (let i = 0; i < 300; i++) step(s, input, ['right']);
    expect(s.active).toBe(0);
    expect(s.deaths).toBe(1);
    for (let i = 0; i < 60; i++) step(s, input);
    expect(s.player.body.x).toBe(7 * 16 + 2);
  });
});
```

Run: `pnpm test demos-damage`
Expected: FAIL, modules missing.

- [ ] **Step 2: hit points**

`src/demos/hit-points.ts`:

```ts
import { Player } from '../engine/entities/player';
import { overlaps } from '../engine/geom';
import { PALETTE } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { Respawner, type Spot } from './arena';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#e85a5a';
export const MAX_HP = 3;
const INVULN_TICKS = 60;
const DEATH_TICKS = 40;

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..........######..........######......#',
  '#......................................#',
  '#..@...................................#',
  '#.........^^^.............^^^^.........#',
  '########################################',
  '########################################',
];

const SPOTS: Spot[] = [
  { cell: { x: 13 * 16, y: 5 * 16 }, dir: -1, turnAtLedges: true },
  { cell: { x: 29 * 16, y: 5 * 16 }, dir: -1, turnAtLedges: true },
  { cell: { x: 20 * 16, y: 9 * 16 }, dir: -1, turnAtLedges: false },
];

export class HpPlayer extends Player {
  hp = MAX_HP;
  invuln = 0;

  /** Take one hit from something centred at fromX. Returns false while invulnerable. */
  hurt(fromX: number): boolean {
    if (this.invuln > 0 || this.hp <= 0) return false;
    this.hp--;
    this.invuln = INVULN_TICKS;
    this.flicker = true;
    const dir = this.body.x + this.body.w / 2 < fromX ? -1 : 1;
    this.body.vx = dir * 160;
    this.body.vy = -150;
    this.controlLock = 12;
    return true;
  }

  protected override integrate(scene: BaseScene): void {
    super.integrate(scene);
    if (this.invuln > 0 && --this.invuln === 0) this.flicker = false;
  }
}

export class HpScene extends BaseScene {
  private readonly spawner: Respawner;
  deaths = 0;
  private dying = 0;

  constructor(rows: readonly string[], spots: Spot[] = SPOTS) {
    super(rows, { accent: ACCENT, player: spawn => new HpPlayer(spawn) });
    this.spawner = new Respawner(this, spots);
  }

  protected override afterUpdate(): void {
    const p = this.player as HpPlayer;
    this.spawner.update();
    if (this.dying > 0) {
      if (--this.dying === 0) {
        this.respawn();
        p.hp = MAX_HP;
        p.invuln = 0;
        p.flicker = false;
      }
    } else {
      const b = p.body;
      if (this.hurtByHazard()) p.hurt(b.x + b.w / 2 + p.facing);
      for (const e of this.spawner.enemies()) {
        if (overlaps(e.body, b)) p.hurt(e.body.x + e.body.w / 2);
      }
      if (p.hp === 0) {
        this.dying = DEATH_TICKS;
        this.deaths++;
        p.controlLock = DEATH_TICKS;
        p.flicker = true;
      }
    }
    this.hud = [`deaths ${this.deaths}`];
  }

  protected override drawHud(ctx: CanvasRenderingContext2D): void {
    const p = this.player as HpPlayer;
    for (let i = 0; i < MAX_HP; i++) {
      ctx.fillStyle = i < p.hp ? ACCENT : PALETTE.climb;
      ctx.fillRect(4 + i * 10, 4, 8, 6);
    }
    this.hud.forEach((line, i) => { ctx.font = '8px monospace'; ctx.textBaseline = 'top'; ctx.fillStyle = PALETTE.text; ctx.fillText(line, 4, 14 + i * 10); });
  }
}

export const hitPoints: Demo = {
  id: 'hit-points',
  title: 'Hit points',
  category: 'Combat',
  blurb: 'Three hearts. Spikes and enemies take one each, knock you back and make you briefly untouchable. At zero you respawn.',
  controls: BASE_CONTROLS,
  create: () => new HpScene(LEVEL),
};
```

- [ ] **Step 3: hazards**

`src/demos/hazards.ts`:

```ts
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#c9ced8';
const DEATH_TICKS = 30;

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..............^^^.......^^^...........#',
  '#.............#####.....#####..........#',
  '#..@...................................#',
  '#......^^^.......^^^^.......^^^^^......#',
  '########################################',
  '########################################',
];

export class HazardScene extends BaseScene {
  deaths = 0;
  dying = 0;

  protected override afterUpdate(): void {
    const p = this.player;
    if (this.dying > 0) {
      if (--this.dying === 0) { this.respawn(); p.flicker = false; }
    } else if (this.hurtByHazard()) {
      this.deaths++;
      this.dying = DEATH_TICKS;
      p.flicker = true;
      p.controlLock = DEATH_TICKS;
      p.body.vx = 0;
      p.body.vy = -120;
    }
    this.hud = [`deaths ${this.deaths}`, 'only the pointy half of a spike hurts'];
  }
}

export const hazards: Demo = {
  id: 'hazards',
  title: 'Hazards',
  category: 'World',
  blurb: 'Spikes. Touch the pointy half and you die and restart. Brushing past the base of one is safe.',
  controls: BASE_CONTROLS,
  create: () => new HazardScene(LEVEL, { accent: ACCENT }),
};
```

- [ ] **Step 4: checkpoint and respawn**

`src/demos/checkpoint.ts`:

```ts
import { TILE } from '../engine/constants';
import type { Vec } from '../engine/geom';
import { overlaps } from '../engine/geom';
import { drawFlag } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#8ce86a';
const DEATH_TICKS = 30;

const LEVEL = [
  '############################################################',
  '#..........................................................#',
  '#..........................................................#',
  '#..........................................................#',
  '#..........................................................#',
  '#..........................................................#',
  '#..........................................................#',
  '#..........................................................#',
  '#..@...........*.................*.................*.......#',
  '#.........^^........^^^.........^^^.........^^^............#',
  '############################################################',
  '############################################################',
];

export class CheckpointScene extends BaseScene {
  readonly flags: Vec[];
  active = -1;
  deaths = 0;
  private dying = 0;
  private toast = 0;

  constructor(rows: readonly string[]) {
    super(rows, { accent: ACCENT });
    this.flags = this.level.pickups;
  }

  override respawn(): void {
    this.player.moveTo(this.active >= 0 ? this.flags[this.active] : this.level.spawn);
  }

  protected override afterUpdate(): void {
    const p = this.player;
    this.flags.forEach((f, i) => {
      if (i !== this.active && overlaps(p.body, { x: f.x, y: f.y, w: TILE, h: TILE })) { this.active = i; this.toast = 60; }
    });
    if (this.toast > 0) this.toast--;
    if (this.dying > 0) {
      if (--this.dying === 0) { this.respawn(); p.flicker = false; }
    } else if (this.hurtByHazard()) {
      this.deaths++;
      this.dying = DEATH_TICKS;
      p.flicker = true;
      p.controlLock = DEATH_TICKS;
      p.body.vx = 0;
      p.body.vy = -120;
    }
    this.hud = [
      `checkpoint ${this.active + 1}/${this.flags.length}   deaths ${this.deaths}`,
      this.toast > 0 ? 'checkpoint!' : '',
    ];
  }

  protected override drawWorld(ctx: CanvasRenderingContext2D): void {
    this.flags.forEach((f, i) => drawFlag(ctx, f.x, f.y, i === this.active, ACCENT));
  }
}

export const checkpoint: Demo = {
  id: 'checkpoint',
  title: 'Checkpoint and respawn',
  category: 'Items',
  blurb: 'Touch a flag to raise it. When the spikes get you, you come back at the last raised flag instead of the start.',
  controls: BASE_CONTROLS,
  create: () => new CheckpointScene(LEVEL),
};
```

- [ ] **Step 5: register and test**

Add `hitPoints,`, `hazards,`, `checkpoint,` to the catalogue after `meleeAttack,`.

Run: `pnpm test && pnpm typecheck`
Expected: pass. In the checkpoint test the player runs right over the flag at col 7, dies on the spike at col 11, and respawns standing on the flag cell (x = 7·16 + 2).

- [ ] **Step 6: hand-check and commit**

`pnpm dev`: hearts empty and refill; the flag rises with a "checkpoint!" toast; brushing the base of a spike is safe.

```bash
git add src/demos test/demos-damage.test.ts
git commit -m "Demos: hit points, hazards, checkpoint + respawn"
```

---

### Task 15: Item demos — collectibles, powerup, keys and doors

**Files:**
- Create: `src/demos/collectibles.ts`, `src/demos/powerup.ts`, `src/demos/keys-and-doors.ts`
- Modify: `src/demos/index.ts`
- Test: `test/demos-items.test.ts`

**Interfaces:**
- Consumes: `Pickup`, `setTile`, `touchesKind`, `drawKey`, `drawBar`, `PALETTE`.
- Produces: `collectibles`, `powerup`, `keysAndDoors` demos; `CollectScene`, `PowerupScene`, `BOOST_TICKS`, `KeyDoorScene` exported for tests.

- [ ] **Step 1: failing tests**

`test/demos-items.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CollectScene } from '../src/demos/collectibles';
import { KeyDoorScene } from '../src/demos/keys-and-doors';
import { BOOST_TICKS, PowerupScene } from '../src/demos/powerup';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';
import { tileAt } from '../src/engine/tilemap';

function step(scene: BaseScene, input: Input, held: Action[] = []): void {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick();
  scene.update(input);
}

describe('collectibles', () => {
  it('counts coins and notices when all are taken', () => {
    const s = new CollectScene(['############', '#..........#', '#@..*..*...#', '############']);
    const input = new Input();
    expect(s.total).toBe(2);
    for (let i = 0; i < 150; i++) step(s, input, ['right']);
    expect(s.got).toBe(2);
    expect(s.hud.join(' ')).toContain('All');
  });
});

describe('powerup', () => {
  it('speeds the player up for a while, then the pickup comes back', () => {
    const s = new PowerupScene(['##########', '#........#', '#@.*.....#', '##########']);
    const input = new Input();
    const base = s.player.runSpeed;
    for (let i = 0; i < 40; i++) step(s, input, ['right']);
    expect(s.player.runSpeed).toBeGreaterThan(base);
    expect(s.boost).toBeGreaterThan(0);
    for (let i = 0; i < BOOST_TICKS + 5; i++) step(s, input);
    expect(s.player.runSpeed).toBe(base);
    expect(s.entities.length).toBe(0);
    for (let i = 0; i < 70; i++) step(s, input);
    expect(s.entities.length).toBe(1);
  });
});

describe('keys and doors', () => {
  const ROWS = ['############', '#..........#', '#@..k..d...#', '############'];

  it('the door blocks without the key', () => {
    const s = new KeyDoorScene(ROWS);
    // start past the key so the player never touches it
    s.player.moveTo({ x: 80, y: 32 });
    const input = new Input();
    for (let i = 0; i < 60; i++) step(s, input, ['right']);
    expect(s.hasKey).toBe(false);
    expect(s.player.body.x).toBe(112 - 12);
    expect(tileAt(s.level, 7, 2)).toBe('door');
  });

  it('with the key, touching the door opens it', () => {
    const s = new KeyDoorScene(ROWS);
    const input = new Input();
    for (let i = 0; i < 120; i++) step(s, input, ['right']);
    expect(s.hasKey).toBe(true);
    expect(s.opened).toBe(true);
    expect(tileAt(s.level, 7, 2)).toBe('empty');
    expect(s.player.body.x).toBeGreaterThan(112);
  });
});
```

Run: `pnpm test demos-items`
Expected: FAIL, modules missing.

- [ ] **Step 2: collectibles**

`src/demos/collectibles.ts`:

```ts
import { Pickup } from '../engine/entities/pickup';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#f2e26a';

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#............*.............*...........#',
  '#...........###...........###..........#',
  '#......................................#',
  '#.....*..............*.............*...#',
  '#....###............###...........###..#',
  '#..@...................................#',
  '#.*.....*.....*.....*.....*.....*.....*#',
  '########################################',
  '########################################',
];

export class CollectScene extends BaseScene {
  readonly total: number;
  got = 0;

  constructor(rows: readonly string[]) {
    super(rows, { accent: ACCENT });
    this.total = this.level.pickups.length;
    for (const cell of this.level.pickups) this.entities.push(new Pickup(cell, () => { this.got++; }, ACCENT));
  }

  protected override afterUpdate(): void {
    this.hud = [`coins ${this.got}/${this.total}`, this.got === this.total ? 'All coins! R to reset' : ''];
  }
}

export const collectibles: Demo = {
  id: 'collectibles',
  title: 'Collectibles',
  category: 'Items',
  blurb: 'Coins and a counter. Pick them all up for a message.',
  controls: BASE_CONTROLS,
  create: () => new CollectScene(LEVEL),
};
```

- [ ] **Step 3: powerup**

`src/demos/powerup.ts`:

```ts
import { Pickup } from '../engine/entities/pickup';
import type { Vec } from '../engine/geom';
import { drawBar, PALETTE } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#ff9de2';
export const BOOST_TICKS = 300;
const RETURN_TICKS = 60;
const BOOST_SPEED = 170;

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..@...........*.......................#',
  '#.........#.....#.....#.....#.....#....#',
  '########################################',
  '########################################',
];

export class PowerupScene extends BaseScene {
  boost = 0;
  private returnAt = 0;
  private readonly baseSpeed: number;
  private readonly cell: Vec;

  constructor(rows: readonly string[]) {
    super(rows, { accent: ACCENT });
    this.baseSpeed = this.player.runSpeed;
    this.cell = this.level.pickups[0];
    this.place();
  }

  private place(): void {
    this.entities.push(new Pickup(this.cell, () => {
      this.boost = BOOST_TICKS;
      this.player.runSpeed = BOOST_SPEED;
      this.player.color = ACCENT;
    }, ACCENT));
  }

  protected override afterUpdate(): void {
    if (this.boost > 0 && --this.boost === 0) {
      this.player.runSpeed = this.baseSpeed;
      this.player.color = PALETTE.player;
      this.returnAt = this.ticks + RETURN_TICKS;
    }
    if (this.returnAt > 0 && this.ticks >= this.returnAt) { this.returnAt = 0; this.place(); }
    this.hud = [this.boost > 0 ? `speed boost ${(this.boost / 60).toFixed(1)}s` : 'grab the pickup'];
  }

  protected override drawHud(ctx: CanvasRenderingContext2D): void {
    super.drawHud(ctx);
    drawBar(ctx, 4, 16, 80, 4, this.boost / BOOST_TICKS, ACCENT);
  }
}

export const powerup: Demo = {
  id: 'powerup',
  title: 'Powerup',
  category: 'Items',
  blurb: 'A pickup grants a timed effect, here speed, with a countdown. It returns a moment after the effect ends.',
  controls: BASE_CONTROLS,
  create: () => new PowerupScene(LEVEL),
};
```

- [ ] **Step 4: keys and doors**

`src/demos/keys-and-doors.ts`:

```ts
import { TILE } from '../engine/constants';
import { Pickup } from '../engine/entities/pickup';
import type { Rect, Vec } from '../engine/geom';
import { overlaps } from '../engine/geom';
import { drawKey } from '../engine/renderer';
import { BaseScene, type Entity } from '../engine/scene';
import { setTile, touchesKind } from '../engine/tilemap';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#f2e26a';

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................k...............#',
  '#.....................####.............#',
  '#..........................d.......*...#',
  '#..@.......................d...........#',
  '#..........................d...........#',
  '########################################',
  '########################################',
];

class KeyItem implements Entity {
  rect: Rect;
  dead = false;

  constructor(cell: Vec, private readonly onTake: () => void) {
    this.rect = { x: cell.x + 3, y: cell.y + 5, w: 10, h: 6 };
  }

  update(scene: BaseScene): void {
    if (overlaps(this.rect, scene.player.body)) { this.dead = true; this.onTake(); }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawKey(ctx, this.rect.x + 5, this.rect.y + 3);
  }
}

export class KeyDoorScene extends BaseScene {
  hasKey = false;
  opened = false;
  won = false;

  constructor(rows: readonly string[]) {
    super(rows, { accent: ACCENT });
    for (const k of this.level.keys) this.entities.push(new KeyItem(k, () => { this.hasKey = true; }));
    for (const g of this.level.pickups) this.entities.push(new Pickup(g, () => { this.won = true; }, ACCENT));
  }

  protected override afterUpdate(): void {
    if (this.hasKey && !this.opened) {
      const b = this.player.body;
      if (touchesKind(this.level, { x: b.x - 1, y: b.y, w: b.w + 2, h: b.h }, 'door')) {
        for (const d of this.level.doors) setTile(this.level, d.x / TILE, d.y / TILE, 'empty');
        this.opened = true;
      }
    }
    this.hud = [this.won ? 'You made it! R to reset' : this.hasKey ? 'key: yes — walk into the door' : 'key: no — find it first'];
  }

  protected override drawHud(ctx: CanvasRenderingContext2D): void {
    super.drawHud(ctx);
    if (this.hasKey && !this.opened) drawKey(ctx, 10, 20);
  }
}

export const keysAndDoors: Demo = {
  id: 'keys-and-doors',
  title: 'Keys and doors',
  category: 'World',
  blurb: 'The door is solid until you bring the key to it. Then it is gone and the goal is reachable.',
  controls: BASE_CONTROLS,
  create: () => new KeyDoorScene(LEVEL),
};
```

- [ ] **Step 5: register and test**

Add `collectibles,`, `powerup,`, `keysAndDoors,` to the catalogue after `checkpoint,`.

Run: `pnpm test && pnpm typecheck`
Expected: pass.

- [ ] **Step 6: hand-check and commit**

`pnpm dev`: the boosted player turns pink and the bar drains; the key shows in the HUD until the door opens; the coin counter ends with the message.

```bash
git add src/demos test/demos-items.test.ts
git commit -m "Demos: collectibles, timed powerup, keys and doors"
```

---

### Task 16: World demos — one-way platforms, moving platforms, parallax scroll

**Files:**
- Create: `src/demos/one-way.ts`, `src/demos/moving-platforms.ts`, `src/demos/parallax.ts`
- Modify: `src/demos/index.ts`
- Test: `test/demos-world.test.ts`

**Interfaces:**
- Consumes: `MovingPlatform`, `drawBackdrop`, `touchesKind`, `Player.dropThrough`.
- Produces: `oneWay`, `movingPlatforms`, `parallax` demos; `OneWayPlayer` exported for tests.

- [ ] **Step 1: failing tests**

`test/demos-world.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { OneWayPlayer } from '../src/demos/one-way';
import { parallax } from '../src/demos/parallax';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';
import { stubContext } from './stub-context';

const PLANKS = [
  '########',
  '#......#',
  '#......#',
  '#.---..#',
  '#......#',
  '#@.....#',
  '########',
];

function step(scene: BaseScene, input: Input, held: Action[] = []): void {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick();
  scene.update(input);
}

describe('one-way platforms', () => {
  it('jumps up through a plank and lands on it', () => {
    const s = new BaseScene(PLANKS, { player: spawn => new OneWayPlayer(spawn) });
    const input = new Input();
    for (let i = 0; i < 12; i++) step(s, input, ['right']);
    step(s, input, ['jump']);
    for (let i = 0; i < 70; i++) step(s, input);
    expect(s.player.body.y).toBe(48 - 14);
    expect(s.player.contacts.onGround).toBe(true);
  });

  it('drops through with down + jump', () => {
    const s = new BaseScene(PLANKS, { player: spawn => new OneWayPlayer(spawn) });
    s.player.moveTo({ x: 32, y: 32 });
    const input = new Input();
    step(s, input);
    step(s, input);
    expect(s.player.contacts.onGround).toBe(true);
    step(s, input, ['down', 'jump']);
    for (let i = 0; i < 30; i++) step(s, input);
    expect(s.player.body.y).toBe(80 - 14);
  });
});

describe('parallax', () => {
  it('draws two backdrop layers behind the level', () => {
    const scene = parallax.create();
    const ctx = stubContext();
    scene.draw(ctx, scene.camera);
    expect(ctx.calls.filter(c => c === 'translate').length).toBeGreaterThanOrEqual(3);
  });
});
```

Run: `pnpm test demos-world`
Expected: FAIL, modules missing.

- [ ] **Step 2: one-way platforms**

`src/demos/one-way.ts`:

```ts
import { Player } from '../engine/entities/player';
import type { Input } from '../engine/input';
import { BaseScene } from '../engine/scene';
import { touchesKind } from '../engine/tilemap';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#8a7a55';
const DROP_TICKS = 10;

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......------------.....------------...#',
  '#......................................#',
  '#..------------.....------------.......#',
  '#......................................#',
  '#......------------.....------------...#',
  '#......................................#',
  '#..@...------------.....------------...#',
  '#......................................#',
  '########################################',
  '########################################',
];

export class OneWayPlayer extends Player {
  private drop = 0;

  protected override control(scene: BaseScene, input: Input): void {
    if (this.drop > 0) this.drop--;
    const b = this.body;
    const onPlank = this.contacts.onGround && touchesKind(scene.level, { x: b.x, y: b.y + b.h, w: b.w, h: 1 }, 'oneway');
    if (onPlank && input.held('down') && input.pressed('jump')) this.drop = DROP_TICKS;
    this.dropThrough = this.drop > 0;
    super.control(scene, input);
  }

  protected override canJump(): boolean {
    return this.drop === 0 && super.canJump();
  }
}

class OneWayScene extends BaseScene {
  protected override afterUpdate(): void {
    this.hud = ['jump up through the planks; ↓ + jump to drop down'];
  }
}

export const oneWay: Demo = {
  id: 'one-way',
  title: 'One-way platforms',
  category: 'World',
  blurb: 'Planks you can jump up through and stand on. Hold down and jump to drop through.',
  controls: [...BASE_CONTROLS, '↓ + jump: drop through'],
  create: () => new OneWayScene(LEVEL, { accent: ACCENT, player: spawn => new OneWayPlayer(spawn) }),
};
```

- [ ] **Step 3: moving platforms**

`src/demos/moving-platforms.ts`:

```ts
import { MovingPlatform } from '../engine/entities/moving-platform';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#8a7a55';

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..................................#####',
  '#..@...................................#',
  '#......................................#',
  '######^^^^^^^^^^#######^^^^^^^^^^^^^####',
  '########################################',
];

class MovingPlatformScene extends BaseScene {
  falls = 0;

  constructor(rows: readonly string[]) {
    super(rows, { accent: ACCENT });
    this.entities.push(new MovingPlatform({ x: 96, y: 144 }, { x: 160, y: 144 }, 48, 150));
    this.entities.push(new MovingPlatform({ x: 376, y: 150 }, { x: 500, y: 100 }, 48, 180));
  }

  protected override afterUpdate(): void {
    if (this.hurtByHazard()) { this.falls++; this.respawn(); }
    this.hud = [`falls ${this.falls}`, 'the platform carries you; jump off whenever'];
  }
}

export const movingPlatforms: Demo = {
  id: 'moving-platforms',
  title: 'Moving platforms',
  category: 'World',
  blurb: 'Platforms that glide sideways and diagonally, carrying whoever stands on them.',
  controls: BASE_CONTROLS,
  create: () => new MovingPlatformScene(LEVEL),
};
```

- [ ] **Step 4: parallax**

`src/demos/parallax.ts`:

```ts
import type { Camera } from '../engine/camera';
import { drawBackdrop, PALETTE } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#1c2440';

const LEVEL = [
  '################################################################################',
  '#..............................................................................#',
  '#..............................................................................#',
  '#..............................................................................#',
  '#..............................................................................#',
  '#..............................................................................#',
  '#..............................................................................#',
  '#..........####..............####....................####..........####........#',
  '#..@...........................................................................#',
  '#..............................................................................#',
  '################################################################################',
  '################################################################################',
];

class ParallaxScene extends BaseScene {
  protected override drawBackground(ctx: CanvasRenderingContext2D, camera: Camera): void {
    drawBackdrop(ctx, camera, 0.3, PALETTE.backdropFar, 1);
    drawBackdrop(ctx, camera, 0.6, PALETTE.backdropNear, 2);
  }

  protected override afterUpdate(): void {
    this.hud = [`camera x ${Math.round(this.camera.x)}`, 'far layer scrolls at 0.3x, near at 0.6x, ground at 1x'];
  }
}

export const parallax: Demo = {
  id: 'parallax',
  title: 'Parallax scroll',
  category: 'World',
  blurb: 'Two background layers scroll slower than the ground, which is what makes a flat picture feel deep.',
  controls: BASE_CONTROLS,
  create: () => new ParallaxScene(LEVEL, { accent: ACCENT }),
};
```

- [ ] **Step 5: register, order the catalogue, test**

Replace the catalogue array in `src/demos/index.ts` with the final menu order:

```ts
export const catalogue: readonly Demo[] = [
  // Movement
  runAndJump, doubleJump, wallClimb, dash, coyoteBuffer, variableJump,
  // Combat
  rangedWeapon, meleeAttack, hitPoints, enemyPatrol,
  // Items
  powerup, collectibles, checkpoint,
  // World
  parallax, movingPlatforms, oneWay, hazards, keysAndDoors,
];
```

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: all pass; the catalogue smoke test lists 18 demos.

- [ ] **Step 6: hand-check and commit**

`pnpm dev`: the menu shows four groups with 6/4/3/5 cards. Parallax layers visibly lag the ground. Platforms carry you. Down+jump drops through a plank.

```bash
git add src/demos test/demos-world.test.ts
git commit -m "Demos: one-way platforms, moving platforms, parallax; final menu order"
```

---

### Task 17: Deploy script and release check

**Files:**
- Create: `scripts/deploy.sh`
- Modify: `README.md` (only if anything above changed the commands)

- [ ] **Step 1: deploy script**

`scripts/deploy.sh`:

```bash
#!/usr/bin/env bash
# Build and publish the sampler to static.tippet.net.
# This is the ONLY file in the repo that knows the host. The build itself is
# host-independent (relative asset URLs, hash routing); see README.md.
#
# static-web0 (CT 318) is plain nginx over /srv/static, group staticpub with
# the setgid bit, reachable as root over the operator key from dev0. Auth is
# entirely at edge0 (SSO), so nothing here needs a credential of its own.
set -euo pipefail
cd "$(dirname "$0")/.."

HOST="${MECHANICS_HOST:-root@10.180.1.108}"
DEST="${MECHANICS_DEST:-/srv/static/mechanics/}"
URL_PATH="${MECHANICS_URL_PATH:-/mechanics/}"

pnpm build
test -f dist/index.html

# --chmod keeps files group-writable like the rest of /srv/static; setgid on
# the directory makes them staticpub-owned regardless of who wrote them.
rsync -a --delete --chmod=Dg+s,ug+rw,o+rX dist/ "$HOST:$DEST"

# Verify from inside the box: gw0 only lets edge0 reach nginx on :80.
code=$(ssh "$HOST" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1$URL_PATH")
if [ "$code" != "200" ]; then
  echo "deploy verify failed: nginx returned $code for $URL_PATH" >&2
  exit 1
fi
echo "published: https://static.tippet.net$URL_PATH ($(git rev-parse --short HEAD))"
```

Run: `chmod +x scripts/deploy.sh && bash -n scripts/deploy.sh`
Expected: no output (syntax ok).

- [ ] **Step 2: full verification before the first publish**

Run: `pnpm test && pnpm typecheck && pnpm build && grep -c 'src="./assets/' dist/index.html`
Expected: all green; the grep prints `1` (relative base).

Run: `pnpm preview` and open the printed URL, then every one of the 18 demos in order. For each: it loads, control hints are correct, R resets, Escape returns. Also open `http://localhost:4173/#/no-such-demo` and confirm the menu shows.

- [ ] **Step 3: publish**

Run: `scripts/deploy.sh`
Expected: ends with `published: https://static.tippet.net/mechanics/ (<sha>)`. Open that URL in a browser (SSO login) and click through three demos, including one on a phone if one is handy (touch bar appears).

- [ ] **Step 4: commit and push**

```bash
git add scripts/deploy.sh README.md
git commit -m "Deploy script for static.tippet.net; first publish"
git push origin main
```

Then confirm the Forge run for that push is green (Homelab can read the run state if the UI is not handy).

---

## Self-review notes

- **Spec coverage.** Shell/routing → Task 10. Engine modules → Tasks 2–8. Demo contract and catalogue → Task 9. All 18 demos → Tasks 9, 11–16 (6 Movement, 4 Combat, 3 Items, 5 World). Touch → Task 10. Testing (tilemap, physics, input, camera, catalogue smoke with stub draw) → Tasks 2–5, 9. CI → Task 1. Deploy → Task 17. Error handling (parse errors with row/col, update/draw crash overlay, narrow viewport scale 1) → Tasks 2, 10.
- **Spec deviation, recorded in the spec.** `|` climbable tiles are solid (you cling to their side); the spec table was amended on 2026-09-26 before this plan was written.
- **Type consistency.** `moveBody(level, body, opts)` returns `Contacts`; `Player.contacts` is replaced each tick by `integrate`, and `MovingPlatform` replaces it with a spread copy rather than mutating `NO_CONTACTS`. `BaseScene.afterUpdate(input)` always receives the `Input`; demos that ignore it declare no parameter. `Respawner.update()` returns the touch boolean and is called once per tick by every scene that owns one.
- **Review Focus mapping.** (1) blur → Task 4 test; (2) preventDefault → Task 4 test; (3) catch-up cap → Task 5 test; (4) tunnel → Task 3 test; (5) narrow phone → Task 10 test.
