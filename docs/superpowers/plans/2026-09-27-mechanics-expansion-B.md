# Mechanics Expansion B — combat, abilities, items

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the remaining eleven demos of the expansion spec: ladders, ducking, gliding, flying, lasers, arcing-shots, homing-missiles, explosions, grenades, creeping-enemies, armor; plus the engine pieces they need (projectile gravity/homing/impact callback, `Laser`, `Turret`, `Creeper`).

**Architecture:** As Plan A. Builds on Plan A's engine (`HpScene`, `Explosion`, `isSolidKind`, `surfaceUnder`, `ladder` tiles, `Player.noJump`) and on `Respawner`/`Seeker` in `src/demos/arena.ts`.

**Tech Stack:** TypeScript 5.9, Vite 8, Vitest 5, pnpm, Canvas 2D. Zero runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-09-27-mechanics-expansion-design.md` (binding).

## Global Constraints

Identical to Plan A's Global Constraints (copy them into every dispatch): zero deps; procedural art with one accent per demo; 40-char rows; jump rules (≤ 2 tiles up, ≤ 3 cells across, 2 when rising 2; a demo that changes jump physics says so); respawning scenes reset their player state; `touch` buttons for `act`/`up`/`down` with plain-word labels; `contacts` never mutated in place; `controlLock` read-before-decrement; Node-only vitest; never commit red; plain git add by name, no reset/rebase/amend; the six exact category names.

Plus: **marker rows.** `Player.moveTo(cell)` stands the player on the bottom of its cell, so a standing player's body occupies the SAME row as `@` (the row directly above the floor). Any marker a standing player must touch (`*`, `k`, `L`, `P`/`Q`, `M`, turret bullets' height, a mine pad) goes on that row, never the one above it; Plan A shipped levers and portals one row too high and no gate caught it. Every interactive demo adds a "hint is followable" test that walks the player there with held keys (no `moveTo`) and asserts the world changed (door opened, teleport counted, item taken).

Plus: every combat demo that damages the player extends `HpScene` and calls `tickDying()` first in `afterUpdate`. Enemy spots go through `Respawner` (arena.ts), whose `Spot` gains `kind?: 'patrol' | 'seek' | 'creep'` in Task 6 (Task 1–5 use the existing `seek?: boolean`).

## Review Focus

1. A ducking player must never stand up into a ceiling (headroom check). Test in Task 3.
2. A homing missile must not spin forever around a target it cannot reach: `life` ends it. Test in Task 1.
3. Ladder climbing must end when the ladder ends, top or bottom, with gravity restored. Test in Task 2.
4. An explosion must count against the player at most once (invulnerability covers the ring). Test in Task 5.
5. A creeper must freeze on the exact tick the player turns to face it, not a tick later. Test in Task 6.

---

### Task 1: Projectile options, Laser, Turret

**Files:**
- Modify: `src/engine/entities/projectile.ts`
- Create: `src/engine/entities/laser.ts`, `src/engine/entities/turret.ts`
- Test: `test/projectiles.test.ts`

**Interfaces:**
- Produces:
  - `Projectile(x, y, dir, speed = 260, color?, opts: ProjectileOptions = {})` with `interface ProjectileOptions { gravity?: number; vy0?: number; homing?: () => Rect | null; turnRate?: number; life?: number; onImpact?: (x: number, y: number) => void }`. `vy0` is the initial vertical velocity; `gravity` adds to `vy` per tick; `homing` returns a target rect each tick and the projectile turns its velocity toward the target centre by at most `turnRate` radians per tick at constant speed; the projectile dies on ANY contact (`onGround`, `onCeiling`, wall) and calls `onImpact(cx, cy)` then, or silently after `life` ticks (default 90).
  - `Laser(x, y, dir, level, color, life = 8)`: resolves the beam at construction from `x` along the row of `y` to the first solid cell; `readonly beam: Rect` (2 px tall); `hits(rect)`; draws for `life` ticks then dies.
  - `Turret(cell, dir: 1 | -1, everyTicks, fire: (x: number, y: number, dir: 1 | -1) => void, phase = 0)`: calls `fire` with the muzzle position every `everyTicks`; draws a block with a barrel.

- [ ] **Step 1: failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { Laser } from '../src/engine/entities/laser';
import { Projectile } from '../src/engine/entities/projectile';
import { Turret } from '../src/engine/entities/turret';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';
import { parseLevel } from '../src/engine/tilemap';

const ROOM = ['####################', '#..................#', '#..................#', '#..................#', '#@.................#', '####################'];
const idle = (s: BaseScene, n: number): void => { const i = new Input(); for (let k = 0; k < n; k++) { i.tick(); s.update(i); } };

describe('Projectile options', () => {
  it('arcs under gravity and reports its impact point', () => {
    const s = new BaseScene(ROOM);
    let impact: [number, number] | null = null;
    const p = new Projectile(40, 40, 1, 120, undefined, { gravity: 600, vy0: -100, onImpact: (x, y) => { impact = [x, y]; } });
    s.entities.push(p);
    idle(s, 5);
    expect(p.body.vy).toBeGreaterThan(-100);            // gravity pulled on it
    idle(s, 120);
    expect(p.dead).toBe(true);
    expect(impact).not.toBeNull();
    expect(impact![1]).toBeGreaterThan(60);              // hit the floor, not a wall
  });
  it('homes toward a target and dies of old age if it never arrives', () => {
    const s = new BaseScene(ROOM);
    const target = { x: 200, y: 20, w: 12, h: 14 };
    const p = new Projectile(40, 70, 1, 90, undefined, { homing: () => target, turnRate: 0.06, life: 60 });
    s.entities.push(p);
    idle(s, 20);
    expect(p.body.vy).toBeLessThan(0);                   // turned upward toward the target
    expect(Math.hypot(p.body.vx, p.body.vy)).toBeCloseTo(90, 0);
    idle(s, 45);
    expect(p.dead).toBe(true);
  });
});

describe('Laser', () => {
  it('resolves instantly to the first wall and hits anything on the row', () => {
    const level = parseLevel(ROOM);
    const l = new Laser(40, 70, 1, level, '#fff');
    expect(l.beam.x + l.beam.w).toBe(19 * 16);           // stopped at the right wall
    expect(l.beam.x).toBe(40);
    expect(l.hits({ x: 200, y: 64, w: 12, h: 14 })).toBe(true);
    expect(l.hits({ x: 200, y: 20, w: 12, h: 14 })).toBe(false);
    const s = new BaseScene(ROOM);
    s.entities.push(l);
    idle(s, 8);
    expect(l.dead).toBe(true);
  });
});

describe('Turret', () => {
  it('fires on its interval with the muzzle position', () => {
    const s = new BaseScene(ROOM);
    const shots: number[] = [];
    s.entities.push(new Turret({ x: 288, y: 64 }, -1, 30, (x, _y, dir) => { shots.push(x * dir); }));
    idle(s, 90);
    expect(shots.length).toBe(3);
    expect(shots[0]).toBe(-288);
  });
});
```

