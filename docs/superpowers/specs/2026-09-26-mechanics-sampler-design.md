# mechanics — a sampler of 2D game mechanics

Date: 2026-09-26 · Status: approved in conversation, awaiting implementation plan

## Purpose

A self-contained single-page web app that shows, one at a time, the mechanics
that 2D platform games are built from: double jump, wall climb, ranged weapon,
parallax scroll, hit points, and so on. It is a **show-and-tell for other
people**, not a game and not a design document. Someone who has never seen
the code should be able to open the page, pick a mechanic from the menu, and
feel it under their thumbs within a few seconds.

Success looks like: a friend picks "double jump", reads the two-line hint,
presses jump twice in the air, and says "oh, *that's* what that is".

Two consequences follow from that purpose and drive everything below:

- **Polish over breadth per demo.** Every demo shows its controls on screen,
  works on a phone, resets in one key, and never freezes the tab.
- **The art is boring on purpose.** Every demo draws the same flat tiles and
  the same square hero, so the one thing that changes between demos is the
  mechanic being shown.

## Constraints

- **Host-independent.** The build is a `dist/` directory of `index.html` and
  hashed assets that works from any web server at any path. No server-side
  routing, no CDN, no runtime network request, no environment variable. The
  only place a hostname appears is the deploy script and the README.
- **Own engine.** TypeScript, Canvas 2D, Vite. No game framework, no React,
  no `@tippet/ui`. Zero runtime dependencies. The engine is small enough to
  read in one sitting and is itself part of what the sampler demonstrates.
- **First host is static.tippet.net** (`/srv/static/mechanics/` on
  static-web0, plain nginx, `try_files $uri $uri/ =404`, autoindex on, SSO at
  edge0). Reached by rsync as root over the operator key from dev0. There is
  no CI deploy path to that host today; adding one is a substrate change that
  needs Jeff's go, so it is out of scope here.

## Not in scope

- A comparison toggle that switches the featured mechanic off (considered
  and dropped).
- Tunable parameters, sliders, or explanatory prose beyond a one-line blurb
  and a control hint.
- Sound.
- Persistence of any kind (no scores, no settings, no progress).
- Gamepad input.
- A CI deploy to static-web0.

## Architecture

```
index.html
src/
  main.ts            boot: router + shell + loop
  shell/             DOM chrome: menu, header, hint panel, touch bar
  engine/            reusable, demo-agnostic, unit-tested
    loop.ts          fixed 60 Hz step, render per animation frame
    input.ts         keyboard + touch → abstract actions with edge detection
    tilemap.ts       ASCII level → tile grid; tile queries
    physics.ts       AABB body vs tilemap, axis-separated, contact flags
    camera.ts        follow + clamp + parallax offset
    renderer.ts      procedural tiles, bodies, HUD text; integer scaling
    entities/        player, patrol enemy, projectile, pickup, moving platform
    scene.ts         Scene interface + a base class wiring the above together
  demos/
    index.ts         the catalogue: an ordered array of Demo objects
    double-jump.ts   one file per mechanic
    ...
scripts/
  deploy.sh          build + rsync to static-web0 (the only host-specific file)
test/                vitest; engine units + a catalogue smoke test
.forgejo/workflows/ci.yml
```

### Shell and routing

One `index.html`. The page has a header (title, and a back link when a demo is
open), the canvas, a hint panel listing the demo's controls, and a touch bar
that is shown only when `(pointer: coarse)` matches.

Routing is by hash. `#/` (or no hash) shows the menu; `#/<demo-id>` opens that
demo. The menu is plain DOM: one section per category, one button per demo
showing its title and blurb. `Escape` in a demo returns to the menu. Unknown
ids show the menu.

Vite builds with `base: './'` so asset URLs are relative and the bundle works
at `/` or `/mechanics/`.

### Engine

**Coordinates and scale.** The logical viewport is 320 × 180 pixels, tiles are
16 px. The canvas is drawn at logical size and scaled up by the largest integer
that fits the available width, with `imageSmoothingEnabled = false`, so pixels
stay square and crisp. Resizing the window rescales; nothing in a demo knows
about device pixels.

