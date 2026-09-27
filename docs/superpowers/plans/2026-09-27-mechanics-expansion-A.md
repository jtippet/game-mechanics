# Mechanics Expansion A — engine extensions, menu regroup, platforms, surfaces, hazards

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the engine (new tile kinds, solid platform base class, obstacles, chutes, portals, levers), regroup the menu into six groups, and add the ten platform/surface/hazard demos: crumbling-platforms, interval-platforms, ice-and-sand, conveyor-belts, slides, portals, levers, landmines, flame-jets, rolling-rocks. Plan B (separate file) adds combat, abilities, and items.

**Architecture:** Same as v1: `src/engine/` stays demo-agnostic and unit-tested; each demo is one file plus one catalogue line; `test/catalogue.test.ts` (600-tick smoke) and `test/levels.test.ts` (reachability) gate every demo. New engine pieces: tile kinds `ice/sand/beltR/beltL/ladder` and marker arrays on `Level`; `surfaceUnder`; `PlatformBody` (base of `MovingPlatform`, `CrumblingPlatform`, `IntervalPlatform`); `Explosion`; `HpPlayer`/`HpScene` promoted into the engine with `armor`; `RollingRock`, `FlameJet`, `Chute`, `Portal`, `Lever`.

**Tech Stack:** TypeScript 5.9, Vite 8, Vitest 5, pnpm, Canvas 2D. Zero runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-09-27-mechanics-expansion-design.md` (binding), on top of `docs/superpowers/specs/2026-09-26-mechanics-sampler-design.md`.

## Global Constraints

- Zero runtime dependencies; no framework; procedural art only; palette and shapes in `src/engine/renderer.ts`; one accent per demo.
- Every level literal: equal-length rows (40 chars unless the task says otherwise); a base jump (230 px/s) rises ~42 px, so any rise a player must make by a base jump is ≤ 2 tiles and ≤ 3 cells across (2 when rising 2). `test/levels.test.ts` enforces pickups/keys reachability; a demo that changes jump physics says so.
- A scene that respawns the player resets every piece of demo-specific player state it owns. Combat/hazard demos extend `HpScene` (hearts) rather than respawning on touch.
- Every demo that uses `act`, `up`, or `down` declares `touch: [{ action, label }]` with a plain-word label (`TOUCH_BASE` gives ◀ ▶ JUMP). The touch overlay itself already exists in `src/shell/touch.ts`.
- `Player.contacts` is never mutated in place (replace with a spread copy). `Player.control()` reads `controlLock` before decrementing (a lock of N lasts N ticks).
- Tests are Node-only vitest under `test/`; `test/stub-context.ts` stands in for the canvas. Never commit with a failing test. Run `pnpm test && pnpm typecheck && pnpm build` before each commit.
- Git: plain `git add` + `git commit -m`; never reset/rebase/amend; commit messages end with a blank line and `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Category names are exactly `'Movement' | 'Combat' | 'Items' | 'Platforms and surfaces' | 'Hazards and obstacles' | 'World'`, in that order.

## Review Focus

1. A player standing on a platform that stops being solid must start falling on the next tick, never hang in the air. Test in Task 3.
2. A conveyor must not push the player through a wall: the belt shift is applied through `moveBody`, not as a raw position add. Test in Task 6.
3. Portals must not ping-pong: after a teleport, no pad triggers for 30 ticks. Test in Task 8.
4. An explosion must damage the player at most once per explosion even if it lasts 20 ticks. Test in Task 4.
5. A rock pinning the player against a wall must be detected as a crush on that tick, not resolved by tunnelling the player into the wall. Test in Task 9.

---

### Task 1: Tile kinds, markers, surfaces

**Files:**
- Modify: `src/engine/tilemap.ts`, `src/engine/physics.ts`, `src/engine/renderer.ts`, `src/engine/entities/patroller.ts`, `test/levels.test.ts`
- Test: `test/tilemap.test.ts` (extend), `test/physics.test.ts` (extend)

**Interfaces:**
- Produces: `TileKind` adds `'ice' | 'sand' | 'beltR' | 'beltL' | 'ladder'`; `Level` adds `levers: Vec[]`, `portals: Array<{ id: 'P' | 'Q'; x: number; y: number }>`, `slides: Vec[]`, `mines: Vec[]`, `jets: Vec[]`, `rocks: Vec[]`, `turrets: Vec[]`; `isSolidKind(kind)` exported from physics.ts; `surfaceUnder(level, body): TileKind | null`; `drawLevel(ctx, level, camera, ticks = 0)`; `PALETTE` gains `ice, iceSheen, sand, sandDot, belt, beltChevron, ladder`.

- [ ] **Step 1: failing tests**

Append to `test/tilemap.test.ts`:

```ts
describe('expansion tiles and markers', () => {
  const ROWS = [
    '##########',
    '#L..P..Q.#',
    '#~.M.F.R.#',
    '#H..T..P.#',
    '#@.......#',
    '#is><.Q..#',
    '##########',
  ];
  it('parses the new kinds and records every marker in pixels', () => {
    const l = parseLevel(ROWS);
    expect(tileAt(l, 1, 5)).toBe('ice');
    expect(tileAt(l, 2, 5)).toBe('sand');
    expect(tileAt(l, 3, 5)).toBe('beltR');
    expect(tileAt(l, 4, 5)).toBe('beltL');
    expect(tileAt(l, 1, 3)).toBe('ladder');
    expect(l.levers).toEqual([{ x: 16, y: 16 }]);
    expect(l.portals).toEqual([{ id: 'P', x: 64, y: 16 }, { id: 'Q', x: 112, y: 16 }, { id: 'P', x: 112, y: 48 }, { id: 'Q', x: 96, y: 80 }]);
    expect(l.slides).toEqual([{ x: 16, y: 32 }]);
    expect(l.mines).toEqual([{ x: 48, y: 32 }]);
    expect(l.jets).toEqual([{ x: 80, y: 32 }]);
    expect(l.rocks).toEqual([{ x: 112, y: 32 }]);
    expect(l.turrets).toEqual([{ x: 64, y: 48 }]);
    for (const c of [1, 4, 7]) expect(tileAt(l, c, 1)).toBe('empty');
  });
  it('surfaceUnder names the tile under the feet, by the widest overlap', () => {
    const l = parseLevel(ROWS);
    expect(surfaceUnder(l, { x: 17, y: 66, w: 12, h: 14 })).toBe('ice');        // fully over col 1
    expect(surfaceUnder(l, { x: 26, y: 66, w: 12, h: 14 })).toBe('sand');       // 6 px on ice, 6 on sand → later column wins ties? no: 26..38 → 6 px ice (26..32), 6 px sand (32..38): tie → first (ice)
    expect(surfaceUnder(l, { x: 28, y: 66, w: 12, h: 14 })).toBe('sand');       // 4 px ice, 8 px sand
    expect(surfaceUnder(l, { x: 17, y: 40, w: 12, h: 14 })).toBe(null);        // in the air
  });
});
```

Fix the tie case before running: the second `surfaceUnder` line above documents a tie; change its expectation to `'ice'` (first column wins a tie) so the test states one rule.

Append to `test/physics.test.ts`:

```ts
describe('expansion solidity', () => {
  it('ice, sand and belts are solid; ladders are not', () => {
    const l = parseLevel(['########', '#......#', '#..H...#', '#@is><.#', '########']);
    expect(isSolidKind('ice')).toBe(true);
    expect(isSolidKind('sand')).toBe(true);
    expect(isSolidKind('beltR')).toBe(true);
    expect(isSolidKind('beltL')).toBe(true);
    expect(isSolidKind('ladder')).toBe(false);
    const b = { x: 34, y: 30, w: 12, h: 14, vx: 0, vy: 300 };
    for (let i = 0; i < 20; i++) { b.vy = 300; moveBody(l, b); }
    expect(b.y).toBe(48 - 14);                       // landed on the ice at row 3
    const up = { x: 50, y: 40, w: 12, h: 14, vx: 0, vy: -100 };
    moveBody(l, up);
    expect(up.vy).toBe(-100);                        // ladder cell did not block
  });
});
```

Add the imports (`surfaceUnder` in tilemap.test, `isSolidKind` and `parseLevel` in physics.test). Run: `pnpm test tilemap physics` — expected FAIL (missing exports / unknown tile).

- [ ] **Step 2: tilemap**

In `src/engine/tilemap.ts`:

```ts
export type TileKind = 'empty' | 'solid' | 'oneway' | 'spike' | 'climb' | 'door' | 'ice' | 'sand' | 'beltR' | 'beltL' | 'ladder';

export interface PortalMarker { id: 'P' | 'Q'; x: number; y: number }

export interface Level {
  cols: number; rows: number; tiles: TileKind[];
  spawn: Vec; pickups: Vec[]; keys: Vec[]; doors: Vec[];
  levers: Vec[]; portals: PortalMarker[]; slides: Vec[]; mines: Vec[]; jets: Vec[]; rocks: Vec[]; turrets: Vec[];
  pixelWidth: number; pixelHeight: number;
}

const CHARS: Record<string, TileKind> = {
  '.': 'empty', '#': 'solid', '-': 'oneway', '^': 'spike', '|': 'climb', 'd': 'door',
  'i': 'ice', 's': 'sand', '>': 'beltR', '<': 'beltL', 'H': 'ladder',
  '@': 'empty', '*': 'empty', 'k': 'empty',
  'L': 'empty', 'P': 'empty', 'Q': 'empty', '~': 'empty', 'M': 'empty', 'F': 'empty', 'R': 'empty', 'T': 'empty',
};
```

In `parseLevel`, initialise the seven new arrays and add to the marker chain:

```ts
      else if (ch === 'L') levers.push(px);
      else if (ch === 'P' || ch === 'Q') portals.push({ id: ch, x: px.x, y: px.y });
      else if (ch === '~') slides.push(px);
      else if (ch === 'M') mines.push(px);
      else if (ch === 'F') jets.push(px);
      else if (ch === 'R') rocks.push(px);
      else if (ch === 'T') turrets.push(px);
```

and return them. Add:

