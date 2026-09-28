import { DT, VIEW_W } from '../engine/constants';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#ffb347';
/** Pixels per second the viewport advances: slower than the run speed (90), so the player can get ahead and rest. */
export const SCROLL_SPEED = 48;
/** Ticks the scroll pauses on the dead player before the level restarts. */
export const DEATH_TICKS = 45;

// 100 columns, 11 rows: one-tile pillars, two-tile pillars, and pits two
// wide. A player pinned to the screen's right edge only advances at the
// scroll speed while airborne (37 px per jump), so two tiles (32 px) is the
// widest pit that "hold right and jump at every obstacle" clears; three is
// not. Falling into a pit reaches the level's bottom edge, which is death.
// The shelf at row 5 is above head height on a jump from the floor.
const LEVEL = [
  '....................................................................................................',
  '....................................................................................................',
  '....................................................................................................',
  '....................................................................................................',
  '....................................................................................................',
  '................................................................####................................',
  '....................................................................................................',
  '....................................................................................................',
  '......................................#.......................#.....................#...............',
  '..@.........#.................#.......#................#......#.................#...#...............',
  '######################..#####################..#######################..################..##########',
];

export class AutoScrollScene extends BaseScene {
  deaths = 0;
  cleared = false;
  /** Ticks left in the death pause; 0 when alive. */
  dying = 0;

  constructor() {
    super(LEVEL, { accent: ACCENT });
    this.camera.x = 0;
  }

  private get maxX(): number { return this.level.pixelWidth - VIEW_W; }

  protected override beforeUpdate(): void {
    if (this.cleared || this.dying > 0) return;
    this.camera.x = Math.min(this.camera.x + SCROLL_SPEED * DT, this.maxX);
    if (this.camera.x >= this.maxX) this.cleared = true;
  }

  protected override afterUpdate(): void {
    if (this.dying > 0) {
      if (--this.dying === 0) this.restart();
      return;
    }
    const b = this.player.body;
    const right = this.camera.x + VIEW_W;
    // The screen's right edge is a wall: you cannot run ahead of the scroll.
    if (b.x + b.w > right) { b.x = right - b.w; if (b.vx > 0) b.vx = 0; }
    // Entirely off the left edge, or down a pit to the level's bottom edge, is death: a short pause, then the level starts over. Once cleared, nothing kills.
    if (!this.cleared && (b.x + b.w < this.camera.x || b.y + b.h >= this.level.pixelHeight)) {
      this.deaths++;
      this.dying = DEATH_TICKS;
      this.player.flicker = true;
      this.player.controlLock = DEATH_TICKS;
    }
    this.hud = [`deaths ${this.deaths}${this.cleared ? '   cleared' : ''}`, 'keep up with the screen; fall behind and you restart'];
  }

  private restart(): void {
    this.respawn();
    this.player.flicker = false;
    this.camera.x = 0;
    this.cleared = false;
  }

  /** The scroll owns the camera; the player does not steer it. */
  protected override updateCamera(): void {}
}

export const autoScroll: Demo = {
  id: 'auto-scroll',
  title: 'Auto-scrolling level',
  category: 'World',
  blurb: 'The viewport crawls to the right on its own. Its right edge is a wall, and if it leaves you behind you die and the level restarts.',
  controls: BASE_CONTROLS,
  create: () => new AutoScrollScene(),
};