**Loop.** `requestAnimationFrame` drives an accumulator that calls
`scene.update(input)` at exactly 60 Hz (`dt` is a constant `1/60`), then
`scene.draw(ctx, camera)` once per frame. An accumulator cap of a quarter
second prevents a spiral after a background tab resumes. A throw inside
`update` or `draw` stops the scene, paints the error message and "Press R to
reset" over the canvas, and leaves the menu reachable. Nothing else in the
page dies.

**Input.** A single `Input` object exposes, for each abstract action (`left`,
`right`, `up`, `down`, `jump`, `act`, `reset`), `held(a)` and `pressed(a)`
(true only on the tick the action went down). Keyboard mapping: arrows or
WASD for direction, Z or Space for jump, X for act, R for reset, Escape for
menu. Touch buttons in the shell dispatch the same actions. Edges are latched
between ticks so a tap shorter than a tick still registers. Demos never see
key codes or pointer events.

**Tilemap.** A level is an array of equal-length strings. Characters:

| char | tile          | behaviour                                              |
|------|---------------|--------------------------------------------------------|
| `.`  | empty         |                                                        |
| `#`  | solid         | blocks all four sides                                  |
| `-`  | one-way       | blocks only a body falling onto it from above          |
| `^`  | spike         | non-solid; a body overlapping it is "hurt"             |
| `\|` | climbable     | solid; a body touching its side may cling and climb    |
| `@`  | spawn         | empty; records the player start                        |
| `*`  | pickup        | empty; records a pickup position (demos decide what)   |
| `k`  | key           | empty; records the key position                        |
| `d`  | door          | solid until the demo clears the cell (keys and doors)  |

Unknown characters are a parse error. `parseLevel` returns the grid, the
spawn, and the recorded marker positions. Every demo's level is a literal in
its own file, so a demo is readable top to bottom.

**Physics.** One pure function moves an axis-aligned body through the grid:
apply velocity on X, resolve against solid tiles, then on Y, resolve against
solid and (when falling) one-way tiles. It returns contact flags: `onGround`,
`onCeiling`, `onWallLeft`, `onWallRight`. Gravity, friction, and speed caps
are the demo's business (the base player applies sensible defaults). Bodies
never tunnel: the move is split into sub-steps no larger than a tile. Moving
platforms are handled by the platform entity carrying any body standing on it
before the body's own move.

**Camera.** Follows a target point with a small dead zone, clamped to the
level's pixel bounds. Exposes `apply(ctx, parallax = 1)` so a background layer
drawn with `parallax = 0.5` scrolls at half speed.

**Renderer.** Everything is drawn procedurally with `fillRect` and a handful of
paths. No image assets. Palette and shapes are fixed here and nowhere else:

- background: near-black blue
- solid tile: slate square with a 1 px lighter top edge
- one-way platform: a thin plank across the top third of the cell
- spike: two small triangles
- climbable: vertical hatching on a darker cell
- player: 12 × 14 rounded block, warm color, two eye pixels facing the way it
  moves
- enemy: same shape in a cool hue
- projectile: 4 × 2 bar; pickup: 6 px diamond; key and door: outline shapes
- HUD text: the browser's monospace at a size that renders whole pixels

