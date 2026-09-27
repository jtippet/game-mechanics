# mechanics — expansion: 22 more mechanics

Date: 2026-09-27 · Status: approved in conversation, awaiting implementation plan
Builds on: `2026-09-26-mechanics-sampler-design.md` (v1, shipped at main c91ea7c+).

## Purpose

Same as v1: a show-and-tell sampler where each demo isolates one mechanic on
the same flat art. This expansion adds 22 demos from Jeff's list of
2026-09-27 and regroups the menu into six groups so 40 cards stay scannable.

Everything in the v1 spec still binds: own engine, zero runtime dependencies,
procedural art with one accent per demo, hash routing, relative base, the
host only in `scripts/deploy.sh`, `R` resets, `Escape` returns, control hints
on screen, Node-only vitest, the 600-tick smoke test and the level
reachability test as gates.

Two facts learned in v1 that bind every new level:

- A base jump (230 px/s) rises ~42 px. Anything a player must reach by a
  single base jump is at most **2 tiles** up and at most **3 cells** across
  (2 cells when rising 2 tiles). Demos that raise `jumpSpeed` say so.
- A scene that respawns the player resets every piece of demo-specific
  player state it owns.

## Menu regrouping

Six groups, in this order. Existing ids keep their URLs; only the group
changes.

| Group | Demos (menu order) |
|---|---|
| Movement | run-and-jump, double-jump, wall-climb, dash, coyote-buffer, variable-jump, **ladders**, **ducking**, **gliding**, **flying** |
| Combat | ranged-weapon, melee-attack, hit-points, enemy-patrol, **lasers**, **arcing-shots**, **homing-missiles**, **explosions**, **grenades**, **creeping-enemies** |
| Items | powerup, collectibles, checkpoint, **armor** |
| Platforms and surfaces | moving-platforms, one-way, **crumbling-platforms**, **interval-platforms**, **ice-and-sand**, **conveyor-belts**, **slides**, **portals**, **levers** |
| Hazards and obstacles | hazards, **landmines**, **flame-jets**, **rolling-rocks** |
| World | parallax, keys-and-doors |

`Category` gains `'Platforms and surfaces'` and `'Hazards and obstacles'`;
`CATEGORIES` lists all six in this order. The menu renders one section per
group as today.

## Engine extensions

All under `src/engine/`, demo-agnostic, unit-tested. Nothing here imports
from `src/demos/`.

### Tile kinds

`parseLevel` learns these characters. Solidity is decided by `physics.ts`'s
`blocks()`; surfaces are queried by demos with `tileAt`/`cellsUnder`.

| char | kind | solid | notes |
|---|---|---|---|
| `i` | `ice` | yes | drawn pale blue with a sheen line |
| `s` | `sand` | yes | drawn tan with dots |
| `>` | `beltR` | yes | conveyor moving right; chevrons animate |
| `<` | `beltL` | yes | conveyor moving left |
| `H` | `ladder` | no | drawn as two rails and rungs |
| `L` | marker: lever | no | recorded in `level.levers` |
| `P`, `Q` | marker: portal | no | recorded in `level.portals` as `{ id: 'P'\|'Q', x, y }`, two per id |
| `~` | marker: slide waypoint | no | recorded in `level.slides` in reading order (row-major); demos group them |
| `M` | marker: mine | no | `level.mines` |
| `F` | marker: flame jet | no | `level.jets` |
| `R` | marker: rock start | no | `level.rocks` |
| `T` | marker: turret | no | `level.turrets` |

Markers are `empty` tiles with a recorded pixel top-left, like `*`/`k`/`d`.
`Level` gains the arrays named above. `tilemap.ts` exports
`surfaceUnder(level, body): TileKind | null` — the kind of the cell directly
under the body's feet (probe 1 px below, majority by x-overlap, `null` in
the air).

`renderer.ts` draws the new kinds. Belts animate with `ticks` passed to
`drawLevel` (a new optional last parameter, default 0).

### Solid platform entities

