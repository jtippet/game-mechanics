import { Portal } from '../engine/entities/portal';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#c58cff';
const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#.......................Q..............#',
  '#......................####............#',
  '#...........#..........................#',
  '#...........#..........................#',
  '#..@....P...#...P......................#',
  '#...........#.........................Q#',
  '########################################',
  '########################################',
];

export class PortalScene extends BaseScene {
  readonly portals: Portal[];
  constructor() {
    super(LEVEL, { accent: ACCENT });
    const ps = this.level.portals.filter(p => p.id === 'P');
    const qs = this.level.portals.filter(p => p.id === 'Q');       // reading order: the ledge pad first, the floor pad second
    this.portals = [new Portal(ps[0], ps[1], true, ACCENT), new Portal(qs[1], qs[0], false, ACCENT)];
    this.entities.push(...this.portals);
  }
  protected override afterUpdate(): void {
    const n = this.portals[0].teleports + this.portals[1].teleports;
    this.hud = [`teleports ${n}`, 'left pair goes both ways; the far-right pad only goes up'];
  }
}

export const portals: Demo = {
  id: 'portals',
  title: 'Portals',
  category: 'Platforms and surfaces',
  blurb: 'Two pads linked both ways through the wall, and a one-way pad that lifts you to the ledge and never back.',
  controls: BASE_CONTROLS,
  create: () => new PortalScene(),
};
