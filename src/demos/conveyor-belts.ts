import { TILE } from '../engine/constants';
import { Player } from '../engine/entities/player';
import type { Vec } from '../engine/geom';
import { moveBody } from '../engine/physics';
import { BaseScene } from '../engine/scene';
import { surfaceUnder } from '../engine/tilemap';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#6b7590';
const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..@...................................#',
  '####>>>>>>>>####<<<<<<<<####>>>>>>>>####',
  '########################################',
];

/** px/s for the belt under column `col`: fast right, slow left, walking-speed right. */
const speedFor = (col: number): number => (col < 12 ? 140 : col < 24 ? 40 : 90);

export class ConveyorPlayer extends Player {
  beltSpeed = 0;
  constructor(spawn: Vec, private readonly speedAt: (col: number) => number) { super(spawn); }

  protected override integrate(scene: BaseScene): void {
    super.integrate(scene);
    const k = surfaceUnder(scene.level, this.body);
    if (k !== 'beltR' && k !== 'beltL') { this.beltSpeed = 0; return; }
    const col = Math.floor((this.body.x + this.body.w / 2) / TILE);
    this.beltSpeed = (k === 'beltR' ? 1 : -1) * this.speedAt(col);
    // Carry through the collision code so a belt can never push you into a wall.
    const carry = { ...this.body, vx: this.beltSpeed, vy: 0 };
    moveBody(scene.level, carry);
    this.body.x = carry.x;
  }
}

export class ConveyorScene extends BaseScene {
  constructor(rows: readonly string[] = LEVEL, speedAt: (col: number) => number = speedFor) {
    super(rows, { accent: ACCENT, player: spawn => new ConveyorPlayer(spawn, speedAt) });
  }
  protected override afterUpdate(): void {
    const p = this.player as ConveyorPlayer;
    this.hud = [p.beltSpeed === 0 ? 'off the belts' : `belt ${p.beltSpeed > 0 ? '→' : '←'} ${Math.abs(p.beltSpeed)} px/s (you walk 90)`, 'one belt outruns you, one you can beat, one matches'];
  }
}

export const conveyorBelts: Demo = {
  id: 'conveyor-belts',
  title: 'Conveyor belts',
  category: 'Platforms and surfaces',
  blurb: 'Belts carry whatever stands on them. One is faster than you can walk, one slower, one exactly your speed.',
  controls: BASE_CONTROLS,
  create: () => new ConveyorScene(),
};
