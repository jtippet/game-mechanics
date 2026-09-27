import { Pickup } from '../engine/entities/pickup';
import { Player } from '../engine/entities/player';
import type { Input } from '../engine/input';
import { drawBar, PALETTE } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#ffd166';
const FLY_TICKS = 480;

const LEVEL = [
  '########################################',
  '#......................................#',
  '#.............................*........#',
  '#............................######....#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#..@...................................#',
  '#.........*............................#',
  '########################################',
  '########################################',
];

export class FlyPlayer extends Player {
  flying = 0;

  protected override control(scene: BaseScene, input: Input): void {
    if (this.flying > 0) {
      this.flying--;
      this.gravity = 0;
      this.body.vy = input.held('up') ? -100 : input.held('down') ? 100 : 0;
      const dir = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
      this.body.vx = dir * this.runSpeed;
      if (dir !== 0) this.facing = dir as 1 | -1;
      if (this.flying === 0) this.gravity = 600;
      return;
    }
    super.control(scene, input);
  }
}

export class FlyScene extends BaseScene {
  won = false;

  get flying(): number { return (this.player as FlyPlayer).flying; }

  constructor() {
    super(LEVEL, { accent: ACCENT, player: spawn => new FlyPlayer(spawn) });
    // Pickups are collected in row-major reading order: the goal (row 2) comes before the wings (row 9).
    const [goal, wings] = this.level.pickups;
    this.entities.push(new Pickup(wings, () => { (this.player as FlyPlayer).flying = FLY_TICKS; }, ACCENT));
    this.entities.push(new Pickup(goal, () => { this.won = true; }, PALETTE.key));
  }

  protected override afterUpdate(): void {
    this.hud = [this.won ? 'You made it! R to reset' : this.flying > 0 ? `flying ${(this.flying / 60).toFixed(1)}s: ↑ ↓ to steer` : 'grab the wings'];
  }

  protected override drawHud(ctx: CanvasRenderingContext2D): void {
    super.drawHud(ctx);
    drawBar(ctx, 20, 16, 80, 4, this.flying / FLY_TICKS, ACCENT);
  }
}

export const flying: Demo = {
  id: 'flying',
  title: 'Flying',
  category: 'Movement',
  blurb: 'Grab the wings for free vertical movement for a while — enough to reach the alcove above.',
  controls: [...BASE_CONTROLS, '↑ ↓: fly while the wings last'],
  touch: [{ action: 'up', label: 'UP' }, { action: 'down', label: 'DOWN' }],
  create: () => new FlyScene(),
};