- [ ] **Step 2: Projectile**

```ts
import { DT } from '../constants';
import type { Rect } from '../geom';
import type { Body } from '../physics';
import { moveBody } from '../physics';
import { drawProjectile } from '../renderer';
import type { BaseScene, Entity } from '../scene';

export interface ProjectileOptions {
  gravity?: number;
  vy0?: number;
  homing?: () => Rect | null;
  turnRate?: number;
  life?: number;
  onImpact?: (x: number, y: number) => void;
}

export class Projectile implements Entity {
  body: Body;
  dead = false;
  life: number;

  constructor(x: number, y: number, dir: 1 | -1, speed = 260, public color?: string, private readonly opts: ProjectileOptions = {}) {
    this.body = { x, y, w: 4, h: 2, vx: dir * speed, vy: opts.vy0 ?? 0 };
    this.life = opts.life ?? 90;
  }

  update(scene: BaseScene): void {
    const o = this.opts;
    if (o.gravity) this.body.vy += o.gravity * DT;
    if (o.homing) {
      const t = o.homing();
      if (t) {
        const speed = Math.hypot(this.body.vx, this.body.vy);
        const want = Math.atan2(t.y + t.h / 2 - (this.body.y + this.body.h / 2), t.x + t.w / 2 - (this.body.x + this.body.w / 2));
        const have = Math.atan2(this.body.vy, this.body.vx);
        let d = want - have;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        const rate = o.turnRate ?? 0.05;
        const a = have + Math.max(-rate, Math.min(rate, d));
        this.body.vx = Math.cos(a) * speed;
        this.body.vy = Math.sin(a) * speed;
      }
    }
    const c = moveBody(scene.level, this.body);
    const hit = c.onGround || c.onCeiling || c.onWallLeft || c.onWallRight;
    if (hit) {
      this.dead = true;
      o.onImpact?.(this.body.x + this.body.w / 2, this.body.y + this.body.h / 2);
      return;
    }
    if (--this.life <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawProjectile(ctx, this.body, this.color);
  }
}
```

The existing ranged-weapon demo and `test/entities.test.ts` must stay green: the old death rule (`vx` zeroed by a wall) is subsumed by "any contact". Run them.

- [ ] **Step 3: Laser**

```ts
import { TILE } from '../constants';
import type { Rect } from '../geom';
import { overlaps } from '../geom';
import { isSolidKind } from '../physics';
import type { Entity } from '../scene';
import type { Level } from '../tilemap';
import { tileAt } from '../tilemap';

/** An instant beam along one row, resolved at construction; drawn for a few ticks. */
export class Laser implements Entity {
  readonly beam: Rect;
  dead = false;

  constructor(x: number, y: number, dir: 1 | -1, level: Level, private readonly color: string, private life = 8) {
    const row = Math.floor(y / TILE);
    let col = Math.floor(x / TILE);
    while (col >= 0 && col < level.cols && !isSolidKind(tileAt(level, col + dir, row))) col += dir;
    const end = dir > 0 ? (col + 1) * TILE : col * TILE;
    this.beam = { x: Math.min(x, end), y: y - 1, w: Math.abs(end - x), h: 2 };
  }

  hits(r: Rect): boolean { return overlaps(this.beam, r); }

  update(): void { if (--this.life <= 0) this.dead = true; }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color;
    const thin = this.life <= 3;
    ctx.fillRect(this.beam.x, this.beam.y + (thin ? 1 : 0), this.beam.w, thin ? 1 : 2);
  }
}
```

