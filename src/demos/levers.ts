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
  '#..@..........d............d.......*...#',
  '#........L....d......L.....d...........#',
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