```ts
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
```

`tilemap.ts` must import `isSolidKind` from `./physics`; physics imports `cellsUnder` from tilemap, so make the physics import in tilemap.ts `import { isSolidKind } from './physics';` — a runtime cycle is fine here because both are used inside functions, not at module top level. If Vite or vitest complains about the cycle, move `isSolidKind` into `src/engine/tile-solidity.ts` (exporting it from both physics.ts and tilemap.ts) and say so in the report.

- [ ] **Step 3: physics and patroller**

`src/engine/physics.ts`: replace the private `blocks` with an exported

```ts
export function isSolidKind(k: TileKind): boolean {
  return k === 'solid' || k === 'door' || k === 'climb' || k === 'ice' || k === 'sand' || k === 'beltR' || k === 'beltL';
}
const blocks = isSolidKind;
```

`src/engine/entities/patroller.ts`: the ledge probe's floor list becomes `isSolidKind(k.kind) || k.kind === 'oneway'`.

`test/levels.test.ts`: `FLOOR` becomes `['solid', 'oneway', 'climb', 'ice', 'sand', 'beltR', 'beltL']`; `PASSABLE` adds `'ladder'`.

- [ ] **Step 4: renderer**

`PALETTE` additions: `ice: '#8fd3ff', iceSheen: '#d9f2ff', sand: '#c9b27a', sandDot: '#a8915a', belt: '#2a2f3d', beltChevron: '#6b7590', ladder: '#b08a5a'`.

`drawLevel(ctx, level, camera, ticks = 0)` cases:

```ts
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
        case 'ladder':
          ctx.fillStyle = PALETTE.ladder;
          ctx.fillRect(x + 3, y, 2, TILE); ctx.fillRect(x + 11, y, 2, TILE);
          ctx.fillRect(x + 5, y + 4, 6, 1); ctx.fillRect(x + 5, y + 12, 6, 1);
          break;
```

(`kind` is the result of `tileAt(level, col, row)`; bind it to a const before the switch.) `BaseScene.draw` passes `this.ticks` as the fourth argument.

- [ ] **Step 5: run, commit**

`pnpm test && pnpm typecheck && pnpm build`. Commit: `Engine: ice, sand, belt and ladder tiles; expansion markers; surfaceUnder`.

---

### Task 2: Six menu groups

**Files:**
- Modify: `src/demos/demo.ts`, `src/demos/index.ts`, `src/demos/moving-platforms.ts`, `src/demos/one-way.ts`, `src/demos/hazards.ts`
- Test: `test/catalogue.test.ts` (extend)

**Interfaces:**
- Produces: `Category` union of the six names; `CATEGORIES` in menu order; the catalogue array in the spec's order with placeholder comments for the demos later tasks add.

- [ ] **Step 1: failing test** — append to `test/catalogue.test.ts`:

```ts
  it('has the six groups in order and each existing demo in its spec group', () => {
    expect(CATEGORIES).toEqual(['Movement', 'Combat', 'Items', 'Platforms and surfaces', 'Hazards and obstacles', 'World']);
    const cat = (id: string) => catalogue.find(d => d.id === id)?.category;
    expect(cat('moving-platforms')).toBe('Platforms and surfaces');
    expect(cat('one-way')).toBe('Platforms and surfaces');
    expect(cat('hazards')).toBe('Hazards and obstacles');
    expect(cat('parallax')).toBe('World');
    expect(cat('keys-and-doors')).toBe('World');
    // menu order follows group order
    const groupIndex = catalogue.map(d => CATEGORIES.indexOf(d.category));
    expect([...groupIndex].sort((a, b) => a - b)).toEqual(groupIndex);
  });
```

- [ ] **Step 2: implement** — `demo.ts`: `export type Category = 'Movement' | 'Combat' | 'Items' | 'Platforms and surfaces' | 'Hazards and obstacles' | 'World'; export const CATEGORIES: readonly Category[] = [...]` in that order. Update the three demos' `category`. Rewrite the catalogue array:

```ts
export const catalogue: readonly Demo[] = [
  // Movement
  runAndJump, doubleJump, wallClimb, dash, coyoteBuffer, variableJump,
  // Combat
  rangedWeapon, meleeAttack, hitPoints, enemyPatrol,
  // Items
  powerup, collectibles, checkpoint,
  // Platforms and surfaces
  movingPlatforms, oneWay,
  // Hazards and obstacles
  hazards,
  // World
  parallax, keysAndDoors,
];
```

- [ ] **Step 3: run, commit** — `pnpm test && pnpm typecheck`. Commit: `Menu: six groups; platforms and hazards regrouped`.

---

### Task 3: PlatformBody, CrumblingPlatform, IntervalPlatform

**Files:**
- Create: `src/engine/entities/platform-body.ts`, `src/engine/entities/crumbling-platform.ts`, `src/engine/entities/interval-platform.ts`
- Modify: `src/engine/entities/moving-platform.ts`
- Test: `test/platforms.test.ts`; `test/entities.test.ts` must stay green unchanged

**Interfaces:**
- Produces: `abstract class PlatformBody { rect; solid; visible; riding; protected abstract move(scene): void; update(scene); draw(ctx) }`; `MovingPlatform(from, to, w?, period?)` unchanged; `CrumblingPlatform(cell: Vec, w: number, kind: 'fall' | 'fade')` with `state: 'idle' | 'going' | 'gone'`; `IntervalPlatform(cell: Vec, w: number, onTicks: number, offTicks: number, phase = 0)`.

- [ ] **Step 1: failing tests** — `test/platforms.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CrumblingPlatform } from '../src/engine/entities/crumbling-platform';
import { IntervalPlatform } from '../src/engine/entities/interval-platform';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';

const ROOM = [
  '############',
  '#..........#',
  '#..........#',
  '#..........#',
  '#..........#',
  '#@.........#',
  '############',
];
const idle = (s: BaseScene, n: number): void => { const i = new Input(); for (let k = 0; k < n; k++) { i.tick(); s.update(i); } };

describe('CrumblingPlatform', () => {
  it('falls after 30 ticks of standing, the rider falls with it, and it returns 180 ticks after leaving', () => {
    const s = new BaseScene(ROOM);
    const p = new CrumblingPlatform({ x: 64, y: 48 }, 32, 'fall');
    s.entities.push(p);
    s.player.moveTo({ x: 64, y: 32 });        // standing on its top edge (y 48)
    idle(s, 5);
    expect(p.riding).toBe(true);
    expect(p.state).toBe('idle');
    idle(s, 30);
    expect(p.state).toBe('going');
    const y0 = p.rect.y;
    idle(s, 10);
    expect(p.rect.y).toBeGreaterThan(y0);
    expect(s.player.body.y).toBe(p.rect.y - 14);   // riding it down
    idle(s, 120);
    expect(p.state).toBe('gone');
    expect(p.solid).toBe(false);
    idle(s, 200);
    expect(p.state).toBe('idle');
    expect(p.rect).toMatchObject({ x: 64, y: 48 });
  });

  it('fades: blinks then stops being solid and the rider drops', () => {
    const s = new BaseScene(ROOM);
    const p = new CrumblingPlatform({ x: 64, y: 48 }, 32, 'fade');
    s.entities.push(p);
    s.player.moveTo({ x: 64, y: 32 });
    idle(s, 35);
    expect(p.state).toBe('going');
    idle(s, 25);
    expect(p.state).toBe('gone');
    expect(p.solid).toBe(false);
    idle(s, 2);
    expect(s.player.body.y).toBeGreaterThan(34);    // started falling
  });
});

describe('IntervalPlatform', () => {
  it('is solid for on ticks then off, and a rider drops when it goes', () => {
    const s = new BaseScene(ROOM);
    const p = new IntervalPlatform({ x: 64, y: 48 }, 32, 60, 30);
    s.entities.push(p);
    s.player.moveTo({ x: 64, y: 32 });
    idle(s, 10);
    expect(p.solid).toBe(true);
    expect(p.riding).toBe(true);
    idle(s, 55);
    expect(p.solid).toBe(false);
    expect(p.visible).toBe(false);
    idle(s, 3);
    expect(s.player.body.y).toBeGreaterThan(34);
    idle(s, 30);
    expect(p.solid).toBe(true);
  });
});
```

Run: `pnpm test platforms` — FAIL (missing modules).

- [ ] **Step 2: PlatformBody** — `src/engine/entities/platform-body.ts`:

```ts
import type { Rect } from '../geom';
import { drawPlank } from '../renderer';
import type { BaseScene, Entity } from '../scene';

/**
 * A solid rectangle the player can stand on. Subclasses move it (or change
 * `solid`/`visible`) in `move()`; this class keeps a riding player glued to
 * the top and catches one landing from above — exactly the logic that lived
 * in MovingPlatform. A non-solid platform neither carries nor catches.
 */
export abstract class PlatformBody implements Entity {
  rect: Rect;
  solid = true;
  visible = true;
  riding = false;
  dead = false;

  constructor(rect: Rect) { this.rect = rect; }

  protected abstract move(scene: BaseScene): void;

  update(scene: BaseScene): void {
    const prevX = this.rect.x;
    const prevTop = this.rect.y;
    this.move(scene);
    if (!this.solid) { this.riding = false; return; }
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
    if (this.visible) drawPlank(ctx, this.rect);
  }
}
```

`MovingPlatform` becomes:

```ts
export class MovingPlatform extends PlatformBody {
  private t = 0;
  constructor(private readonly from: Vec, private readonly to: Vec, w = 48, private readonly period = 180) {
    super({ x: from.x, y: from.y, w, h: 6 });
  }
  protected override move(): void {
    this.t = (this.t + 1) % (this.period * 2);
    const u = this.t < this.period ? this.t / this.period : 2 - this.t / this.period;
    this.rect.x = this.from.x + (this.to.x - this.from.x) * u;
    this.rect.y = this.from.y + (this.to.y - this.from.y) * u;
  }
}
```

(`riding` and `rect` stay public; `test/entities.test.ts` must pass unchanged.)

- [ ] **Step 3: CrumblingPlatform**