Trace the test before running: `x = 40`, row 4; cells to the right are empty until col 19 (the border), so `col` ends at 18 and `end = 19 * 16 = 304`; `beam.x + beam.w = 304`.

- [ ] **Step 4: Turret**

```ts
import { TILE } from '../constants';
import type { Vec } from '../geom';
import { PALETTE } from '../renderer';
import type { BaseScene, Entity } from '../scene';

export class Turret implements Entity {
  constructor(readonly cell: Vec, readonly dir: 1 | -1, private readonly every: number, private readonly fire: (x: number, y: number, dir: 1 | -1) => void, private readonly phase = 0) {}
  update(scene: BaseScene): void {
    if ((scene.ticks + this.phase) % this.every === 0) this.fire(this.dir > 0 ? this.cell.x + TILE : this.cell.x, this.cell.y + 6, this.dir);
  }
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = PALETTE.tileEdge;
    ctx.fillRect(this.cell.x + 2, this.cell.y + 2, TILE - 4, TILE - 4);
    ctx.fillStyle = PALETTE.text;
    ctx.fillRect(this.dir > 0 ? this.cell.x + TILE - 4 : this.cell.x, this.cell.y + 5, 4, 3);
  }
}
```

- [ ] **Step 5: run, commit** — `pnpm test && pnpm typecheck`. Commit: `Engine: projectile gravity/homing/impact; Laser; Turret`.

---

### Task 2: Movement demos — ladders, gliding, flying

**Files:**
- Create: `src/demos/ladders.ts`, `src/demos/gliding.ts`, `src/demos/flying.ts`
- Modify: `src/demos/index.ts` (Movement group, after `variableJump`), `test/levels.test.ts` (ladder cells are standable; `FLIGHT_DEMOS`)
- Test: `test/demos-abilities.test.ts`

- [ ] **Step 1: levels test changes** — in `test/levels.test.ts`: `standable` becomes `passable(l, c, r) && (FLOOR.includes(tileAt(l, c, r + 1)) || tileAt(l, c, r) === 'ladder')`, and add `const FLIGHT_DEMOS = ['flying'];` with `if (FLIGHT_DEMOS.includes(demo.id)) return;` at the top of the per-demo test body (a goal that needs flight is exempt by design).

- [ ] **Step 2: failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { FlyScene } from '../src/demos/flying';
import { GlidePlayer } from '../src/demos/gliding';
import { LadderPlayer } from '../src/demos/ladders';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';

const step = (s: BaseScene, input: Input, held: Action[] = []): void => {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick(); s.update(input);
};

describe('ladders', () => {
  const ROWS = ['############', '#..........#', '#....H.....#', '#....H.....#', '#@...H.....#', '############'];
  it('climbs up with up held, stops at the top with gravity back, and jumps off', () => {
    const s = new BaseScene(ROWS, { player: spawn => new LadderPlayer(spawn) });
    const p = s.player as LadderPlayer;
    const input = new Input();
    for (let i = 0; i < 40; i++) step(s, input, ['right']);            // to the ladder at col 5 (x 80..96)
    for (let i = 0; i < 5; i++) step(s, input, ['up']);
    expect(p.climbing).toBe(true);
    expect(p.gravity).toBe(0);
    const y0 = p.body.y;
    for (let i = 0; i < 30; i++) step(s, input, ['up']);
    expect(p.body.y).toBeLessThan(y0);
    for (let i = 0; i < 120; i++) step(s, input, ['up']);            // past the top: climbing ends
    expect(p.climbing).toBe(false);
    expect(p.gravity).toBe(600);
    for (let i = 0; i < 40; i++) step(s, input, ['down']);
    expect(p.climbing).toBe(true);
    step(s, input, ['jump']);
    expect(p.climbing).toBe(false);
    expect(p.body.vy).toBeLessThan(0);
  });
});

describe('gliding', () => {
  it('holding jump while falling caps the fall speed', () => {
    const ROWS = ['############', '#..........#', '#..........#', '#..........#', '#..........#', '#..........#', '#..........#', '#@.........#', '############'];
    const s = new BaseScene(ROWS, { player: spawn => new GlidePlayer(spawn) });
    const p = s.player as GlidePlayer;
    s.player.moveTo({ x: 32, y: 16 });
    const input = new Input();
    for (let i = 0; i < 30; i++) step(s, input, ['jump']);            // holding jump the whole fall (the first press jumps from the air? no: not on ground)
    expect(p.body.vy).toBeLessThanOrEqual(30);
    expect(p.gliding).toBe(true);
  });
});

