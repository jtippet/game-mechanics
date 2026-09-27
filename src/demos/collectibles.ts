import { Pickup } from '../engine/entities/pickup';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#f2e26a';

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#............*.............*...........#',
  '#...........###...........###..........#',
  '#......................................#',
  '#.....*..............*.............*...#',
  '#....###............###...........###..#',
  '#..@...................................#',
  '#.*.....*.....*.....*.....*.....*.....*#',
  '########################################',
  '########################################',
];

export class CollectScene extends BaseScene {
  readonly total: number;
  got = 0;

  constructor(rows: readonly string[]) {
    super(rows, { accent: ACCENT });
    this.total = this.level.pickups.length;
    for (const cell of this.level.pickups) this.entities.push(new Pickup(cell, () => { this.got++; }, ACCENT));
  }

  protected override afterUpdate(): void {
    this.hud = [`coins ${this.got}/${this.total}`, this.got === this.total ? 'All coins! R to reset' : ''];
  }
}

export const collectibles: Demo = {
  id: 'collectibles',
  title: 'Collectibles',
  category: 'Items',
  blurb: 'Coins and a counter. Pick them all up for a message.',
  controls: BASE_CONTROLS,
  create: () => new CollectScene(LEVEL),
};
