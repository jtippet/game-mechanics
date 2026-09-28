import { describe, expect, it } from 'vitest';
import { autoScroll, AutoScrollScene, DEATH_TICKS, SCROLL_SPEED } from '../src/demos/auto-scroll';
import { damageOverTime, DRAIN_TICKS, PoisonScene, POISON_TICKS } from '../src/demos/damage-over-time';
import { parallax, PARALLAX_JUMP } from '../src/demos/parallax';
import { portals } from '../src/demos/portals';
import { wraparound, WrapScene } from '../src/demos/wraparound';
import { TILE, VIEW_W } from '../src/engine/constants';
import { Input } from '../src/engine/input';
import type { BaseScene } from '../src/engine/scene';
import { parseLevel, tileAt, touchesKind } from '../src/engine/tilemap';
import { stubContext } from './stub-context';

type Action = 'left' | 'right' | 'jump' | 'up' | 'down' | 'act';
/** Runs one tick with exactly these actions held (a held jump is re-pressed only on its first tick, like a real key). */
const step = (s: BaseScene, input: Input, held: Action[]): void => {
  for (const a of ['left', 'right', 'jump', 'up', 'down', 'act'] as Action[]) { if (held.includes(a)) input.press(a); else input.release(a); }
  input.tick();
  s.update(input);
};
const bottom = (s: BaseScene): number => s.player.body.y + s.player.body.h;

describe('parallax: the platforms are reachable and the camera lifts', () => {
  it('uses the taller jump', () => {
    expect(PARALLAX_JUMP).toBe(290);
    expect((parallax.create() as BaseScene).player.jumpSpeed).toBe(PARALLAX_JUMP);
  });

  it('a run and a jump from the floor lands on the first platform, and the camera rose on the way', () => {
    const s = parallax.create() as BaseScene;
    const input = new Input();
    const restY = s.camera.y;
    // Run right until just short of the platform (cols 11-14, row 11), then jump while still holding right.
    while (s.player.body.x < 9 * TILE) step(s, input, ['right']);
    let minCamY = restY;
    for (let t = 0; t < 90; t++) {
      step(s, input, t < 10 ? ['right', 'jump'] : ['right']);
      minCamY = Math.min(minCamY, s.camera.y);
      if (bottom(s) === 11 * TILE && s.player.body.vy === 0) break;
    }
    expect(bottom(s)).toBe(11 * TILE);                         // standing on the platform
    expect(s.player.body.x).toBeGreaterThanOrEqual(11 * TILE - 2);
    expect(minCamY).toBeLessThan(restY);                        // the jump lifted the camera, so the layers moved vertically
  });

  it('a jump from a platform lifts the camera further than a jump from the floor', () => {
    const s = parallax.create() as BaseScene;
    const input = new Input();
    for (let t = 0; t < 40; t++) step(s, input, []);                // settle: the spawn cell is two rows above the floor
    expect(s.player.body.vy).toBe(0);
    const floorRest = s.camera.y;
    let floorMin = floorRest;
    for (let t = 0; t < 60; t++) { step(s, input, t < 10 ? ['jump'] : []); floorMin = Math.min(floorMin, s.camera.y); }
    s.player.moveTo({ x: 12 * TILE, y: 10 * TILE });
    for (let t = 0; t < 30; t++) step(s, input, []);
    let platMin = s.camera.y;
    for (let t = 0; t < 60; t++) { step(s, input, t < 10 ? ['jump'] : []); platMin = Math.min(platMin, s.camera.y); }
    expect(floorRest - floorMin).toBeGreaterThan(10);      // ~19 px: the camera has no vertical dead zone here
    expect(floorMin - platMin).toBeGreaterThan(30);         // and from the platform it rises much further
  });
});