describe('flying', () => {
  it('the wings pickup allows free vertical movement for a while', () => {
    const s = new FlyScene();
    const input = new Input();
    s.player.moveTo(s.level.pickups[0]);                              // stand on the wings
    step(s, input);
    step(s, input);
    expect(s.flying).toBeGreaterThan(0);
    const y0 = s.player.body.y;
    for (let i = 0; i < 30; i++) step(s, input, ['up']);
    expect(s.player.body.y).toBeLessThan(y0 - 30);
    for (let i = 0; i < 600; i++) step(s, input);
    expect(s.flying).toBe(0);
    expect(s.player.gravity).toBe(600);
  });
});
```

- [ ] **Step 3: ladders.ts**

```ts
const ACCENT = '#b08a5a';
const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#.....................*................#',
  '#................H.######..............#',
  '#................H.....................#',
  '#................H.....................#',
  '#.......H.######.......................#',
  '#.......H..............................#',
  '#..@....H..............................#',
  '########################################',
  '########################################',
];

export class LadderPlayer extends Player {
  climbing = false;
  private savedGravity = 600;

  protected override control(scene: BaseScene, input: Input): void {
    const onLadder = touchesKind(scene.level, this.body, 'ladder');
    if (!this.climbing && onLadder && (input.held('up') || input.held('down'))) {
      this.climbing = true;
      this.savedGravity = this.gravity;
      this.gravity = 0;
    }
    if (this.climbing && !onLadder) this.stopClimbing();
    if (!this.climbing) { super.control(scene, input); return; }
    this.body.vy = input.held('up') ? -60 : input.held('down') ? 60 : 0;
    const dir = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
    this.body.vx = dir * 45;
    if (dir !== 0) this.facing = dir as 1 | -1;
    if (input.pressed('jump')) { this.stopClimbing(); this.body.vy = -this.jumpSpeed; }
  }

  private stopClimbing(): void {
    this.climbing = false;
    this.gravity = this.savedGravity;
  }
}
```

Scene: `LadderScene extends BaseScene` with a goal `Pickup` at `level.pickups[0]` setting `won`, HUD `won ? 'You made it! R to reset' : p.climbing ? 'climbing: ↑ ↓ to move, jump to let go' : 'hold ↑ or ↓ at a ladder to grab it'`. Demo: id `ladders`, title `Ladders`, category `Movement`, controls `[...BASE_CONTROLS, '↑ ↓: climb a ladder']`, `touch: [{ action: 'up', label: 'UP' }, { action: 'down', label: 'DOWN' }]`. Geometry: ladder 1 at col 8 rows 7–9 leads to ledge A (row 7, cols 10–15) with a one-cell gap; a jump from ledge A's end grabs ladder 2 at col 17 (rows 4–6) mid-air; its top leads to ledge B (row 4, cols 19–24) with a one-cell gap; the goal sits above ledge B.

- [ ] **Step 4: gliding.ts**

```ts
const GLIDE_FALL = 30;
export class GlidePlayer extends Player {
  gliding = false;
  protected override control(scene: BaseScene, input: Input): void {
    super.control(scene, input);
    this.gliding = !this.contacts.onGround && this.body.vy > 0 && input.held('jump');
    this.maxFall = this.gliding ? GLIDE_FALL : 260;
  }
}
```

Level (spawn row 9 col 3; steps up on the left; spike pit cols 16–23 in row 10; landing ledge row 8 cols 24–30):

```ts
const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#............###.......................#',
  '#......................................#',
  '#........###...........................#',
  '#......................................#',
  '#....###................#######........#',
  '#..@...................................#',
  '################^^^^^^^^################',
  '########################################',
];
```

`GlideScene extends BaseScene`: `falls` on `hurtByHazard` → respawn; HUD `p.gliding ? 'gliding' : 'climb the steps, run off, and HOLD jump to glide'`. Accent `'#9ee6ff'`; id `gliding`, title `Gliding`, controls `[...BASE_CONTROLS, 'hold jump while falling: glide']`. Note `maxFall` is set every tick, so the cap is also restored the tick jump is released. Geometry: the top step (row 4, cols 13–15) is 64 px above the landing ledge (row 8); at 30 px/s the glide lasts 2.1 s and covers ~190 px at run speed, more than the 128 px pit; without gliding the 0.46 s fall covers ~41 px and lands on spikes.

- [ ] **Step 5: flying.ts**

```ts
const FLY_TICKS = 480;
export class FlyPlayer extends Player {
  flying = 0;
  protected override control(scene: BaseScene, input: Input): void {
    if (this.flying > 0) {
      this.flying--;
      this.gravity = 0;
      this.body.vy = input.held('up') ? -100 : input.held('down') ? 100 : 0;
      const dir = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
      this.body.vx = dir * this.runSpeed;
      if (dir !== 0) this.facing = dir as 1 | -1;
      if (this.flying === 0) this.gravity = 600;
      return;
    }
    super.control(scene, input);
  }
}
export class FlyScene extends BaseScene {
  won = false;
  get flying(): number { return (this.player as FlyPlayer).flying; }
  constructor() {
    super(LEVEL, { accent: ACCENT, player: spawn => new FlyPlayer(spawn) });
    const [wings, goal] = this.level.pickups;
    this.entities.push(new Pickup(wings, () => { (this.player as FlyPlayer).flying = FLY_TICKS; }, ACCENT));
    this.entities.push(new Pickup(goal, () => { this.won = true; }, PALETTE.key));
  }
  protected override afterUpdate(): void {
    this.hud = [this.won ? 'You made it! R to reset' : this.flying > 0 ? `flying ${(this.flying / 60).toFixed(1)}s: ↑ ↓ to steer` : 'grab the wings'];
  }
  protected override drawHud(ctx: CanvasRenderingContext2D): void { super.drawHud(ctx); drawBar(ctx, 20, 16, 80, 4, this.flying / FLY_TICKS, ACCENT); }
}
```

Level: wings `*` on the floor near the spawn (first in reading order must be the wings: put the goal on a HIGHER row than the wings? Reading order is row-major, so the goal (row 2) would come first. Therefore destructure as `const [goal, wings] = this.level.pickups` and say so in a comment.) Goal in a high alcove (row 2, cols 30–33 boxed by `#` on row 3 so it is unreachable without flight). Accent `'#ffd166'`; id `flying`, title `Flying`, controls `[...BASE_CONTROLS, '↑ ↓: fly while the wings last']`, `touch: [{ action: 'up', label: 'UP' }, { action: 'down', label: 'DOWN' }]`. The levels test exempts `flying`.