`MovingPlatform`'s carry-and-catch logic moves into a base class
`PlatformBody` (`src/engine/entities/platform-body.ts`):

```ts
abstract class PlatformBody implements Entity {
  rect: Rect; solid = true; riding = false;
  protected abstract move(scene: BaseScene): { dx: number; dy: number };  // per tick
  update(scene): void  // move(), then carry/catch exactly as MovingPlatform does today, skipped when !solid
  draw(ctx): void      // plank; subclasses may override
}
```

Subclasses:

- `MovingPlatform(from, to, w?, period?)` — unchanged behaviour and tests.
- `CrumblingPlatform(cell, w, kind: 'fall' | 'fade')` — solid and still until
  a player has stood on it for 30 ticks; then `fall`: accelerates downward
  (gravity 600) and stops being solid once it leaves the level; `fade`:
  blinks for 20 ticks then `solid = false` and invisible. Either kind
  returns to its cell, solid, 180 ticks after it went.
- `IntervalPlatform(cell, w, onTicks, offTicks, phase)` — solid during the
  on phase, invisible and non-solid during off; blinks for the last 30 ticks
  of the on phase.

A non-solid platform never carries or catches. A player standing on a
platform when it stops being solid simply starts falling next tick.

### Projectiles

`Projectile` gains options `{ gravity?: number; homing?: () => Rect | null; turnRate?: number }`:
gravity adds to `vy` each tick (arcing shots); `homing` returns the target
rect each tick and the projectile steers its velocity toward the target
centre by at most `turnRate` radians per tick, keeping its speed.
Projectiles die on wall contact or after `life` ticks as today.

New `Laser` entity (`src/engine/entities/laser.ts`): constructed with
`(x, y, dir, level)`; at construction it resolves the beam instantly:
from `x` along the row until the first blocking cell, storing `x0..x1`.
`hits(rect): boolean` tests overlap with the 2 px tall beam. It draws for
`life` (8) ticks in its colour, fading, then dies. Instant: the scene checks
`hits` on the tick of firing.

### Explosion

`Explosion(cx, cy, radius, ticks = 20)` (`src/engine/entities/explosion.ts`):
`inRange(rect): boolean` (circle vs rect); the owning scene applies damage
on the tick it is created; the entity only draws an expanding ring and dies
after `ticks`.

### Damage model

`HpPlayer` (hearts, invulnerability, knockback, dying window) moves from
the hit-points demo into `src/engine/entities/hp-player.ts` together with a
`HpScene` base in `src/engine/hp-scene.ts` that owns the dying/respawn
sequence and the hearts HUD. `HpPlayer` gains `armor = 0`: `hurt()` with
`armor > 0` consumes one armor instead of a heart and returns true.
`HpScene.drawHud` draws a shield outline after the hearts while
`armor > 0`. The hit-points demo becomes a thin subclass. Explosions,
grenades, landmines, flame jets, rolling rocks, lasers, creeping enemies,
ducking, and armor all extend `HpScene`.

### Player hooks

- `Player.hitbox()` returns the body rect by default; `Player.draw` and every
  overlap check in the engine use `body` (unchanged). Ducking sets the
  body's `h` to 8 (and shifts `y` by 6) while down is held and there is
  headroom to stand back up; `moveBody` handles the smaller body naturally.
- `gravity`, `maxFall`, `runSpeed` are already public tunables. Gliding sets
  `maxFall = 60` while jump is held during a fall. Flying sets
  `gravity = 0` and lets up/down set `vy = ±100` while the powerup runs.

### Obstacles

- `RollingRock(cell, dir, speed = 60)` (`entities/rolling-rock.ts`): a
  16 × 16 solid body that moves horizontally under gravity, reverses at
  walls, and pushes the player: after its own move, if it overlaps the
  player, the player is shoved out along x; if the shove is blocked by a
  wall (player would overlap a solid cell), the scene is told via
  `crushed = true` for that tick. Drawn as a circle with a rotating mark.
