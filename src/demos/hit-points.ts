import { Player } from '../engine/entities/player';
import { overlaps } from '../engine/geom';
import { drawText, PALETTE } from '../engine/renderer';
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
    this.hud.forEach((line, i) => drawText(ctx, line, 4, 14 + i * 10));
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