```ts
const LEVEL = [
  '########################################',
  '#......................................#',
  '#.............................*........#',
  '#............................######....#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..@......*............................#',
  '#......................................#',
  '########################################',
  '########################################',
];
```

- [ ] **Step 6: register, run, commit** — after `variableJump`. `pnpm test && pnpm typecheck`. Commit: `Demos: ladders, gliding, flying`.

---

### Task 3: Ducking (HpScene + Turret)

**Files:**
- Create: `src/demos/ducking.ts`
- Modify: `src/demos/index.ts` (Movement, after `ladders`)
- Test: `test/demos-ducking.test.ts`

- [ ] **Step 1: failing test**

```ts
import { describe, expect, it } from 'vitest';
import { DuckPlayer, DuckScene } from '../src/demos/ducking';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import { BaseScene } from '../src/engine/scene';

const step = (s: BaseScene, input: Input, held: Action[] = []): void => {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick(); s.update(input);
};

describe('ducking', () => {
  it('shrinks the body, slows the run, and refuses to stand up under a ceiling', () => {
    const ROWS = ['############', '#..........#', '#....#######', '#@.........#', '############'];   // a 1-tile-high tunnel under cols 5-10
    const s = new BaseScene(ROWS, { player: spawn => new DuckPlayer(spawn) });
    const p = s.player as DuckPlayer;
    const input = new Input();
    step(s, input, ['down']);
    expect(p.ducking).toBe(true);
    expect(p.body.h).toBe(8);
    expect(p.body.y + p.body.h).toBe(64);               // feet still on the floor
    for (let i = 0; i < 60; i++) step(s, input, ['down', 'right']);
    expect(Math.abs(p.body.vx)).toBeLessThanOrEqual(45);
    expect(p.body.x).toBeGreaterThan(80);               // inside the tunnel
    step(s, input, ['right']);                          // release down under the ceiling
    expect(p.ducking).toBe(true);                       // no headroom: stays ducked
    for (let i = 0; i < 80; i++) step(s, input, ['right']);
    step(s, input);
    expect(p.ducking).toBe(false);                      // past the tunnel: stood up
    expect(p.body.h).toBe(14);
  });
  it('a standing player is hit by the turret bullets and a ducking one is not', () => {
    const s = new DuckScene();
    const input = new Input();
    s.player.moveTo({ x: 30 * 16, y: 9 * 16 });
    for (let i = 0; i < 200; i++) step(s, input);
    expect(s.hp.hp).toBeLessThan(3);
    const t = new DuckScene();
    t.player.moveTo({ x: 30 * 16, y: 9 * 16 });
    for (let i = 0; i < 200; i++) step(t, input, ['down']);
    expect(t.hp.hp).toBe(3);
  });
});
```

- [ ] **Step 2: ducking.ts**

```ts
const DUCK_H = 8;
const STAND_H = 14;
export class DuckPlayer extends HpPlayer {
  ducking = false;
  protected override control(scene: BaseScene, input: Input): void {
    const wants = input.held('down') && this.contacts.onGround;
    if (wants && !this.ducking) { this.ducking = true; this.body.y += STAND_H - DUCK_H; this.body.h = DUCK_H; }
    else if (!wants && this.ducking) {
      const tall = { x: this.body.x, y: this.body.y - (STAND_H - DUCK_H), w: this.body.w, h: STAND_H };
      const blocked = cellsUnder(scene.level, tall).some(c => isSolidKind(c.kind));
      if (!blocked) { this.ducking = false; this.body.y = tall.y; this.body.h = STAND_H; }
    }
    this.runSpeed = this.ducking ? 45 : 90;
    this.noJump = this.ducking;
    super.control(scene, input);
  }
}
```