- `FlameJet(cell, dir: 'up' | 'down' | 'left' | 'right', onTicks, offTicks, phase)`
  (`entities/flame-jet.ts`): a 16 × 32 hazard rect extending from the cell in
  `dir`, `active` during the on phase, flickering for the last 20 ticks of
  the off phase as a warning. `hits(rect)`.
- `Chute(waypoints: Vec[], speed = 120)` (`entities/chute.ts`): when the
  player overlaps the first waypoint's cell, the scene gives control to the
  chute: the player's velocity is set toward the next waypoint each tick
  until the last is reached, then control returns with the exit velocity.
  Jumping is disabled while in a chute. Used for slides and waterfalls.
- `Portal(a: Vec, b: Vec, twoWay: boolean)` (`entities/portal.ts`): two
  16 × 16 pads; entering `a` moves the player to `b` (and `b` to `a` when
  two-way), keeping velocity, with a 30-tick cooldown during which no pad
  triggers. Drawn as rings in the accent, the one-way exit as a dashed ring.
- `Lever(cell, onToggle)` (`entities/lever.ts`): a switch the player toggles
  with `act` while overlapping its cell; drawn as a base with a handle
  leaning left or right.
- `Turret(cell, dir, everyTicks, fire: () => void)` (`entities/turret.ts`):
  a wall-mounted emitter that calls `fire` on a fixed interval. Used by
  ducking (bullets at head height) and by nothing else in this expansion.

## The 22 demos

Each is one file in `src/demos/` with its own level literal (40 × 12 unless
noted), one accent, control hints, and a scene that resets its own state on
respawn. "HpScene" means it uses hearts and the shared dying sequence.

**Movement**

1. **ladders** — `H` columns. Overlapping a ladder and pressing up or down
   enters climb mode: gravity off, `vy = ±60`, `vx` from left/right at half
   speed, jump leaves the ladder with a normal jump; walking off the top or
   bottom leaves it. Level: three ladders of different heights linking
   ledges; a goal pickup at the top.
2. **ducking** — hold down: body 12 × 8, `runSpeed` 45, `act` does nothing;
   standing back up is refused while a solid cell would overlap the tall
   body. A turret fires bullets along the corridor at standing head height;
   ducking under them is the only way through. HpScene, 3 hearts.
3. **gliding** — hold jump while falling: `maxFall = 60`. Level: a gap too
   wide to jump but crossable by gliding from a high ledge, with spikes
   below; HUD shows "gliding" while active.