describe('wraparound room', () => {
  it('a wrapping level reads the opposite edge past any edge', () => {
    const l = parseLevel(['#.#', '.@.', '#..'], { wrap: true });
    expect(tileAt(l, -1, 0)).toBe('solid');                     // = col 2
    expect(tileAt(l, 3, 2)).toBe('solid');                      // = col 0
    expect(tileAt(l, 4, 2)).toBe('empty');                      // = col 1
    expect(tileAt(l, 1, -1)).toBe('empty');                     // = row 2
    expect(tileAt(l, 0, 3)).toBe('solid');                      // = row 0
    expect(tileAt(l, 1, 3)).toBe('empty');
    expect(tileAt(parseLevel(['#.#', '.@.']), -1, 0)).toBe('solid');   // an ordinary level is still boxed in
    expect(tileAt(parseLevel(['#.#', '.@.']), 1, 2)).toBe('solid');
  });

  it('walking off the left edge brings the player in from the right, still walking', () => {
    const s = wraparound.create() as WrapScene;
    const input = new Input();
    const W = s.level.pixelWidth;
    const y0 = bottom(s);
    let t = 0;
    while (s.wraps === 0 && t++ < 200) step(s, input, ['left']);
    expect(s.wraps).toBe(1);
    expect(s.player.body.x).toBeGreaterThan(W - TILE * 2);      // now at the right edge
    expect(bottom(s)).toBe(y0);                                  // same floor, never hit a wall
    for (let i = 0; i < 30; i++) step(s, input, ['left']);
    expect(s.player.body.x).toBeLessThan(W - TILE * 3);          // and kept walking
    expect(s.wraps).toBe(1);                                     // a crossing counts once, not once per tick spent straddling
  });

  it('dropping through the floor hole comes back in through the ceiling hole', () => {
    const s = wraparound.create() as WrapScene;
    const input = new Input();
    const H = s.level.pixelHeight;
    // Walk right from the spawn (col 2) into the hole (cols 7-12) and fall.
    let t = 0;
    while (s.wraps === 0 && t++ < 300) step(s, input, s.player.body.x < 8 * TILE ? ['right'] : []);
    expect(s.wraps).toBe(1);
    expect(s.player.body.y).toBeLessThan(2 * TILE);              // came in at the top
    expect(s.player.body.vy).toBeGreaterThan(0);                 // still falling
    expect(s.player.body.y).toBeGreaterThanOrEqual(-s.player.body.h);
    expect(H).toBe(11 * TILE);
  });

  it('draws the body twice while it straddles an edge', () => {
    const s = wraparound.create() as WrapScene;
    s.player.body.x = -4;
    const ctx = stubContext();
    s.draw(ctx, s.camera);
    expect(ctx.calls.filter(c => c === 'translate').length).toBeGreaterThanOrEqual(2);   // camera + one ghost
  });
});

describe('damage over time', () => {
  const fallIntoLeftPool = (s: PoisonScene, input: Input): void => {
    let t = 0;
    while (!touchesKind(s.level, s.player.body, 'poison') && t++ < 300) step(s, input, ['right']);
    expect(touchesKind(s.level, s.player.body, 'poison')).toBe(true);
  };

  it('five hearts drain over the five seconds after leaving the pool', () => {
    const s = damageOverTime.create() as PoisonScene;
    const input = new Input();
    fallIntoLeftPool(s, input);
    expect(s.poisoned).toBe(true);
    // Land (the touch registers mid-fall), then jump out to the right: the pool is one tile deep.
    while (s.player.body.vy !== 0) step(s, input, []);
    for (let t = 0; t < 40; t++) step(s, input, t < 8 ? ['right', 'jump'] : ['right']);
    expect(touchesKind(s.level, s.player.body, 'poison')).toBe(false);
    expect(s.poisoned).toBe(true);
    const hpAtLeave = s.hp.hp;
    const leftAtLeave = s.poisonLeft;
    for (let i = 0; i < leftAtLeave; i++) step(s, input, []);
    expect(s.poisoned).toBe(false);
    expect(s.hp.hp).toBe(hpAtLeave - POISON_TICKS / DRAIN_TICKS);   // exactly five more
    for (let i = 0; i < 200; i++) step(s, input, []);
    expect(s.hp.hp).toBe(hpAtLeave - 5);                            // and no more after
    expect(s.deaths).toBe(0);
  });

  it('standing in the pool costs a heart a second until death, then respawns clean', () => {
    const s = damageOverTime.create() as PoisonScene;
    const input = new Input();
    fallIntoLeftPool(s, input);
    const start = s.ticks;
    const hp0 = s.hp.hp;
    // The tick that first touched the pool already counted, so the first heart goes on the 60th tick including it.
    for (let i = 0; i < DRAIN_TICKS - 2; i++) step(s, input, []);
    expect(s.hp.hp).toBe(hp0);                                       // nothing lost in the first second
    step(s, input, []);
    expect(s.hp.hp).toBe(hp0 - 1);
    let t = 0;
    while (s.deaths === 0 && t++ < 1000) step(s, input, []);
    expect(s.deaths).toBe(1);
    expect(s.ticks - start).toBe(hp0 * DRAIN_TICKS - 1);             // one heart per second, no grace
    for (let i = 0; i < 60; i++) step(s, input, []);                 // the dying sequence
    expect(s.hp.hp).toBe(s.hp.maxHp);
    expect(s.poisoned).toBe(false);
    expect(s.player.body.x).toBe(3 * TILE + 2);                      // back at the spawn cell
  });

  it('armor does not stop poison', () => {
    const s = damageOverTime.create() as PoisonScene;
    const input = new Input();
    s.hp.armor = 1;
    fallIntoLeftPool(s, input);
    for (let i = 0; i < DRAIN_TICKS; i++) step(s, input, []);
    expect(s.hp.armor).toBe(1);
    expect(s.hp.hp).toBe(s.hp.maxHp - 1);
  });
});