Scene: `DuckScene extends HpScene` with `player: spawn => new DuckPlayer(spawn)`; a `Turret` at `level.turrets[0]` firing left every 50 ticks: `fire = (x, y, dir) => this.entities.push(new Projectile(x, y, dir, 200, ACCENT, { life: 200 }))`; in `afterUpdate` (after `tickDying`), any live `Projectile` overlapping the player body dies and calls `damage(shot.body.x)`. Bullets fly at the turret's muzzle height: place the turret in the wall at the right so its muzzle `y + 6` lands at standing head height (floor top 160 → standing body 146..160 → muzzle y = 150) and above a ducking body (152..160): the turret cell is row 9 (`y 144`), muzzle `y = 150`. A goal pickup near the turret. `act` does nothing here.

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
  '#......................................#',
  '#..@...............................*..T#',
  '########################################',
  '########################################',
];
```

HUD: `p.ducking ? 'ducking: slower, no firing, half height' : 'hold ↓ to duck under the shots'`, plus `won`. Accent `'#ffb347'`; id `ducking`, title `Ducking`, category `Movement`, controls `[...BASE_CONTROLS, 'hold ↓: duck']`, `touch: [{ action: 'down', label: 'DUCK' }]`. Respawn resets `ducking` via `onRespawn()`: set `ducking = false`, `body.h = STAND_H`.

- [ ] **Step 3: register, run, commit** — `Demos: ducking`.

---

### Task 4: Combat demos — lasers, arcing shots, homing missiles

**Files:**
- Create: `src/demos/lasers.ts`, `src/demos/arcing-shots.ts`, `src/demos/homing-missiles.ts`
- Modify: `src/demos/index.ts` (Combat, after `enemyPatrol`)
- Test: `test/demos-shots.test.ts`

All three use `ARENA` and `Respawner` with `ARENA_SPOTS`, count `hits`, and respawn the player on touch through `spawner.update() && spawner.hurtPlayer()` exactly like ranged-weapon.

- [ ] **Step 1: failing tests** — `test/demos-shots.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ArcScene } from '../src/demos/arcing-shots';
import { HomingScene } from '../src/demos/homing-missiles';
import { LaserScene } from '../src/demos/lasers';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';

const step = (s: BaseScene, input: Input, held: Action[] = []): void => {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick(); s.update(input);
};
const ROOM = ['####################', '#..................#', '#..................#', '#@.................#', '####################'];

describe('lasers', () => {
  it('one press kills every patroller on the row up to the wall', () => {
    const s = new LaserScene(ROOM, [{ cell: { x: 96, y: 48 }, dir: -1, turnAtLedges: false }, { cell: { x: 192, y: 48 }, dir: -1, turnAtLedges: false }]);
    const input = new Input();
    step(s, input);
    step(s, input, ['act']);
    expect(s.hits).toBe(2);
  });
});

describe('arcing shots', () => {
  it('a lobbed shot falls onto a patroller standing where the arc lands', () => {
    // Player on a ledge (spawn row 2, ledge cols 0-2 on row 3); enemy still on the floor (row 6, y 96).
    const ROWS = ['####################', '#..................#', '#@.................#', '###................#', '#..................#', '#..................#', '####################'];
    const s = new ArcScene(ROWS, [{ cell: { x: 168, y: 80 }, dir: 1, turnAtLedges: false }]);
    s.spawner.enemies()[0].speed = 0;                 // stands at x 170..182
    const input = new Input();
    step(s, input);
    step(s, input, ['act']);                           // from x 30, y 40: vx 200, vy0 -150, g 600 lands near x 182
    for (let i = 0; i < 120; i++) step(s, input);
    expect(s.hits).toBe(1);
  });
});

describe('homing missiles', () => {
  it('a missile fired away from an enemy behind and above still turns and hits it', () => {
    const ROWS = ['####################', '#..................#', '#.###..............#', '#..................#', '#........@.........#', '####################'];
    const s = new HomingScene(ROWS, [{ cell: { x: 32, y: 16 }, dir: 1, turnAtLedges: true }]);
    s.spawner.enemies()[0].speed = 0;
    const input = new Input();
    step(s, input, ['right']);                         // face right, away from the enemy
    step(s, input, ['act']);
    for (let i = 0; i < 200; i++) step(s, input);
    expect(s.hits).toBe(1);
  });
});
```

`spawner` must be a public readonly field on all three scenes so the tests can still the enemies.

- [ ] **Step 2: lasers.ts** — `act` with a 20-tick cooldown: `const l = new Laser(x, y, facing, level, ACCENT); entities.push(l); for (e of spawner.enemies()) if (l.hits(e.body)) { spawner.kill(e); hits++ }`. Muzzle: `x = facing > 0 ? b.x + b.w : b.x`, `y = b.y + 6`. Accent `'#ff4d6d'`; `touch: [{ action: 'act', label: 'FIRE' }]`.
- [ ] **Step 3: arcing-shots.ts** — `act` (15-tick cooldown): `new Projectile(x, b.y + 4, facing, 200, ACCENT, { gravity: 600, vy0: -150 })`; collisions as in ranged-weapon (`overlaps(shot.body, enemy.body)` → both die). `touch: [{ action: 'act', label: 'LOB' }]`.
- [ ] **Step 4: homing-missiles.ts** — `act` (30-tick cooldown): `new Projectile(x, b.y + 6, facing, 90, ACCENT, { homing: () => nearest(), turnRate: 0.06, life: 180 })` where `nearest()` returns the closest live enemy's body or null; collisions as above. `touch: [{ action: 'act', label: 'FIRE' }]`. HUD notes 'missiles turn toward the nearest enemy and give up after 3 s'.
- [ ] **Step 5: register, run, commit** — `Demos: lasers, arcing shots, homing missiles`.

---

### Task 5: Explosions and grenades (HpScene + Respawner + Explosion)

**Files:**
- Create: `src/demos/explosions.ts`, `src/demos/grenades.ts`
- Modify: `src/demos/index.ts` (Combat, after `homingMissiles`)
- Test: `test/demos-blasts.test.ts`

- [ ] **Step 1: failing tests** — `test/demos-blasts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ExplosionScene } from '../src/demos/explosions';
import { Grenade, GrenadeScene } from '../src/demos/grenades';
import type { Action } from '../src/engine/input';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';

