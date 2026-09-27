import { Pickup } from '../engine/entities/pickup';
import { Player } from '../engine/entities/player';
import type { Input } from '../engine/input';
import { BaseScene } from '../engine/scene';
import { touchesKind } from '../engine/tilemap';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#b08a5a';
const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#.....................*................#',
  '#................H.######..............#',
  '#................H.....................#',
  '#................H.....................#',
  '#.......H.######.......................#',
  '#.......H..............................#',
  '#..@....H..............................#',
  '########################################',
  '########################################',
];

export class LadderPlayer extends Player {
  climbing = false;
  private savedGravity = 600;
  // Ticks after a jump-off-the-ladder during which a still-held up/down
  // won't re-grab: without this, jumping while still touching the ladder
  // (the very next tick, before the jump has carried the body clear of it)
  // immediately re-triggers the grab condition below and overwrites the
  // jump's vy with the climb speed, cancelling the jump outright.
  private regrab = 0;

  protected override control(scene: BaseScene, input: Input): void {
    if (this.regrab > 0) this.regrab--;
    const onLadder = touchesKind(scene.level, this.body, 'ladder');
    if (!this.climbing && this.regrab === 0 && onLadder && (input.held('up') || input.held('down'))) {
      this.climbing = true;
      this.savedGravity = this.gravity;
      this.gravity = 0;
    }
    if (this.climbing && !onLadder) this.stopClimbing();
    if (!this.climbing) { super.control(scene, input); return; }
    this.body.vy = input.held('up') ? -60 : input.held('down') ? 60 : 0;
    const dir = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
    this.body.vx = dir * 45;
    if (dir !== 0) this.facing = dir as 1 | -1;
    if (input.pressed('jump')) { this.stopClimbing(); this.body.vy = -this.jumpSpeed; this.regrab = 10; }
  }

  private stopClimbing(): void {
    this.climbing = false;
    this.gravity = this.savedGravity;
  }
}

export class LadderScene extends BaseScene {
  won = false;

  constructor() {
    super(LEVEL, { accent: ACCENT, player: spawn => new LadderPlayer(spawn) });
    const [goal] = this.level.pickups;
    this.entities.push(new Pickup(goal, () => { this.won = true; }, ACCENT));
  }

  protected override afterUpdate(): void {
    const p = this.player as LadderPlayer;
    this.hud = [this.won ? 'You made it! R to reset' : p.climbing ? 'climbing: up/down to move, jump to let go' : 'hold up or down at a ladder to grab it'];
  }
}

export const ladders: Demo = {
  id: 'ladders',
  title: 'Ladders',
  category: 'Movement',
  blurb: 'Grab a ladder with up or down, climb past its top with gravity off, and jump to let go.',
  controls: [...BASE_CONTROLS, '↑ ↓: climb a ladder'],
  touch: [{ action: 'up', label: 'UP' }, { action: 'down', label: 'DOWN' }],
  create: () => new LadderScene(),
};