4. **flying** — a `*` powerup grants flight for 480 ticks: gravity 0, up/down
   move at 100 px/s, a countdown bar. Goal pickup high up, unreachable
   otherwise (the reachability test exempts this demo's goal by listing its
   id in the test's `FLIGHT_DEMOS`).

**Combat**

5. **lasers** — `act` fires a `Laser` along the row; every patroller it
   crosses dies; 20-tick cooldown; beam drawn 8 ticks. Arena spots as in
   ranged-weapon. Uses `Respawner`.
6. **arcing-shots** — `act` lobs a projectile at 200 px/s with `gravity`
   600 and an upward component of 150; hits patrollers; 15-tick cooldown.
   Enemies on ledges above and below the player.
7. **homing-missiles** — `act` fires a 90 px/s projectile with `homing`
   toward the nearest live patroller and `turnRate` 0.06; life 180; 30-tick
   cooldown. Missiles die on walls.
8. **explosions** — `act` throws a bomb (arcing projectile) that explodes on
   its first contact (wall or enemy) with radius 40: every patroller in
   range dies, and the player in range takes one heart. HpScene.
9. **grenades** — like explosions, but the grenade bounces once (vy halves
   and flips on a floor hit), then sits with a 180-tick fuse shown as a
   shrinking bar above it, then explodes. HpScene.
10. **creeping-enemies** — `Creeper extends Patroller`: it moves only while
    the player faces away from it (facing sign points away from the
    creeper's x) and freezes otherwise; drawn with closed eyes when frozen.
    Touching one costs a heart. HpScene.

**Items**

11. **armor** — a shield pickup sets `armor = 1`; the next hit is absorbed
    with a flash and no knockback; the pickup returns after 120 ticks.
    Spikes and one patroller to test it on. HpScene.

**Platforms and surfaces**

12. **crumbling-platforms** — two rows of `CrumblingPlatform`s over a pit,
    upper row `fall`, lower row `fade`; HUD says which is which; spikes in
    the pit respawn.
13. **interval-platforms** — a run of `IntervalPlatform`s with alternating
    phases over spikes; on 120 / off 90 ticks.
14. **ice-and-sand** — a floor of `#`, then `i`, then `s`. On ice
    `friction = 80`, `accel = 300`; on sand `runSpeed = 50`, `accel = 400`,
    `friction = 1200`; on stone the defaults. HUD names the current surface.
15. **conveyor-belts** — three belts: one `>` at 140 px/s (faster than you
    walk), one `<` at 40 px/s (slower), one `>` at 90 (equal). The belt adds
    its velocity to the player's x each tick while standing on it (applied
    as a position shift, so the player can still run against it).
16. **slides** — a diagonal slide (waypoints down and right) and a vertical
    waterfall (waypoints straight down, then a push off the ledge). Entering
    either takes control until the end.
17. **portals** — a two-way pair (`P`) across a wall and a one-way pair (`Q`)
    from a pit up to a ledge; HUD counts teleports.
18. **levers** — two levers, each toggling a door (`d` cells) that gates a
    corridor to a goal pickup; `act` at a lever flips it. Doors close only
    if the player is not inside them.

**Hazards and obstacles**

19. **landmines** — `M` markers: stepping on one arms it (it starts blinking),
    it explodes 45 ticks later with radius 32; the player loses a heart if
    still in range; mines return after 240 ticks. HpScene.
20. **flame-jets** — `F` markers with `up` jets along a corridor, on 120 /
    off 120 with staggered phases; touching an active jet costs a heart.
    HpScene.
21. **rolling-rocks** — `R` markers: rocks roll along the floor, reversing at
    walls, shoving the player; being crushed against a wall costs a heart
    and respawns. HpScene.

**World**

22. (no new World demos; keys-and-doors and parallax remain.)

That is 21 new demo files; **flying** counts as the 22nd mechanic in Jeff's
list but shares its file structure with the others — the list above is
the 22 he asked for: ladders, ducking, gliding, flying, lasers,
arcing-shots, homing-missiles, explosions, grenades, creeping-enemies,
armor, crumbling-platforms, interval-platforms, ice-and-sand,
conveyor-belts, slides, portals, levers, landmines, flame-jets,
rolling-rocks = 21 files, plus the seeker already added to enemy-patrol on
2026-09-27 makes 22 mechanics.

## Touch controls (shipping separately, 2026-09-27)

Every demo gets on-screen touch controls: hidden until the page sees a touch,
then a row of buttons in its own strip below the canvas (never over the
action; the canvas is re-fitted to leave room for it) with ◀ ▶ JUMP plus any
extra buttons the demo declares via `Demo.touch` (`{ action, label }[]`, e.g.
`SHOOT`, `DASH`, `CLIMB`, `DROP`). Every new demo in this expansion that uses
`act`, `up`, or `down` declares the matching button with a plain-word label.

## Testing

- Engine: unit tests per new module (tilemap kinds and markers,
  `surfaceUnder`, `PlatformBody` subclasses, projectile gravity and homing,
  `Laser` resolution, `Explosion.inRange`, `HpPlayer.armor`, rock shove and
  crush, flame-jet phases, chute traversal, portal cooldown, lever toggle).
- Demos: the catalogue smoke test (now 39 demos) and the reachability test
  (with `FLIGHT_DEMOS` exempting goals that need flight, ladders counted as
  standable-through, portals treated as edges).
- Each demo task adds one focused behaviour test as in v1.
- Release check in a browser over all 39 demos before publishing, as in v1.

## Not in scope

Sound, persistence, gamepad, a level editor, enemy AI beyond seek/creep,
projectiles fired by enemies other than the ducking turret, CI deploy.