const step = (s: BaseScene, input: Input, held: Action[] = []): void => {
  for (const a of ['left', 'right', 'up', 'down', 'jump', 'act'] as const) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick(); s.update(input);
};
const ROOM = ['####################', '#..................#', '#..................#', '#@.................#', '####################'];

describe('explosions', () => {
  it('a thrown bomb kills an enemy near its landing spot and spares the far-away thrower', () => {
    const s = new ExplosionScene(ROOM, [{ cell: { x: 112, y: 48 }, dir: 1, turnAtLedges: false }]);
    s.spawner.enemies()[0].speed = 0;                 // stands at x 114..126; the bomb lands near x 103
    const input = new Input();
    step(s, input);
    step(s, input, ['act']);
    for (let i = 0; i < 90; i++) step(s, input);
    expect(s.hits).toBe(1);
    expect(s.hp.hp).toBe(3);
  });
  it('a point-blank bomb costs the thrower exactly one heart', () => {
    const s = new ExplosionScene(ROOM, []);
    const input = new Input();
    step(s, input, ['left']);                          // face the wall at x 16
    step(s, input, ['act']);                           // the bomb spawns inside the wall and detonates at once
    for (let i = 0; i < 30; i++) step(s, input);
    expect(s.hp.hp).toBe(2);
  });
});