```ts
import { DT } from '../constants';
import type { Vec } from '../geom';
import { PALETTE } from '../renderer';
import type { BaseScene } from '../scene';
import { PlatformBody } from './platform-body';

const STAND_TICKS = 30;
const FADE_TICKS = 20;
const RETURN_TICKS = 180;

/** Gives way a moment after someone stands on it: 'fall' drops under gravity, 'fade' blinks out. Returns later. */
export class CrumblingPlatform extends PlatformBody {
  state: 'idle' | 'going' | 'gone' = 'idle';
  private stood = 0;
  private going = 0;
  private goneAt = 0;
  private vy = 0;

  constructor(private readonly home: Vec, w: number, readonly kind: 'fall' | 'fade') {
    super({ x: home.x, y: home.y, w, h: 6 });
  }

  protected override move(scene: BaseScene): void {
    switch (this.state) {
      case 'idle':
        this.stood = this.riding ? this.stood + 1 : 0;
        if (this.stood >= STAND_TICKS) { this.state = 'going'; this.going = 0; }
        break;
      case 'going':
        this.going++;
        if (this.kind === 'fall') {
          this.vy += 600 * DT;
          this.rect.y += this.vy * DT;
          if (this.rect.y > scene.level.pixelHeight) this.vanish(scene);
        } else {
          this.visible = ((this.going >> 2) & 1) === 0;
          if (this.going >= FADE_TICKS) this.vanish(scene);
        }
        break;
      case 'gone':
        if (scene.ticks - this.goneAt >= RETURN_TICKS) {
          this.state = 'idle';
          this.rect.x = this.home.x; this.rect.y = this.home.y;
          this.solid = true; this.visible = true; this.stood = 0; this.vy = 0;
        }
        break;
    }
  }

  private vanish(scene: BaseScene): void {
    this.state = 'gone';
    this.solid = false;
    this.visible = false;
    this.goneAt = scene.ticks;
  }

  override draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;
    super.draw(ctx);
    if (this.state === 'going' && this.kind === 'fall') {
      ctx.fillStyle = PALETTE.danger;
      ctx.fillRect(this.rect.x, this.rect.y + this.rect.h - 1, this.rect.w, 1);
    }
  }
}
```

- [ ] **Step 4: IntervalPlatform**

```ts
import type { Vec } from '../geom';
import type { BaseScene } from '../scene';
import { PlatformBody } from './platform-body';

const WARN_TICKS = 30;

/** Solid for onTicks, gone for offTicks, forever; blinks through the last WARN_TICKS of the on phase. */
export class IntervalPlatform extends PlatformBody {
  constructor(cell: Vec, w: number, private readonly onTicks: number, private readonly offTicks: number, private readonly phase = 0) {
    super({ x: cell.x, y: cell.y, w, h: 6 });
  }

  protected override move(scene: BaseScene): void {
    const t = (scene.ticks + this.phase) % (this.onTicks + this.offTicks);
    this.solid = t < this.onTicks;
    const warning = this.solid && t >= this.onTicks - WARN_TICKS;
    this.visible = this.solid && (!warning || ((scene.ticks >> 2) & 1) === 0);
  }
}
```

- [ ] **Step 5: run, commit** — `pnpm test && pnpm typecheck`. Trace the crumbling 'fall' test before running: 5 idle ticks land the rider; 30 more → `stood` reaches 30 on the 30th tick and the state flips to `going`. If the count is off by one, adjust the test's tick counts, not `STAND_TICKS`. Commit: `Engine: PlatformBody base; crumbling and interval platforms`.

---

### Task 4: HpPlayer and HpScene move into the engine, with armor; Explosion entity

**Files:**
- Create: `src/engine/entities/hp-player.ts`, `src/engine/hp-scene.ts`, `src/engine/entities/explosion.ts`
- Modify: `src/demos/hit-points.ts` (becomes a thin subclass), `test/demos-damage.test.ts` (imports), `src/engine/entities/player.ts` (add `noJump`)
- Test: `test/hp.test.ts`, `test/explosion.test.ts`

**Interfaces:**
- Produces:
  - `class HpPlayer extends Player { hp; invuln; armor; readonly maxHp; constructor(spawn, maxHp = 3); hurt(fromX): boolean }` — with `armor > 0` a hit consumes one armor (invulnerability and flicker still apply, no heart lost, no knockback) and returns true.
  - `class HpScene extends BaseScene { deaths; dying; readonly hp: HpPlayer; constructor(rows, opts?: SceneOptions & { maxHp?: number }); protected damage(fromX): boolean; protected tickDying(): boolean; protected onRespawn(): void; drawHud draws hearts at x 20 + i*10, a shield outline after them while armor > 0, then hud lines from y 14 }`. `damage` is a no-op while dying; when hp reaches 0 it starts the 40-tick dying window (controlLock, flicker) and counts a death. `tickDying` must be the first call in a subclass's `afterUpdate`; it returns true while dying (skip damage sources); when the window ends it respawns, restores `hp = maxHp`, `invuln = 0`, `armor = 0`, `flicker = false`, and calls `onRespawn()`.
  - `Player.noJump = false` — when true, `control()` ignores jump presses (chutes use it).
  - `class Explosion implements Entity { constructor(cx, cy, radius, ticks = 20, color = PALETTE.danger); inRange(rect): boolean; dead }` — draws an expanding ring; applies no damage itself.
- The hit-points demo keeps `HitPointsScene` (exported) with its `Respawner`, spikes, and `jumpSpeed = 290`.

- [ ] **Step 1: failing tests**

`test/hp.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { HpPlayer } from '../src/engine/entities/hp-player';
import { HpScene } from '../src/engine/hp-scene';
import { Input } from '../src/engine/input';
import { stubContext } from './stub-context';

const ROOM = ['############', '#..........#', '#@.........#', '############'];

class Probe extends HpScene {
  hitAt = -1;
  protected override afterUpdate(): void {
    if (this.tickDying()) return;
    if (this.ticks === this.hitAt) this.damage(this.player.body.x + 20);
  }
}
const idle = (s: HpScene, n: number): void => { const i = new Input(); for (let k = 0; k < n; k++) { i.tick(); s.update(i); } };

describe('HpPlayer', () => {
  it('armor absorbs a hit without losing a heart or knockback', () => {
    const p = new HpPlayer({ x: 16, y: 32 });
    p.armor = 1;
    expect(p.hurt(100)).toBe(true);
    expect(p.hp).toBe(3);
    expect(p.armor).toBe(0);
    expect(p.body.vx).toBe(0);
    expect(p.invuln).toBeGreaterThan(0);
    p.invuln = 0;
    expect(p.hurt(100)).toBe(true);
    expect(p.hp).toBe(2);
    expect(p.body.vx).toBeLessThan(0);
  });
});

describe('HpScene', () => {
  it('counts a death at zero hp, respawns after the window with everything reset, and draws hearts', () => {
    const s = new Probe(ROOM, { maxHp: 2 });
    s.hitAt = 3;
    idle(s, 3);
    expect(s.hp.hp).toBe(1);
    s.hp.invuln = 0;
    s.hp.armor = 1;
    s.hitAt = 6;
    idle(s, 3);
    expect(s.hp.hp).toBe(1);                 // armor took it
    s.hp.invuln = 0;
    s.hitAt = 9;
    idle(s, 3);
    expect(s.hp.hp).toBe(0);
    expect(s.deaths).toBe(1);
    expect(s.dying).toBeGreaterThan(0);
    s.hitAt = 12;                            // damage during the window is ignored
    idle(s, 60);
    expect(s.dying).toBe(0);
    expect(s.hp.hp).toBe(2);
    expect(s.hp.armor).toBe(0);
    expect(s.hp.flicker).toBe(false);
    expect(s.player.body.x).toBe(18);
    const ctx = stubContext();
    s.draw(ctx, s.camera);
    expect(ctx.calls.filter(c => c === 'fillRect').length).toBeGreaterThan(2);
  });
});
```

`test/explosion.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Explosion } from '../src/engine/entities/explosion';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';

describe('Explosion', () => {
  it('inRange uses the nearest point of the rect, and the entity dies after its ticks', () => {
    const e = new Explosion(100, 100, 30);
    expect(e.inRange({ x: 120, y: 90, w: 12, h: 14 })).toBe(true);     // nearest point (120,100) is 20 away
    expect(e.inRange({ x: 140, y: 90, w: 12, h: 14 })).toBe(false);    // 40 away
    expect(e.inRange({ x: 60, y: 60, w: 12, h: 14 })).toBe(true);      // corner (72,74): ~38? no → adjust: (100-72, 100-74) = (28,26) → 38.2 > 30 → false
    const s = new BaseScene(['####', '#@.#', '####']);
    s.entities.push(e);
    const i = new Input();
    for (let k = 0; k < 20; k++) { i.tick(); s.update(i); }
    expect(e.dead).toBe(true);
    expect(s.entities).not.toContain(e);
  });
});
```

Fix the third `inRange` expectation to `false` before running (the comment works it out: 38 > 30).

Run: `pnpm test hp explosion` — FAIL (modules missing).

- [ ] **Step 2: Player.noJump** — in `player.ts` add `noJump = false;` and change the jump line to `if (input.pressed('jump') && !this.noJump && this.canJump()) this.jump();`.

- [ ] **Step 3: HpPlayer** — `src/engine/entities/hp-player.ts`:

```ts
import type { Vec } from '../geom';
import type { BaseScene } from '../scene';
import { Player } from './player';

export const INVULN_TICKS = 60;

/** A player with hearts. `hurt()` costs one heart (or one armor), knocks back, and grants invulnerability. */
export class HpPlayer extends Player {
  hp: number;
  invuln = 0;
  armor = 0;

  constructor(spawn: Vec, readonly maxHp = 3) {
    super(spawn);
    this.hp = maxHp;
  }

  hurt(fromX: number): boolean {
    if (this.invuln > 0 || this.hp <= 0) return false;
    this.invuln = INVULN_TICKS;
    this.flicker = true;
    if (this.armor > 0) { this.armor--; return true; }
    this.hp--;
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
```