Each demo may pick **one accent color** for the thing it features (the second
jump's puff, the dash trail, the health bar) and nothing else.

**Entities.** A minimal shared set used across demos: `Player` (a body with
run, jump, gravity, facing, hurt state), `Patroller` (walks, turns at walls or
ledges), `Projectile`, `Pickup`, `MovingPlatform`. Each has `update(scene)`
and `draw(ctx)`. There is no component system; a demo that needs something
unusual subclasses or writes it inline.

**Scene.** The contract every demo fulfils:

```ts
interface Scene {
  update(input: Input): void;   // exactly one 60 Hz tick
  draw(ctx: CanvasRenderingContext2D, camera: Camera): void;
}
```

A `BaseScene` holds the level, the player, a list of entities, the camera,
and does the boring parts (physics, culling, HUD). Most demos extend it and
override one or two hooks.

### Demo contract

```ts
interface Demo {
  id: string;            // URL slug, e.g. "double-jump"
  title: string;
  category: 'Movement' | 'Combat' | 'Items' | 'World';
  blurb: string;         // one sentence, shown in the menu and hint panel
  controls: string[];    // e.g. ["← → move", "Z jump (twice in the air)"]
  create(): Scene;       // a fresh scene every time; R calls this again
}
```

`src/demos/index.ts` exports the catalogue as an ordered array. Adding a demo
is one new file and one line in that array.

## The catalogue (v1, all 18)

**Movement**

1. **Run and jump** — the baseline: acceleration, friction, gravity, a single
   jump. Everything else assumes this.
2. **Double jump** — a second jump in the air, once, with a visible puff.
3. **Wall climb and wall jump** — cling to `|` tiles, slide slowly, jump away.
4. **Dash** — a short burst in the facing direction, brief cooldown, trail.
5. **Coyote time and jump buffering** — jump still works a few ticks after
   leaving a ledge, and a jump pressed just before landing fires on landing.
   The level is a row of gaps that are annoying without it.
6. **Variable jump height** — release the button early for a short hop.

**Combat**

7. **Ranged weapon** — fire a projectile in the facing direction; it hits
   walls and patrollers.
8. **Melee attack** — a short-lived hit box in front of the player.
9. **Hit points** — a health bar, damage from spikes and enemies, knockback,
   invulnerability flicker, and a death-and-respawn.
10. **Enemy patrol** — patrollers that turn at walls and at ledges.

**Items**

11. **Powerup** — a pickup grants a timed effect (speed) with an on-screen
    timer.
12. **Collectibles** — coins and a counter; collect them all for a message.
13. **Checkpoint and respawn** — touch a flag, die on spikes, return there.

**World**

14. **Parallax scroll** — two background layers at different scroll factors.
15. **Moving platforms** — horizontal and vertical, carrying the player.
16. **One-way platforms** — jump up through, stand on, drop through with
    down + jump.
17. **Hazards** — spikes and a respawn.
18. **Keys and doors** — a key unlocks a door tile that then becomes passable.

Every demo: control hints on screen, `R` resets, `Escape` returns to the menu.
Each level fits in a few screens at most; the camera follows the player.

## Input on touch

When `(pointer: coarse)` matches, the shell shows a bar under the canvas with
four large buttons: left, right, jump, act. Buttons respond to `pointerdown`
and `pointerup` and support sliding a thumb between left and right without
lifting. The bar dispatches to the same `Input` object as the keyboard. Reset
and back are ordinary DOM buttons in the header on every device.

## Testing

Vitest, Node only, no browser or canvas in tests:

- `tilemap`: parse examples, reject unknown characters and ragged rows,
  report the spawn and markers.
- `physics`: a body falling onto solid ground stops with `onGround`; walking
  into a wall sets the wall flag and zeroes X velocity; falling through a
  one-way from below passes, landing from above stops; fast bodies do not
  tunnel through a one-tile wall.
- `input`: `pressed` is true for exactly one tick; a down-and-up within one
  tick still yields one `pressed`.
- `camera`: clamps to bounds; parallax offset scales.
- `catalogue`: every demo has a unique id and a valid category, and its scene
  survives 600 ticks under a scripted input sequence (walk right, jump, act)
  without throwing and with a finite player position. `draw` is exercised
  against a stub context that records calls, so a draw-time crash also fails.

Anything visual is checked by hand in a browser before a release.

## CI

`.forgejo/workflows/ci.yml`: one docker job on `node:22-bookworm`, checkout of
the pushed sha with the run's token (the pattern lux uses), then `pnpm install
--frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build`. No secrets
are needed: there is no private registry dependency. No deploy job.

## Deploy

`scripts/deploy.sh`: `pnpm build`, then

```
rsync -a --delete dist/ root@10.180.1.108:/srv/static/mechanics/
```

using whatever key the operator has for the homelab fleet. The README says
this and says why it is manual. If a CI deploy is wanted later, Homelab has
described the shape (a `staticpub` member with a forced-command rsync limited
to the subdirectory, plus a repo deploy key) and it needs Jeff's go.

## Error handling

- Level parse errors throw at `create()` with the row and column; the loop's
  catch shows them over the canvas.
- A throw in `update` or `draw` freezes the scene, overlays the message, and
  offers reset. The menu stays reachable.
- Resizing to a viewport narrower than 320 px scales by 1 and lets the canvas
  overflow horizontally rather than blur.

## Open questions

None. Everything above was agreed in conversation on 2026-09-26.
