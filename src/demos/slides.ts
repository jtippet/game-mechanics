import { Chute } from '../engine/entities/chute';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#5fd0ff';
const LEVEL = [
  '########################################',
  '#......................................#',
  '#..@.......................###.........#',
  '#####..................................#',
  '#....##................###.............#',
  '#......##..............................#',
  '#........##........###.................#',
  '#..........##..........................#',
  '#............##..###...................#',
  '#..............##......................#',
  '#................#######################',
  '########################################',
];
const cell = (c: number, r: number) => ({ x: c * 16, y: r * 16 });

export class SlideScene extends BaseScene {
  readonly slide = new Chute([cell(4, 2), cell(5, 3), cell(7, 4), cell(9, 5), cell(11, 6), cell(13, 7), cell(15, 8), cell(16, 8)], ACCENT, 140);
  readonly waterfall = new Chute([cell(31, 2), cell(31, 8), cell(35, 9)], ACCENT, 160);
  constructor() { super(LEVEL, { accent: ACCENT }); this.entities.push(this.slide, this.waterfall); }
  protected override afterUpdate(): void {
    this.hud = [this.slide.active ? 'sliding' : this.waterfall.active ? 'in the waterfall' : 'walk off the ledge; climb the steps for the waterfall'];
  }
}

export const slides: Demo = {
  id: 'slides',
  title: 'Slides and waterfalls',
  category: 'Platforms and surfaces',
  blurb: 'Step in and you are carried along a fixed path to its end: a slide down the slope, a waterfall off the top ledge.',
  controls: BASE_CONTROLS,
  create: () => new SlideScene(),
};