- [ ] **Step 4: HpScene** — `src/engine/hp-scene.ts`:

```ts
import { HpPlayer } from './entities/hp-player';
import { drawText, PALETTE } from './renderer';
import { BaseScene, type SceneOptions } from './scene';

const DEATH_TICKS = 40;

/** A scene with a hearts player and the shared dying/respawn sequence. Subclasses call tickDying() first in afterUpdate, then damage() from their sources. */
export class HpScene extends BaseScene {
  deaths = 0;
  dying = 0;

  constructor(rows: readonly string[], opts: SceneOptions & { maxHp?: number } = {}) {
    super(rows, { accent: opts.accent ?? PALETTE.danger, player: opts.player ?? (spawn => new HpPlayer(spawn, opts.maxHp ?? 3)) });
  }

  get hp(): HpPlayer { return this.player as HpPlayer; }

  protected damage(fromX: number): boolean {
    if (this.dying > 0) return false;
    const landed = this.hp.hurt(fromX);
    if (this.hp.hp === 0 && this.dying === 0) {
      this.dying = DEATH_TICKS;
      this.deaths++;
      this.hp.controlLock = DEATH_TICKS;
      this.hp.flicker = true;
    }
    return landed;
  }

  protected tickDying(): boolean {
    if (this.dying === 0) return false;
    if (--this.dying === 0) {
      this.respawn();
      this.hp.hp = this.hp.maxHp;
      this.hp.invuln = 0;
      this.hp.armor = 0;
      this.hp.flicker = false;
      this.onRespawn();
    }
    return true;
  }

  protected onRespawn(): void {}

  protected override drawHud(ctx: CanvasRenderingContext2D): void {
    const p = this.hp;
    for (let i = 0; i < p.maxHp; i++) {
      ctx.fillStyle = i < p.hp ? this.accent : PALETTE.climb;
      ctx.fillRect(20 + i * 10, 4, 8, 6);
    }
    if (p.armor > 0) {
      const x = 20 + p.maxHp * 10 + 4;
      ctx.fillStyle = PALETTE.text;
      ctx.fillRect(x, 4, 8, 1); ctx.fillRect(x, 4, 1, 5); ctx.fillRect(x + 7, 4, 1, 5); ctx.fillRect(x + 1, 9, 6, 1); ctx.fillRect(x + 3, 10, 2, 1);
    }
    this.hud.forEach((line, i) => drawText(ctx, line, 20, 14 + i * 10));
  }
}
```

- [ ] **Step 5: Explosion** — `src/engine/entities/explosion.ts`:

```ts
import type { Rect } from '../geom';
import { PALETTE } from '../renderer';
import type { Entity } from '../scene';

/** A blast radius that the owning scene applies damage from on the tick it is created; the entity itself only draws an expanding ring. */
export class Explosion implements Entity {
  dead = false;
  private age = 0;

  constructor(readonly cx: number, readonly cy: number, readonly radius: number, private readonly ticks = 20, private readonly color: string = PALETTE.danger) {}

  inRange(r: Rect): boolean {
    const nx = Math.max(r.x, Math.min(this.cx, r.x + r.w));
    const ny = Math.max(r.y, Math.min(this.cy, r.y + r.h));
    const dx = this.cx - nx;
    const dy = this.cy - ny;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  update(): void {
    if (++this.age >= this.ticks) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const r = this.radius * this.age / this.ticks;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, Math.max(1, r), 0, Math.PI * 2);
    ctx.stroke();
  }
}
```

- [ ] **Step 6: hit-points demo becomes a subclass**

`src/demos/hit-points.ts` keeps `LEVEL`, `SPOTS`, `ACCENT`, and:

```ts
export class HitPointsScene extends HpScene {
  private readonly spawner: Respawner;

  constructor(rows: readonly string[], spots: Spot[] = SPOTS) {
    super(rows, { accent: ACCENT, player: spawn => Object.assign(new HpPlayer(spawn), { jumpSpeed: 290 }) });
    this.spawner = new Respawner(this, spots);
  }

  protected override afterUpdate(): void {
    this.spawner.update();
    if (!this.tickDying()) {
      const b = this.hp.body;
      if (this.hurtByHazard()) this.damage(b.x + b.w / 2 + this.hp.facing);
      for (const e of this.spawner.enemies()) if (overlaps(e.body, b)) this.damage(e.body.x + e.body.w / 2);
    }
    this.hud = [`deaths ${this.deaths}`];
  }
}
```

Remove the old `HpPlayer`/`HpScene`/`MAX_HP` from the demo; `test/demos-damage.test.ts` imports `HitPointsScene` from the demo and `HpPlayer` from `../src/engine/entities/hp-player`, with `MAX_HP` replaced by `p.maxHp`. The 290 jump test stays.

- [ ] **Step 7: run, commit** — `pnpm test && pnpm typecheck`. Commit: `Engine: HpPlayer/HpScene with armor; Explosion; Player.noJump`.

---

### Task 5: Chute, Portal, Lever entities

**Files:**
- Create: `src/engine/entities/chute.ts`, `src/engine/entities/portal.ts`, `src/engine/entities/lever.ts`
- Test: `test/chute-portal-lever.test.ts`

**Interfaces:**
- Produces:
  - `class Chute { active; readonly waypoints: Vec[]; constructor(waypointCells: Vec[], color: string, speed = 120); update(scene); draw(ctx) }` — waypoints are pixel top-left cells; entering the first cell takes control (`player.noJump = true`, `gravity = 0`, `controlLock` kept at 2) and moves the player centre toward each waypoint centre at `speed`; at the last it releases (restores `gravity` and `noJump`) keeping the exit velocity.
  - `class Portal { teleports; constructor(a: Vec, b: Vec, twoWay: boolean, color: string); update(scene); draw(ctx) }` — overlapping pad `a` moves the player to stand on cell `b` (and `b`→`a` when two-way), keeping velocity; 30-tick cooldown after any teleport during which no pad triggers.
  - `class Lever { on = false; constructor(cell: Vec, onToggle: (on: boolean) => void); update(scene, input); draw(ctx) }` — `act` pressed while overlapping the cell toggles.

- [ ] **Step 1: failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { Chute } from '../src/engine/entities/chute';
import { Lever } from '../src/engine/entities/lever';
import { Portal } from '../src/engine/entities/portal';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';

const step = (s: BaseScene, input: Input, held: Action[] = []): void => {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick(); s.update(input);
};
const OPEN = ['####################', '#..................#', '#..................#', '#..................#', '#..................#', '#@.................#', '####################'];

describe('Chute', () => {
  it('carries the player along its waypoints and releases at the end', () => {
    const s = new BaseScene(OPEN);
    const chute = new Chute([{ x: 48, y: 64 }, { x: 128, y: 32 }, { x: 208, y: 64 }], '#fff', 120);
    s.entities.push(chute);
    const input = new Input();
    for (let i = 0; i < 40; i++) step(s, input, ['right']);           // walk into the first cell at x 48..64
    expect(chute.active).toBe(true);
    expect(s.player.noJump).toBe(true);
    for (let i = 0; i < 20; i++) step(s, input, ['jump']);            // jump is ignored while riding
    expect(s.player.body.y).toBeLessThan(64);                          // rose toward the second waypoint (y 32)
    for (let i = 0; i < 200; i++) step(s, input);
    expect(chute.active).toBe(false);
    expect(s.player.noJump).toBe(false);
    expect(s.player.gravity).toBe(600);
    expect(s.player.body.x).toBeGreaterThan(200);                      // arrived at the last waypoint and was released
  });
});

describe('Portal', () => {
  it('teleports on entry, is quiet for 30 ticks, and the one-way exit does nothing', () => {
    const s = new BaseScene(OPEN);
    const portal = new Portal({ x: 48, y: 80 }, { x: 240, y: 80 }, false, '#fff');
    s.entities.push(portal);
    const input = new Input();
    for (let i = 0; i < 40; i++) step(s, input, ['right']);
    expect(portal.teleports).toBe(1);
    expect(s.player.body.x).toBe(240 + 2);
    for (let i = 0; i < 100; i++) step(s, input, ['left']);           // walk back over pad b: nothing (one-way), then over pad a again
    expect(portal.teleports).toBe(2);
  });
  it('a two-way pair cannot ping-pong inside the cooldown', () => {
    const s = new BaseScene(OPEN);
    const portal = new Portal({ x: 48, y: 80 }, { x: 64, y: 80 }, true, '#fff');   // adjacent pads
    s.entities.push(portal);
    const input = new Input();
    for (let i = 0; i < 25; i++) step(s, input, ['right']);
    expect(portal.teleports).toBe(1);
    for (let i = 0; i < 29; i++) step(s, input);
    expect(portal.teleports).toBe(1);                                  // standing on pad b during the cooldown
  });
});

describe('Lever', () => {
  it('toggles with act while overlapped and not otherwise', () => {
    const s = new BaseScene(OPEN);
    const seen: boolean[] = [];
    const lever = new Lever({ x: 48, y: 80 }, on => seen.push(on));
    s.entities.push(lever);
    const input = new Input();
    step(s, input, ['act']);
    expect(seen).toEqual([]);                                          // not overlapping yet
    for (let i = 0; i < 30; i++) step(s, input, ['right']);
    step(s, input, ['act']);
    step(s, input);
    step(s, input, ['act']);
    expect(seen).toEqual([true, false]);
    expect(lever.on).toBe(false);
  });
});
```

- [ ] **Step 2: Chute**

```ts
import { DT, TILE } from '../constants';
import type { Vec } from '../geom';
import { center, overlaps } from '../geom';
import type { BaseScene, Entity } from '../scene';

/** A fixed path that carries the player from its first cell to its last (slides, waterfalls). */
export class Chute implements Entity {
  active = false;
  readonly waypoints: Vec[];
  private next = 1;
  private savedGravity = 600;

  constructor(cells: Vec[], private readonly color: string, private readonly speed = 120) {
    this.waypoints = cells.map(c => ({ x: c.x + TILE / 2, y: c.y + TILE / 2 }));   // centres
  }

