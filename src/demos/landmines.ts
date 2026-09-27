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
  '#.......M..................M.....M.....#',
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
    this.hud = [`deaths ${this.deaths}`, 'a mine arms underfoot; get clear before it blows'];
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