describe('auto-scrolling level', () => {
  const bot = (s: AutoScrollScene, input: Input): void => {
    // The hint: hold right, jump at a wall or a pit.
    const b = s.player.body;
    const contacts = s.player['contacts'];
    const wallAhead = contacts.onWallRight;
    const floorAhead = tileAt(s.level, Math.floor((b.x + b.w + 1) / TILE), Math.floor((b.y + b.h) / TILE)) === 'solid';
    step(s, input, contacts.onGround && (wallAhead || !floorAhead) ? ['right', 'jump'] : ['right']);
  };

  it('scrolls at the fixed speed and stops at the end', () => {
    const s = autoScroll.create() as AutoScrollScene;
    const input = new Input();
    expect(s.camera.x).toBe(0);
    for (let i = 0; i < 60; i++) step(s, input, ['right']);
    expect(s.camera.x).toBeCloseTo(SCROLL_SPEED, 3);
  });

  it('an idle player is left behind, dies, and the level restarts from the beginning', () => {
    const s = autoScroll.create() as AutoScrollScene;
    const input = new Input();
    const spawnX = s.player.body.x;
    let t = 0;
    while (s.deaths === 0 && t++ < 600) step(s, input, []);
    expect(s.deaths).toBe(1);
    expect(t).toBeLessThan(120);                                     // within two seconds at 48 px/s from col 2
    const camAtDeath = s.camera.x;
    const xAtDeath = s.player.body.x;
    for (let i = 0; i < DEATH_TICKS - 1; i++) step(s, input, ['right']);
    expect(s.camera.x).toBe(camAtDeath);                             // the scroll pauses on the death
    expect(s.player.body.x).toBe(xAtDeath);                          // and the dead player cannot move, even holding right
    step(s, input, []);
    expect(s.camera.x).toBe(0);                                      // then the level restarts
    expect(s.player.body.x).toBe(spawnX);
    expect(s.player.flicker).toBe(false);
  });

  it('the right edge of the screen is a wall', () => {
    const s = autoScroll.create() as AutoScrollScene;
    const input = new Input();
    // A body that ends a tick past the edge is put back on it (the run speed beats the scroll, so this happens on any open stretch).
    s.player.body.x = s.camera.x + VIEW_W - 4;
    step(s, input, ['right']);
    expect(s.player.body.x + s.player.body.w).toBeCloseTo(s.camera.x + VIEW_W, 6);
    expect(s.player.body.vx).toBe(0);
    // And the invariant holds for the whole hint-following run.
    const s2 = autoScroll.create() as AutoScrollScene;
    const input2 = new Input();
    let pinned = 0;
    for (let t = 0; t < 60 * 40 && !s2.cleared; t++) {
      bot(s2, input2);
      expect(s2.player.body.x + s2.player.body.w).toBeLessThanOrEqual(s2.camera.x + VIEW_W + 1e-6);
      if (s2.player.body.x + s2.player.body.w > s2.camera.x + VIEW_W - 1) pinned++;
    }
    expect(pinned).toBeGreaterThan(0);                              // the run actually reached the edge somewhere
  });

  it('following the hint clears the level without dying', () => {
    const s = autoScroll.create() as AutoScrollScene;
    const input = new Input();
    let t = 0;
    while (!s.cleared && t++ < 60 * 40) bot(s, input);
    expect(s.cleared).toBe(true);
    expect(s.deaths).toBe(0);
    expect(s.camera.x).toBe(s.level.pixelWidth - VIEW_W);
    for (let i = 0; i < 120; i++) step(s, input, []);              // once cleared the scroll stops and nothing dies
    expect(s.deaths).toBe(0);
  });

  it('a wall the scroll pushes you into kills you', () => {
    const s = autoScroll.create() as AutoScrollScene;
    const input = new Input();
    // Walk up to the first pillar (col 12) and stand there.
    while (s.player.body.x + s.player.body.w < 12 * TILE - 1 && s.deaths === 0) step(s, input, ['right']);
    let t = 0;
    while (s.deaths === 0 && t++ < 900) step(s, input, ['right']);
    expect(s.deaths).toBe(1);
  });
});

describe('teleporters', () => {
  it('the portals demo is titled Teleporters and keeps its URL', () => {
    expect(portals.id).toBe('portals');
    expect(portals.title).toBe('Teleporters');
  });
});