  update(scene: BaseScene): void {
    const p = scene.player;
    const b = p.body;
    if (!this.active) {
      const entry = { x: this.waypoints[0].x - TILE / 2, y: this.waypoints[0].y - TILE / 2, w: TILE, h: TILE };
      if (!overlaps(b, entry)) return;
      this.active = true;
      this.next = 1;
      this.savedGravity = p.gravity;
      p.gravity = 0;
      p.noJump = true;
    }
    p.controlLock = 2;
    const c = center(b);
    const target = this.waypoints[this.next];
    const dx = target.x - c.x;
    const dy = target.y - c.y;
    const dist = Math.hypot(dx, dy);
    const stepLen = this.speed * DT;
    if (dist <= stepLen) {
      b.x = target.x - b.w / 2;
      b.y = target.y - b.h / 2;
      this.next++;
      if (this.next >= this.waypoints.length) this.release(p);
      return;
    }
    b.vx = (dx / dist) * this.speed;
    b.vy = (dy / dist) * this.speed;
  }

  private release(p: BaseScene['player']): void {
    this.active = false;
    p.gravity = this.savedGravity;
    p.noJump = false;
    p.controlLock = 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    this.waypoints.forEach((w, i) => (i === 0 ? ctx.moveTo(w.x, w.y) : ctx.lineTo(w.x, w.y)));
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
```

Note: `Player.integrate` runs before entities, so the velocity set here moves the player on the next tick; the snap-to-target when within one step keeps the path exact. `controlLock = 2` each tick keeps `control()` from touching `vx` (it reads the lock before decrementing).

- [ ] **Step 3: Portal**

```ts
import { TILE } from '../constants';
import type { Vec } from '../geom';
import { overlaps } from '../geom';
import type { BaseScene, Entity } from '../scene';

const COOLDOWN = 30;

export class Portal implements Entity {
  teleports = 0;
  private cooldown = 0;

  constructor(readonly a: Vec, readonly b: Vec, readonly twoWay: boolean, private readonly color: string) {}

  private pad(c: Vec) { return { x: c.x, y: c.y, w: TILE, h: TILE }; }

  update(scene: BaseScene): void {
    if (this.cooldown > 0) { this.cooldown--; return; }
    const body = scene.player.body;
    if (overlaps(body, this.pad(this.a))) this.go(scene, this.b);
    else if (this.twoWay && overlaps(body, this.pad(this.b))) this.go(scene, this.a);
  }

  private go(scene: BaseScene, to: Vec): void {
    const b = scene.player.body;
    b.x = to.x + (TILE - b.w) / 2;
    b.y = to.y + TILE - b.h;
    this.cooldown = COOLDOWN;
    this.teleports++;
    scene.camera.snap(b.x + b.w / 2, b.y + b.h / 2);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    for (const [c, dashed] of [[this.a, false], [this.b, !this.twoWay]] as Array<[Vec, boolean]>) {
      ctx.setLineDash(dashed ? [2, 2] : []);
      ctx.beginPath();
      ctx.arc(c.x + TILE / 2, c.y + TILE / 2, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
}
```

- [ ] **Step 4: Lever**

```ts
import { TILE } from '../constants';
import type { Vec } from '../geom';
import { overlaps } from '../geom';
import type { Input } from '../input';
import { PALETTE } from '../renderer';
import type { BaseScene, Entity } from '../scene';

export class Lever implements Entity {
  on = false;

  constructor(readonly cell: Vec, private readonly onToggle: (on: boolean) => void) {}

  update(scene: BaseScene, input: Input): void {
    if (!input.pressed('act')) return;
    if (!overlaps(scene.player.body, { x: this.cell.x, y: this.cell.y, w: TILE, h: TILE })) return;
    this.on = !this.on;
    this.onToggle(this.on);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.cell;
    ctx.fillStyle = PALETTE.tileEdge;
    ctx.fillRect(x + 4, y + 12, 8, 4);
    ctx.fillStyle = this.on ? PALETTE.pickup : PALETTE.danger;
    const tip = this.on ? x + 12 : x + 3;
    ctx.fillRect(Math.min(tip, x + 8), y + 6, Math.abs(tip - (x + 8)) + 1, 2);
    ctx.fillRect(tip - 1, y + 4, 3, 3);
  }
}
```

- [ ] **Step 5: run, commit** — `pnpm test && pnpm typecheck`. Trace the chute test's first assertion before running: the player runs right from x 18 at up to 90 px/s; after 40 ticks it has reached ~x 60, overlapping the entry cell 48..64. Commit: `Engine: Chute, Portal, Lever`.

---

### Task 6: RollingRock and FlameJet

**Files:**
- Create: `src/engine/entities/rolling-rock.ts`, `src/engine/entities/flame-jet.ts`
- Test: `test/obstacles.test.ts`

**Interfaces:**
- Produces: `class RollingRock { body: Body; dir; crushed; constructor(cell, dir = 1, speed = 60); update(scene); draw(ctx) }` — after moving (gravity, wall bounce) it shoves an overlapping player out along x; if the shove would put the player inside a solid cell, `crushed = true` for that tick and the player is left where it is. `class FlameJet { rect; active; warning; constructor(cell, dir: 'up'|'down'|'left'|'right', onTicks, offTicks, phase = 0); hits(rect); update(scene); draw(ctx) }` — the flame rect covers the nozzle cell plus 16 px in `dir`.

- [ ] **Step 1: failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { FlameJet } from '../src/engine/entities/flame-jet';
import { RollingRock } from '../src/engine/entities/rolling-rock';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';

const idle = (s: BaseScene, n: number): void => { const i = new Input(); for (let k = 0; k < n; k++) { i.tick(); s.update(i); } };

describe('RollingRock', () => {
  it('rolls, bounces off walls, and shoves the player', () => {
    const s = new BaseScene(['####################', '#..................#', '#@.....R...........#', '####################']);
    const rock = new RollingRock(s.level.rocks[0], -1, 60);
    s.entities.push(rock);
    const x0 = s.player.body.x;
    let shoved = false;
    for (let t = 0; t < 200; t++) { idle(s, 1); if (s.player.body.x < x0) shoved = true; }
    expect(shoved).toBe(true);
    expect(rock.dir).toBe(1);                                          // bounced off the left wall
  });
  it('reports a crush when the shove would push the player into a wall', () => {
    const s = new BaseScene(['####################', '#..................#', '#@..R..............#', '####################']);
    const rock = new RollingRock(s.level.rocks[0], -1, 60);
    s.entities.push(rock);
    let crushed = false;
    for (let t = 0; t < 120; t++) { idle(s, 1); if (rock.crushed) crushed = true; }
    expect(crushed).toBe(true);
    expect(s.player.body.x).toBeGreaterThanOrEqual(16);               // never inside the wall
  });
});

describe('FlameJet', () => {
  it('is on for onTicks, warns before relighting, and covers the nozzle cell', () => {
    const s = new BaseScene(['########', '#......#', '#@..F..#', '########']);
    const jet = new FlameJet(s.level.jets[0], 'up', 30, 30);
    s.entities.push(jet);
    idle(s, 1);
    expect(jet.active).toBe(true);
    expect(jet.hits({ x: 66, y: 34, w: 12, h: 14 })).toBe(true);       // standing on the nozzle cell
    expect(jet.hits({ x: 66, y: 10, w: 12, h: 14 })).toBe(true);       // one cell above
    expect(jet.hits({ x: 30, y: 34, w: 12, h: 14 })).toBe(false);
    idle(s, 30);
    expect(jet.active).toBe(false);
    expect(jet.hits({ x: 66, y: 34, w: 12, h: 14 })).toBe(false);
    idle(s, 15);
    expect(jet.warning).toBe(true);
    idle(s, 15);
    expect(jet.active).toBe(true);
  });
});
```

- [ ] **Step 2: RollingRock**

```ts
import { DT, TILE } from '../constants';
import type { Vec } from '../geom';
import { overlaps } from '../geom';
import type { Body } from '../physics';
import { isSolidKind, moveBody } from '../physics';
import { PALETTE } from '../renderer';
import type { BaseScene, Entity } from '../scene';
import { cellsUnder } from '../tilemap';

export class RollingRock implements Entity {
  body: Body;
  crushed = false;
  private angle = 0;

  constructor(cell: Vec, public dir: 1 | -1 = 1, private readonly speed = 60) {
    this.body = { x: cell.x, y: cell.y, w: TILE, h: TILE, vx: 0, vy: 0 };
  }

  update(scene: BaseScene): void {
    this.crushed = false;
    this.body.vx = this.dir * this.speed;
    this.body.vy = Math.min(this.body.vy + 600 * DT, 260);
    const c = moveBody(scene.level, this.body);
    if ((this.dir < 0 && c.onWallLeft) || (this.dir > 0 && c.onWallRight)) this.dir = (-this.dir) as 1 | -1;
    this.angle += (this.dir * this.speed * DT) / (TILE / 2);
    const p = scene.player.body;
    if (!overlaps(this.body, p)) return;
    const pushRight = p.x + p.w / 2 >= this.body.x + this.body.w / 2;
    const targetX = pushRight ? this.body.x + this.body.w : this.body.x - p.w;
    const probe = { x: targetX, y: p.y, w: p.w, h: p.h };
    if (cellsUnder(scene.level, probe).some(k => isSolidKind(k.kind))) { this.crushed = true; return; }
    p.x = targetX;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const cx = this.body.x + TILE / 2;
    const cy = this.body.y + TILE / 2;
    ctx.fillStyle = PALETTE.tileEdge;
    ctx.beginPath();
    ctx.arc(cx, cy, TILE / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(Math.round(cx + Math.cos(this.angle) * 4) - 1, Math.round(cy + Math.sin(this.angle) * 4) - 1, 2, 2);
  }
}
```

- [ ] **Step 3: FlameJet**

```ts
import { TILE } from '../constants';
import type { Rect, Vec } from '../geom';
import { overlaps } from '../geom';
import { PALETTE } from '../renderer';
import type { BaseScene, Entity } from '../scene';

const WARN_TICKS = 20;
export type JetDir = 'up' | 'down' | 'left' | 'right';

export class FlameJet implements Entity {
  readonly rect: Rect;
  active = false;
  warning = false;

  constructor(readonly cell: Vec, readonly dir: JetDir, private readonly onTicks: number, private readonly offTicks: number, private readonly phase = 0) {
    const { x, y } = cell;
    this.rect = dir === 'up' ? { x, y: y - TILE, w: TILE, h: 2 * TILE }
      : dir === 'down' ? { x, y, w: TILE, h: 2 * TILE }
      : dir === 'left' ? { x: x - TILE, y, w: 2 * TILE, h: TILE }
      : { x, y, w: 2 * TILE, h: TILE };
  }

  hits(r: Rect): boolean {
    return this.active && overlaps(this.rect, r);
  }

  update(scene: BaseScene): void {
    const period = this.onTicks + this.offTicks;
    const t = (scene.ticks + this.phase) % period;
    this.active = t < this.onTicks;
    this.warning = !this.active && t >= period - WARN_TICKS;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.cell;
    ctx.fillStyle = PALETTE.tileEdge;
    ctx.fillRect(x + 4, y + 12, 8, 4);
    if (this.active) {
      ctx.fillStyle = (Math.floor(Date.now() / 50) & 1) ? PALETTE.danger : PALETTE.key;
      ctx.fillRect(this.rect.x + 2, this.rect.y + 2, this.rect.w - 4, this.rect.h - 4);
    } else if (this.warning) {
      ctx.fillStyle = PALETTE.muted;
      ctx.fillRect(x + 7, y + 8, 2, 2);
    }
  }
}
```

Replace `Date.now()`-based flicker with a tick-based one: give `draw` no clock; instead store `scene.ticks` in `update` into a private `ticks` field and use `((this.ticks >> 1) & 1)`. Do that; never read wall-clock time in draw code.

- [ ] **Step 4: run, commit** — `pnpm test && pnpm typecheck`. Commit: `Engine: rolling rock and flame jet`.

---

### Task 7: Demos — crumbling platforms, interval platforms

**Files:**
- Create: `src/demos/crumbling-platforms.ts`, `src/demos/interval-platforms.ts`
- Modify: `src/demos/index.ts` (add after `oneWay` in the Platforms group)
- Test: `test/demos-platforms.test.ts`

Both share this level shape (spikes fill a wide pit; the two ledges are 5 cells wide):

```ts
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
  '#####^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^#####',
  '########################################',
];
```

- [ ] **Step 1: failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { CrumblingScene } from '../src/demos/crumbling-platforms';
import { IntervalScene } from '../src/demos/interval-platforms';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';

const idle = (s: BaseScene, n: number): void => { const i = new Input(); for (let k = 0; k < n; k++) { i.tick(); s.update(i); } };

describe('crumbling platforms demo', () => {
  it('has a lower fading row and an upper falling row, and respawns on the spikes', () => {
    const s = new CrumblingScene();
    const kinds = s.platforms.map(p => p.kind);
    expect(kinds.filter(k => k === 'fade').length).toBe(7);
    expect(kinds.filter(k => k === 'fall').length).toBe(6);
    s.player.moveTo({ x: 96, y: 128 });                 // on the first lower plank (top y 144)
    idle(s, 5);
    expect(s.platforms[0].riding).toBe(true);
    idle(s, 60);
    expect(s.platforms[0].state).toBe('gone');
    let ticks = 0;
    while (s.falls === 0 && ticks++ < 200) idle(s, 1);
    expect(s.falls).toBe(1);
    expect(s.player.body.x).toBe(50);
  });
});

describe('interval platforms demo', () => {
  it('alternates phases so neighbours are never both off', () => {
    const s = new IntervalScene();
    for (let t = 0; t < 400; t++) {
      idle(s, 1);
      for (let i = 0; i + 1 < s.platforms.length; i++) expect(s.platforms[i].solid || s.platforms[i + 1].solid).toBe(true);
    }
  });
});
```

- [ ] **Step 2: crumbling-platforms.ts**

```ts
import { CrumblingPlatform } from '../engine/entities/crumbling-platform';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#c9a36a';
const LEVEL = [ /* as above */ ];

export class CrumblingScene extends BaseScene {
  readonly platforms: CrumblingPlatform[] = [];
  falls = 0;

  constructor() {
    super(LEVEL, { accent: ACCENT });
    for (let i = 0; i < 7; i++) this.platforms.push(new CrumblingPlatform({ x: 96 + i * 64, y: 144 }, 32, 'fade'));
    for (let i = 0; i < 6; i++) this.platforms.push(new CrumblingPlatform({ x: 128 + i * 64, y: 112 }, 32, 'fall'));
    this.entities.push(...this.platforms);
  }

  protected override afterUpdate(): void {
    if (this.hurtByHazard()) { this.falls++; this.respawn(); }
    this.hud = [`falls ${this.falls}`, 'lower planks fade after a moment; upper planks drop'];
  }
}

export const crumblingPlatforms: Demo = {
  id: 'crumbling-platforms',
  title: 'Crumbling platforms',
  category: 'Platforms and surfaces',
  blurb: 'Stand on a plank for half a second and it gives way: the lower row fades out, the upper row drops. Both come back.',
  controls: BASE_CONTROLS,
  create: () => new CrumblingScene(),
};
```

Geometry check before running: the left ledge top is y 160 (row 10); the lower planks at y 144 are 1 tile up with the first at x 96 (1 cell past the ledge's edge at x 80); planks are 32 wide with 32-px gaps (2 cells); the upper row at y 112 is 2 tiles above the lower row, offset by 32 px. The right ledge starts at x 560; the last lower plank ends at 96 + 6·64 + 32 = 512, a 3-cell gap. All within the jump rules.

- [ ] **Step 3: interval-platforms.ts**

Same scene shape with `IntervalPlatform`s: `for (let i = 0; i < 7; i++) new IntervalPlatform({ x: 96 + i * 64, y: 144 }, 32, 120, 90, i % 2 === 0 ? 0 : 105)`. Alternating phases: with on 120 / off 90 (period 210) and phase 105, neighbours are off at different times (on-windows [0,120) and [105,225) mod 210 always overlap). HUD: `falls`, 'planks blink before they go; wait for the next one'. Export `IntervalScene`. Demo id `interval-platforms`, title `Interval platforms`, blurb 'Planks that come and go on a fixed timer. They blink before vanishing, and neighbours never vanish together.'

- [ ] **Step 4: register, run, commit** — add both after `oneWay`. `pnpm test && pnpm typecheck`. Commit: `Demos: crumbling and interval platforms`.

---

### Task 8: Demos — ice and sand, conveyor belts

**Files:**
- Create: `src/demos/ice-and-sand.ts`, `src/demos/conveyor-belts.ts`
- Modify: `src/demos/index.ts`
- Test: `test/demos-surfaces.test.ts`

- [ ] **Step 1: failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { ConveyorScene } from '../src/demos/conveyor-belts';
import { SurfacePlayer } from '../src/demos/ice-and-sand';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';

const step = (s: BaseScene, input: Input, held: Action[] = []): void => {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick(); s.update(input);
};
const slideAfterRun = (rows: string[]): number => {
  const s = new BaseScene(rows, { player: spawn => new SurfacePlayer(spawn) });
  const input = new Input();
  for (let i = 0; i < 40; i++) step(s, input, ['right']);
  const x0 = s.player.body.x;
  for (let i = 0; i < 60; i++) step(s, input);
  return s.player.body.x - x0;
};

describe('ice and sand', () => {
  it('slides far on ice, stops short on sand, and sand caps the run speed', () => {
    const stone = slideAfterRun(['##########################', '#@.......................#', '##########################']);
    const ice   = slideAfterRun(['##########################', '#@.......................#', '#iiiiiiiiiiiiiiiiiiiiiiii#']);
    const sand  = slideAfterRun(['##########################', '#@.......................#', '#ssssssssssssssssssssssss#']);
    expect(ice).toBeGreaterThan(stone * 3);
    expect(sand).toBeLessThan(stone);
    const s = new BaseScene(['##########################', '#@.......................#', '#ssssssssssssssssssssssss#'], { player: spawn => new SurfacePlayer(spawn) });
    const input = new Input();
    for (let i = 0; i < 60; i++) step(s, input, ['right']);
    expect(Math.abs(s.player.body.vx)).toBeLessThanOrEqual(50);
  });
});

describe('conveyor belts', () => {
  it('carries a standing player, faster than walking on the fast belt, and never through a wall', () => {
    const s = new ConveyorScene(['####################', '#@.................#', '#>>>>>>>>>>>>>>>>>>#'], () => 140);
    const input = new Input();
    for (let i = 0; i < 60; i++) step(s, input);
    expect(s.player.body.x).toBeGreaterThan(18 + 100);          // carried ~140 px in a second
    for (let i = 0; i < 300; i++) step(s, input);
    expect(s.player.body.x).toBe(304 - 12);                     // pinned at the wall, not inside it
  });
  it('a slow belt against the run direction still lets you make headway', () => {
    const s = new ConveyorScene(['####################', '#@.................#', '#<<<<<<<<<<<<<<<<<<#'], () => 40);
    const input = new Input();
    for (let i = 0; i < 120; i++) step(s, input, ['right']);
    expect(s.player.body.x).toBeGreaterThan(60);
  });
});
```

- [ ] **Step 2: ice-and-sand.ts**

```ts
import { Player } from '../engine/entities/player';
import type { Input } from '../engine/input';
import { BaseScene } from '../engine/scene';
import { surfaceUnder } from '../engine/tilemap';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#8fd3ff';
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
  '############iiiiiiiiiiiiiisssssssssssss#',
  '########################################',
];

/** Run tunables follow the surface under the feet. */
export class SurfacePlayer extends Player {
  surface: 'stone' | 'ice' | 'sand' | 'air' = 'stone';

  protected override control(scene: BaseScene, input: Input): void {
    const k = surfaceUnder(scene.level, this.body);
    this.surface = k === null ? 'air' : k === 'ice' ? 'ice' : k === 'sand' ? 'sand' : 'stone';
    if (this.surface === 'ice') { this.friction = 80; this.accel = 300; this.runSpeed = 90; }
    else if (this.surface === 'sand') { this.friction = 1200; this.accel = 400; this.runSpeed = 50; }
    else if (this.surface === 'stone') { this.friction = 800; this.accel = 900; this.runSpeed = 90; }
    super.control(scene, input);
  }
}

class SurfaceScene extends BaseScene {
  protected override afterUpdate(): void {
    const p = this.player as SurfacePlayer;
    this.hud = [`surface: ${p.surface}`, 'stone grips, ice slides, sand drags'];
  }
}

export const iceAndSand: Demo = {
  id: 'ice-and-sand',
  title: 'Ice and sand',
  category: 'Platforms and surfaces',
  blurb: 'The floor changes underfoot: ice barely slows you down once you are moving, sand makes every step a plod.',
  controls: BASE_CONTROLS,
  create: () => new SurfaceScene(LEVEL, { accent: ACCENT, player: spawn => new SurfacePlayer(spawn) }),
};
```

The `air` case keeps the last surface's tunables on purpose: you keep what you had until you land.

- [ ] **Step 3: conveyor-belts.ts**

```ts
import { TILE } from '../engine/constants';
import { Player } from '../engine/entities/player';
import type { Vec } from '../engine/geom';
import { moveBody } from '../engine/physics';
import { BaseScene } from '../engine/scene';
import { surfaceUnder } from '../engine/tilemap';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#6b7590';
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
  '####>>>>>>>>####<<<<<<<<####>>>>>>>>####',
  '########################################',
];

/** px/s for the belt under column `col`: fast right, slow left, walking-speed right. */
const speedFor = (col: number): number => (col < 12 ? 140 : col < 24 ? 40 : 90);

export class ConveyorPlayer extends Player {
  beltSpeed = 0;
  constructor(spawn: Vec, private readonly speedAt: (col: number) => number) { super(spawn); }

  protected override integrate(scene: BaseScene): void {
    super.integrate(scene);
    const k = surfaceUnder(scene.level, this.body);
    if (k !== 'beltR' && k !== 'beltL') { this.beltSpeed = 0; return; }
    const col = Math.floor((this.body.x + this.body.w / 2) / TILE);
    this.beltSpeed = (k === 'beltR' ? 1 : -1) * this.speedAt(col);
    // Carry through the collision code so a belt can never push you into a wall.
    const carry = { ...this.body, vx: this.beltSpeed, vy: 0 };
    moveBody(scene.level, carry);
    this.body.x = carry.x;
  }
}

export class ConveyorScene extends BaseScene {
  constructor(rows: readonly string[] = LEVEL, speedAt: (col: number) => number = speedFor) {
    super(rows, { accent: ACCENT, player: spawn => new ConveyorPlayer(spawn, speedAt) });
  }
  protected override afterUpdate(): void {
    const p = this.player as ConveyorPlayer;
    this.hud = [p.beltSpeed === 0 ? 'off the belts' : `belt ${p.beltSpeed > 0 ? '→' : '←'} ${Math.abs(p.beltSpeed)} px/s (you walk 90)`, 'one belt outruns you, one you can beat, one matches'];
  }
}

export const conveyorBelts: Demo = {
  id: 'conveyor-belts',
  title: 'Conveyor belts',
  category: 'Platforms and surfaces',
  blurb: 'Belts carry whatever stands on them. One is faster than you can walk, one slower, one exactly your speed.',
  controls: BASE_CONTROLS,
  create: () => new ConveyorScene(),
};
```

- [ ] **Step 4: register, run, commit** — after `intervalPlatforms`. `pnpm test && pnpm typecheck`. Commit: `Demos: ice and sand, conveyor belts`.

---

### Task 9: Demos — slides, portals, levers

**Files:**
- Create: `src/demos/slides.ts`, `src/demos/portals.ts`, `src/demos/levers.ts`
- Modify: `src/demos/index.ts`
- Test: `test/demos-paths.test.ts`

- [ ] **Step 1: failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { LeverScene } from '../src/demos/levers';
import { PortalScene } from '../src/demos/portals';
import { SlideScene } from '../src/demos/slides';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';
import { tileAt } from '../src/engine/tilemap';

const step = (s: BaseScene, input: Input, held: Action[] = []): void => {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick(); s.update(input);
};

describe('slides demo', () => {
  it('walking off the start ledge rides the slide to the floor', () => {
    const s = new SlideScene();
    const input = new Input();
    let rode = false;
    for (let i = 0; i < 400; i++) { step(s, input, ['right']); if (s.slide.active) rode = true; }
    expect(rode).toBe(true);
    expect(s.slide.active).toBe(false);
    expect(s.player.body.y).toBeGreaterThan(100);
  });
});

describe('portals demo', () => {
  it('constructs one two-way and one one-way portal from the markers', () => {
    const s = new PortalScene();
    expect(s.portals.map(p => p.twoWay)).toEqual([true, false]);
  });
});

describe('levers demo', () => {
  it('act at a lever opens its door and again closes it, but never onto the player', () => {
    const s = new LeverScene();
    const input = new Input();
    expect(tileAt(s.level, 14, 8)).toBe('door');
    s.player.moveTo(s.level.levers[0]);                             // stand on the first lever
    step(s, input);
    step(s, input, ['act']);
    expect(tileAt(s.level, 14, 8)).toBe('empty');
    s.player.moveTo({ x: 14 * 16, y: 8 * 16 });                     // stand in the open doorway
    step(s, input);
    s.toggleDoor(0, false);
    expect(tileAt(s.level, 14, 8)).toBe('empty');                   // refused: the player is inside
    s.player.moveTo(s.level.levers[0]);
    step(s, input);
    s.toggleDoor(0, false);
    expect(tileAt(s.level, 14, 8)).toBe('door');
  });
});
```

- [ ] **Step 2: slides.ts**

```ts
import { Chute } from '../engine/entities/chute';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#5fd0ff';
const LEVEL = [
  '########################################',
  '#......................................#',
  '#..@.......................###.........#',
  '#####..................................#',
  '#....##................###.............#',
  '#......##..............................#',
  '#........##........###.................#',
  '#..........##..........................#',
  '#............##..###...................#',
  '#..............##......................#',
  '#................#######################',
  '########################################',
];
const cell = (c: number, r: number) => ({ x: c * 16, y: r * 16 });

export class SlideScene extends BaseScene {
  readonly slide = new Chute([cell(4, 2), cell(5, 3), cell(7, 4), cell(9, 5), cell(11, 6), cell(13, 7), cell(15, 8), cell(16, 8)], ACCENT, 140);
  readonly waterfall = new Chute([cell(31, 2), cell(31, 8), cell(35, 9)], ACCENT, 160);
  constructor() { super(LEVEL, { accent: ACCENT }); this.entities.push(this.slide, this.waterfall); }
  protected override afterUpdate(): void {
    this.hud = [this.slide.active ? 'sliding' : this.waterfall.active ? 'in the waterfall' : 'walk off the ledge; climb the steps for the waterfall'];
  }
}

export const slides: Demo = {
  id: 'slides',
  title: 'Slides and waterfalls',
  category: 'Platforms and surfaces',
  blurb: 'Step in and you are carried along a fixed path to its end: a slide down the slope, a waterfall off the top ledge.',
  controls: BASE_CONTROLS,
  create: () => new SlideScene(),
};
```

Geometry: the steps at rows 8 (cols 17–19), 6 (19–21), 4 (23–25) and the ledge at row 2 (27–29) each rise 2 tiles with 1-cell gaps, so the top ledge is reachable; walking off its right end at col 30 drops through the waterfall's entry cell (31, 2).

- [ ] **Step 3: portals.ts**

```ts
import { Portal } from '../engine/entities/portal';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#c58cff';
const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#.......................Q..............#',
  '#......................####............#',
  '#...........#..........................#',
  '#...........#..........................#',
  '#..@....P...#...P......................#',
  '#...........#.........................Q#',
  '########################################',
  '########################################',
];

export class PortalScene extends BaseScene {
  readonly portals: Portal[];
  constructor() {
    super(LEVEL, { accent: ACCENT });
    const ps = this.level.portals.filter(p => p.id === 'P');
    const qs = this.level.portals.filter(p => p.id === 'Q');       // reading order: the ledge pad first, the floor pad second
    this.portals = [new Portal(ps[0], ps[1], true, ACCENT), new Portal(qs[1], qs[0], false, ACCENT)];
    this.entities.push(...this.portals);
  }
  protected override afterUpdate(): void {
    const n = this.portals[0].teleports + this.portals[1].teleports;
    this.hud = [`teleports ${n}`, 'left pair goes both ways; the far-right pad only goes up'];
  }
}

export const portals: Demo = {
  id: 'portals',
  title: 'Portals',
  category: 'Platforms and surfaces',
  blurb: 'Two pads linked both ways through the wall, and a one-way pad that lifts you to the ledge and never back.',
  controls: BASE_CONTROLS,
  create: () => new PortalScene(),
};
```

- [ ] **Step 4: levers.ts**

```ts
import { TILE } from '../engine/constants';
import { Lever } from '../engine/entities/lever';
import { Pickup } from '../engine/entities/pickup';
import { overlaps } from '../engine/geom';
import { BaseScene } from '../engine/scene';
import { setTile } from '../engine/tilemap';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#8ce86a';
const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#.............d............d...........#',
  '#..@.....L....d......L.....d.......*...#',
  '#.............d............d...........#',
  '########################################',
  '########################################',
];

export class LeverScene extends BaseScene {
  readonly levers: Lever[];
  private readonly doorCols: number[];
  won = false;
  constructor() {
    super(LEVEL, { accent: ACCENT });
    this.doorCols = [...new Set(this.level.doors.map(d => d.x / TILE))].sort((a, b) => a - b);
    this.levers = this.level.levers.map((cell, i) => new Lever(cell, on => this.toggleDoor(i, on)));
    this.entities.push(...this.levers);
    for (const g of this.level.pickups) this.entities.push(new Pickup(g, () => { this.won = true; }, ACCENT));
  }
  /** Open (on) or close a door column; closing is refused while the player overlaps it. */
  toggleDoor(index: number, on: boolean): void {
    const col = this.doorCols[index];
    const cells = this.level.doors.filter(d => d.x / TILE === col);
    if (!on && cells.some(d => overlaps(this.player.body, { x: d.x, y: d.y, w: TILE, h: TILE }))) return;
    for (const d of cells) setTile(this.level, col, d.y / TILE, on ? 'empty' : 'door');
  }
  protected override afterUpdate(): void {
    this.hud = [this.won ? 'You made it! R to reset' : 'stand at a lever and press X to flip it'];
  }
}

export const levers: Demo = {
  id: 'levers',
  title: 'Levers',
  category: 'Platforms and surfaces',
  blurb: 'Flip a lever to open its door; flip it again to close it. A door never closes on you.',
  controls: [...BASE_CONTROLS, 'X: flip lever'],
  touch: [{ action: 'act', label: 'FLIP' }],
  create: () => new LeverScene(),
};
```

When a close is refused, the lever's `on` flag and the door disagree; the next `act` flips the lever back to `on` and calls `toggleDoor(i, true)` on an already-open door, which is harmless. Keep it simple.

- [ ] **Step 5: register, run, commit** — after `conveyorBelts`. `pnpm test && pnpm typecheck`. Commit: `Demos: slides and waterfalls, portals, levers`.

---

### Task 10: Demos — landmines, flame jets, rolling rocks (HpScene)

**Files:**
- Create: `src/demos/landmines.ts`, `src/demos/flame-jets.ts`, `src/demos/rolling-rocks.ts`
- Modify: `src/demos/index.ts` (Hazards group, after `hazards`)
- Test: `test/demos-hazards.test.ts`

- [ ] **Step 1: failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { FlameScene } from '../src/demos/flame-jets';
import { MineScene } from '../src/demos/landmines';
import { RockScene } from '../src/demos/rolling-rocks';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';

const idle = (s: BaseScene, n: number): void => { const i = new Input(); for (let k = 0; k < n; k++) { i.tick(); s.update(i); } };

describe('landmines', () => {
  it('arms when stepped on and explodes after the delay, costing one heart if still near', () => {
    const s = new MineScene();
    s.player.moveTo(s.level.mines[0]);
    idle(s, 2);
    expect(s.mines[0].state).toBe('armed');
    idle(s, 50);
    expect(s.mines[0].state).toBe('gone');
    expect(s.hp.hp).toBe(2);
    idle(s, 260);
    expect(s.mines[0].state).toBe('idle');
  });
});

describe('flame jets', () => {
  it('an active jet costs a heart; an inactive one does not', () => {
    const s = new FlameScene();
    const jet = s.jets[0];
    s.player.moveTo(jet.cell);
    let n = 0;
    while (!jet.active && n++ < 300) idle(s, 1);
    expect(s.hp.hp).toBe(3);                          // untouched while it rested
    idle(s, 2);
    expect(s.hp.hp).toBe(2);
  });
});

describe('rolling rocks', () => {
  it('a rock crushing the player against the wall costs a heart', () => {
    const s = new RockScene();
    s.player.moveTo({ x: 12 * 16, y: 9 * 16 });     // beside the pillar, in the rock's lane
    const hp = s.hp.hp;
    for (let t = 0; t < 900 && s.hp.hp === hp; t++) idle(s, 1);
    expect(s.hp.hp).toBeLessThan(hp);
  });
});
```

- [ ] **Step 2: landmines.ts**

```ts
import { Explosion } from '../engine/entities/explosion';
import type { Vec } from '../engine/geom';
import { overlaps } from '../engine/geom';
import { HpScene } from '../engine/hp-scene';
import { PALETTE } from '../engine/renderer';
import type { BaseScene, Entity } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#e8b05a';
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
  '#.......M....M.M.......M......M........#',
  '########################################',
  '########################################',
];
const ARM_TICKS = 45;
const RADIUS = 32;
const RETURN_TICKS = 240;

class Mine implements Entity {
  state: 'idle' | 'armed' | 'gone' = 'idle';
  private t = 0;
  constructor(readonly cell: Vec, private readonly onBlast: (cx: number, cy: number) => void) {}
  update(scene: BaseScene): void {
    const pad = { x: this.cell.x + 2, y: this.cell.y + 8, w: 12, h: 8 };
    if (this.state === 'idle' && overlaps(scene.player.body, pad)) { this.state = 'armed'; this.t = 0; }
    else if (this.state === 'armed' && ++this.t >= ARM_TICKS) { this.state = 'gone'; this.t = 0; this.onBlast(this.cell.x + 8, this.cell.y + 12); }
    else if (this.state === 'gone' && ++this.t >= RETURN_TICKS) this.state = 'idle';
  }
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.state === 'gone') return;
    const blink = this.state === 'armed' && ((this.t >> 2) & 1) === 1;
    ctx.fillStyle = blink ? PALETTE.danger : PALETTE.tileEdge;
    ctx.fillRect(this.cell.x + 3, this.cell.y + 11, 10, 4);
    ctx.fillRect(this.cell.x + 7, this.cell.y + 9, 2, 2);
  }
}

export class MineScene extends HpScene {
  readonly mines: Mine[];
  constructor() {
    super(LEVEL, { accent: ACCENT });
    this.mines = this.level.mines.map(c => new Mine(c, (cx, cy) => this.blast(cx, cy)));
    this.entities.push(...this.mines);
  }
  private blast(cx: number, cy: number): void {
    const e = new Explosion(cx, cy, RADIUS, 20, ACCENT);
    this.entities.push(e);
    if (e.inRange(this.hp.body)) this.damage(cx);
  }
  protected override afterUpdate(): void {
    this.tickDying();
    this.hud = [`deaths ${this.deaths}`, 'a mine arms when you step on it; get clear before it blows'];
  }
}

export const landmines: Demo = {
  id: 'landmines',
  title: 'Landmines',
  category: 'Hazards and obstacles',
  blurb: 'Step on one and it arms with a blink; a moment later it blows. Anything within the blast loses a heart.',
  controls: BASE_CONTROLS,
  create: () => new MineScene(),
};
```

`damage()` is a no-op while dying, so a blast arriving from an entity update before `afterUpdate` is safe.

- [ ] **Step 3: flame-jets.ts**

Level row 9: `'#......F.....F.....F.....F.....F.......#'`, spawn `'#..@...'` on row 8, rest blank, 40-wide borders. `FlameScene extends HpScene`: `readonly jets = this.level.jets.map((c, i) => new FlameJet(c, 'up', 120, 120, i * 48))` pushed to entities in the constructor (build the array after `super`, then push); `afterUpdate`: `if (!this.tickDying()) for (const j of this.jets) if (j.hits(this.hp.body)) this.damage(j.cell.x + 8);` HUD: `deaths`, 'jets rest, warn, then fire; time your run'. Accent `'#ff9a3c'`; id `flame-jets`, title `Flame jets`, category `Hazards and obstacles`, blurb 'Jets that fire on a timer with a warning puff first. Cross while they rest.'

- [ ] **Step 4: rolling-rocks.ts**

```ts
const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..@.......#...........................#',
  '#..........#........R..................#',
  '########################################',
  '########################################',
];
export class RockScene extends HpScene {
  readonly rocks: RollingRock[];
  crushes = 0;
  constructor() {
    super(LEVEL, { accent: ACCENT });
    this.rocks = this.level.rocks.map(c => new RollingRock(c, 1, 70));
    this.entities.push(...this.rocks);
  }
  protected override afterUpdate(): void {
    if (!this.tickDying()) for (const r of this.rocks) if (r.crushed && this.damage(r.body.x + 8)) this.crushes++;
    this.hud = [`crushes ${this.crushes}`, 'the rock shoves you; pinned against a wall, you lose a heart'];
  }
}
```

Accent `'#a8a8a8'`; id `rolling-rocks`, title `Rolling rocks`, category `Hazards and obstacles`, blurb 'A rock rolls the corridor and pushes you along. Get pinned against a wall and it costs a heart.' The pillar at col 11 is two tiles tall so you can jump it.

- [ ] **Step 5: register, run, commit** — Hazards group after `hazards`. `pnpm test && pnpm typecheck`. Commit: `Demos: landmines, flame jets, rolling rocks`.

---

### Task 11: Release check for Plan A

- [ ] `pnpm test && pnpm typecheck && pnpm build`; the catalogue test lists 28 demos; `test/levels.test.ts` passes for all.
- [ ] Browser pass against `pnpm preview` over the ten new demos plus the six-group menu (counts 6/4/3/9/4/2 = 28): each loads, hints present, R, Escape, no console errors; screenshot each to the job scratch dir; the touch overlay shows FLIP on levers after a synthetic touch.
- [ ] Do not publish or push from the task; the controller merges to main, pushes, and runs `scripts/deploy.sh`.

## Self-review notes

- Spec coverage for Plan A: tile kinds/markers/surfaceUnder (T1), menu regroup (T2), PlatformBody + crumbling + interval (T3), HpPlayer/HpScene/armor + Explosion + noJump (T4), Chute/Portal/Lever (T5), RollingRock/FlameJet (T6), demos 12–21 of the spec (T7–T10), release (T11). Plan B covers ladders, ducking, gliding, flying, lasers, arcing shots, homing missiles, explosions, grenades, creeping enemies, armor, and the Turret.
- Type consistency: `Chute`, `Portal`, `Lever`, `RollingRock`, `FlameJet`, `Explosion` all take `Vec` cells in pixel top-left as the parser records them. `HpScene.damage(fromX)` returns boolean; `tickDying()` first in every HpScene subclass's `afterUpdate`.
- Review Focus mapping: (1) T3 tests; (2) T8 conveyor wall test; (3) T5 ping-pong test; (4) T10 landmines (`damage` once per blast; invulnerability covers the 20-tick ring); (5) T6 crush test.