describe('grenades', () => {
  it('bounces once, rests, then blows after the fuse, hurting whoever stands by it', () => {
    const s = new GrenadeScene(ROOM, []);
    const input = new Input();
    step(s, input);
    step(s, input, ['act']);
    const g = s.entities.find((e): e is Grenade => e instanceof Grenade)!;
    let bounced = false;
    for (let i = 0; i < 200 && !g.resting; i++) { const before = g.body.vy; step(s, input); if (before > 0 && g.body.vy < 0) bounced = true; }
    expect(bounced).toBe(true);
    expect(g.resting).toBe(true);
    s.player.moveTo({ x: g.body.x - 8, y: 32 });        // stand next to it
    for (let i = 0; i < 170; i++) step(s, input);
    expect(s.hp.hp).toBe(3);                            // fuse still burning
    for (let i = 0; i < 20; i++) step(s, input);
    expect(g.dead).toBe(true);
    expect(s.hp.hp).toBe(2);
  });
});
```

`Grenade` is exported from the demo file; both scenes expose `spawner` and `hits`.

- [ ] **Step 2: shared helper in `src/demos/blast.ts`**

```ts
/** Apply an explosion to a scene that has hearts and a Respawner: enemies in range die, the player in range takes a hit. Returns enemy kills. */
export function detonate(scene: HpScene, spawner: Respawner, cx: number, cy: number, radius: number, color: string): number {
  const e = new Explosion(cx, cy, radius, 20, color);
  scene.entities.push(e);
  let kills = 0;
  for (const enemy of spawner.enemies()) if (e.inRange(enemy.body)) { spawner.kill(enemy); kills++; }
  if (e.inRange(scene.hp.body)) scene['damage'](cx);    // protected in HpScene; expose as `hurt(fromX)` public instead — add `hurt = (fromX: number) => this.damage(fromX)` to HpScene in this task
  return kills;
}
```

Make `damage` callable from outside cleanly: add a public `hurt(fromX: number): boolean { return this.damage(fromX); }` to `HpScene` (engine), and use `scene.hurt(cx)` here; do not use bracket access.

- [ ] **Step 3: explosions.ts** — `ExplosionScene extends HpScene` with `spawner = new Respawner(this, ARENA_SPOTS)`; `act` (30-tick cooldown) throws `new Projectile(x, b.y + 4, facing, 160, ACCENT, { gravity: 600, vy0: -120, onImpact: (px, py) => { this.hits += detonate(this, this.spawner, px, py, 40, ACCENT); } })`; `afterUpdate`: `spawner.update()`; `if (!tickDying()) { touching an enemy → damage }`. HUD: `hits`, `deaths`, 'the blast hurts them and you'. Accent `'#ff7a59'`, `touch: [{ action: 'act', label: 'BOMB' }]`.
- [ ] **Step 4: grenades.ts** — a `Grenade` entity in the demo file: body 4 × 4, `vx = facing * 140`, `vy = -160`, gravity 600 via `moveBody`; on the first floor contact: `vy = -vy * 0.5`, `vx *= 0.6`, `bounces--`; when `bounces === 0` and on the floor: `vx = vy = 0`, `resting = true`; then `fuse` counts down from 180; at 0: `dead = true` and `onBoom(cx, cy)`. Draws a 4 × 4 block and, while resting, a shrinking fuse bar above it. Scene as explosions with `detonate(..., 36, ACCENT)`. Accent `'#8fe388'`, `touch: [{ action: 'act', label: 'THROW' }]`.
- [ ] **Step 5: register, run, commit** — `Demos: explosions, grenades`.

---

### Task 6: Creeping enemies and armor

**Files:**
- Modify: `src/demos/arena.ts` (`Spot.kind`, `Creeper`)
- Create: `src/demos/creeping-enemies.ts`, `src/demos/armor.ts`
- Modify: `src/demos/index.ts` (Combat after `grenades`; Items after `checkpoint`)
- Test: `test/demos-creep-armor.test.ts`

- [ ] **Step 1: arena changes** — `Spot` gets `kind?: 'patrol' | 'seek' | 'creep'` (keep `seek?: boolean` working: `seek: true` ≡ `kind: 'seek'`). `Creeper extends Patroller`:

```ts
export class Creeper extends Patroller {
  frozen = false;
  override update(scene: BaseScene): void {
    const p = scene.player;
    const side: 1 | -1 = this.body.x < p.body.x ? -1 : 1;    // where the creeper is, from the player
    this.frozen = p.facing === side;                          // the player is looking at it
    if (this.frozen) { this.body.vx = 0; this.body.vy = Math.min(this.body.vy + 600 * DT, 260); moveBody(scene.level, this.body); return; }
    this.dir = side === -1 ? 1 : -1;                          // walk toward the player
    super.update(scene);
  }
  override draw(ctx): void { drawActor(ctx, this.body, PALETTE.enemy, this.dir); if (this.frozen) { ctx.fillStyle = PALETTE.enemy; /* cover the eye pixels */ const ex = this.dir === 1 ? [this.body.x + this.body.w - 7, this.body.x + this.body.w - 4] : [this.body.x + 2, this.body.x + 5]; ctx.fillRect(ex[0], this.body.y + 4, 2, 2); ctx.fillRect(ex[1], this.body.y + 4, 2, 2); } }
}
```

`Respawner.spawn` picks the class by `kind ?? (seek ? 'seek' : 'patrol')`.

- [ ] **Step 2: failing tests** — creeper: player faces right, creeper to the right → frozen the same tick; player presses left for one tick (facing flips) → creeper moves on that tick (`frozen === false`, `body.x` decreased). Armor: pick up the shield (`armor === 1`, HUD flag), walk into a spike: `hp` stays 3, `armor` 0, no knockback (`vx` unchanged sign), and the shield pickup returns 120 ticks later.

- [ ] **Step 3: creeping-enemies.ts** — `CreepScene extends HpScene` with spots `kind: 'creep'` (two creepers on the floor, one on a ledge) in a wide level; `afterUpdate`: `spawner.update()`; `if (!tickDying()) for e of enemies: if overlaps → damage`. HUD: 'they only move while your back is turned'. Accent `'#4fb3e8'`.
- [ ] **Step 4: armor.ts** — `ArmorScene extends HpScene`; a shield `Pickup` at `level.pickups[0]` setting `hp.armor = 1`, re-placed 120 ticks after it is used (`armor` went from 1 to 0); spikes in the floor and one patroller; `afterUpdate`: `tickDying`, hazards and enemy touches → `damage`. HUD: `armor > 0 ? 'armored: the next hit bounces off' : 'grab the shield'`. Draw the shield pickup with the same outline `HpScene.drawHud` uses (factor a `drawShield(ctx, x, y)` into renderer.ts and use it in both). Accent `'#8ce8ff'`; category `Items`.
- [ ] **Step 5: register, run, commit** — `Demos: creeping enemies, armor`.

---

### Task 7: Release check for Plan B

- [ ] `pnpm test && pnpm typecheck && pnpm build`; the catalogue lists 39 demos; `test/levels.test.ts` passes (flying exempt).
- [ ] Browser pass over the eleven new demos and the menu (6 groups: 10/10/4/9/4/2 = 39): loads, hints, R, Escape, no console errors, screenshots; touch overlay labels (UP/DOWN on ladders and flying, DUCK, FIRE/LOB/BOMB/THROW).
- [ ] No publish/push from the task; the controller merges, pushes, deploys.

## Self-review notes

- Coverage: spec demos 1–11 → Tasks 2–6; engine projectile/laser/turret → Task 1; `Spot.kind` + `Creeper` → Task 6; `HpScene.hurt` public → Task 5; levels test ladder/flight rules → Task 2.
- Consistency: `Projectile` ctor keeps `(x, y, dir, speed?, color?)` positional so ranged-weapon and `test/entities.test.ts` stay green; `Laser.beam` is a `Rect`; `Turret.fire(x, y, dir)`; `detonate` returns kills.
- Review Focus mapping: (1) T3 tunnel test; (2) T1 life test; (3) T2 ladder top/bottom test; (4) T5 point-blank test; (5) T6 same-tick freeze test.
