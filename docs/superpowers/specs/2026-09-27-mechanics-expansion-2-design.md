# Mechanics sampler: expansion 2 (2026-09-27)

Jeff's asks, verbatim in spirit: a taller jump on parallax so its platforms
are reachable and vertical parallax shows; a wraparound room; damage over
time from a poison pit (one heart a second for five seconds); an
auto-scrolling level where falling behind kills and restarts; and one-way
and two-way teleporters.

## Rulings

- **Teleporters already exist.** The `portals` demo is pads that instantly
  move the player to a linked pad, one pair two-way and one pad one-way,
  which is the teleporter ask exactly. No duplicate demo: `portals` is
  retitled "Teleporters" (URL unchanged) and its blurb says "instantly".
  Jeff can overrule.
- **Parallax jump** is 290 (the hit-points value), rising ~70 px. The
  platforms are three tiles up. The standard 42 px jump also never left the
  camera's 16 px vertical dead zone, which is why the vertical parallax was
  invisible; 70 px does.
- **Wraparound** is a level flag (`Level.wrap`), not a scene trick: `tileAt`
  reads modulo the level size, so `moveBody` collides correctly while a body
  straddles the seam. The scene re-homes the body once it is entirely past
  an edge and draws a ghost copy while straddling. Floor and ceiling holes
  share columns, so a drop loops until the player steers onto the platform.
- **Damage over time** is a `poison` tile (`p`, passable, drawn as a green
  pool). Touching it sets a 300-tick timer, refreshed on every touch; while
  the timer runs a heart drains every 60 ticks, on a clock that runs from
  the first touch (standing in the pool keeps costing). The drain is a new
  `HpScene.drain()`: no knockback, no invulnerability, armor does not help.
  Eight hearts, so one quick crossing is survivable and a second is not.
- **Auto-scroll** advances the camera at 48 px/s (run speed is 90) via a
  new `BaseScene.updateCamera()` hook the scene overrides. The screen's
  right edge is a wall for the player; once the body is entirely left of
  the screen the player dies, respawns, and the camera returns to 0. At the
  end the scroll stops and the HUD says "cleared". The level is laid so
  "hold right, jump at a wall or a pit" gets through, and a test drives
  exactly that bot.

## Groups

Combat gains Damage over time (after Creeping enemies); World gains
Wraparound room and Auto-scrolling level (after Keys and doors). 42 demos.
