import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#c9ced8';
const DEATH_TICKS = 30;

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..............^^^.......^^^...........#',
  '#.............#####.....#####..........#',
  '#..@...................................#',
  '#......^^^.......^^^^.......^^^^^......#',
  '########################################',
  '########################################',
];

export class HazardScene extends BaseScene {
  deaths = 0;
  dying = 0;

  protected override afterUpdate(): void {
    const p = this.player;
    if (this.dying > 0) {
      if (--this.dying === 0) { this.respawn(); p.flicker = false; }
    } else if (this.hurtByHazard()) {
      this.deaths++;
      this.dying = DEATH_TICKS;
      p.flicker = true;
      p.controlLock = DEATH_TICKS;
      p.body.vx = 0;
      p.body.vy = -120;
    }
    this.hud = [`deaths ${this.deaths}`, 'only the lower half of a spike cell hurts'];
  }
}

export const hazards: Demo = {
  id: 'hazards',
  title: 'Hazards',
  category: 'World',
  blurb: 'Spikes. Touch the pointy half and you die and restart. Clearing the tips is enough; you do not need to clear the whole cell.',
  controls: BASE_CONTROLS,
  create: () => new HazardScene(LEVEL, { accent: ACCENT }),
};
