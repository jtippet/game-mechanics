import { HpPlayer } from '../engine/entities/hp-player';
import { Pickup } from '../engine/entities/pickup';
import { Projectile } from '../engine/entities/projectile';
import { Turret } from '../engine/entities/turret';
import { overlaps } from '../engine/geom';
import { HpScene } from '../engine/hp-scene';
import type { Input } from '../engine/input';
import type { BaseScene } from '../engine/scene';
import { isSolidKind } from '../engine/physics';
import { cellsUnder, surfaceUnder } from '../engine/tilemap';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#ffb347';
const DUCK_H = 8;
const STAND_H = 14;
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
  '#..@...............................*..T#',
  '########################################',
  '########################################',
];

export class DuckPlayer extends HpPlayer {
  ducking = false;

  protected override control(scene: BaseScene, input: Input): void {
    // A direct floor probe, not this.contacts.onGround: contacts is only refreshed by
    // integrate() at the END of a tick, so on tick 1 (or any tick right after a
    // teleport/respawn) it still reads the pre-construction default (onGround: false)
    // and holding down would never duck. Measured RED: test/demos-ducking.test.ts's
    // first assertion (`p.ducking` after a single step()) failed with contacts.onGround.
    const wants = input.held('down') && surfaceUnder(scene.level, this.body) !== null;
    if (wants && !this.ducking) { this.ducking = true; this.body.y += STAND_H - DUCK_H; this.body.h = DUCK_H; }
    else if (!wants && this.ducking) {
      // A real AABB probe of the would-be standing body against the level. On today's
      // tile geometry (STAND_H 14 < TILE 16) a standing body never reaches the row above
      // the one it rests in, so this can't yet block anything; it's here for whenever a
      // level places a sub-tile ceiling that a 14px body actually can't clear.
      const tall = { x: this.body.x, y: this.body.y - (STAND_H - DUCK_H), w: this.body.w, h: STAND_H };
      const blocked = cellsUnder(scene.level, tall).some(c => isSolidKind(c.kind));
      if (!blocked) { this.ducking = false; this.body.y = tall.y; this.body.h = STAND_H; }
    }
    this.runSpeed = this.ducking ? 45 : 90;
    this.noJump = this.ducking;
    super.control(scene, input);
  }
}

export class DuckScene extends HpScene {
  won = false;

  constructor() {
    super(LEVEL, { accent: ACCENT, player: spawn => new DuckPlayer(spawn) });
    const [turretCell] = this.level.turrets;
    this.entities.push(new Turret(turretCell, -1, 50, (x, y, dir) => {
      this.entities.push(new Projectile(x, y, dir, 200, ACCENT, { life: 200 }));
    }));
    const [goal] = this.level.pickups;
    this.entities.push(new Pickup(goal, () => { this.won = true; }, ACCENT));
  }

  protected override onRespawn(): void {
    const p = this.hp as DuckPlayer;
    p.ducking = false;
    p.body.h = STAND_H;
    p.moveTo(this.level.spawn);
  }

  protected override afterUpdate(): void {
    this.tickDying();
    for (const e of this.entities) {
      if (e instanceof Projectile && !e.dead && overlaps(e.body, this.hp.body)) {
        e.dead = true;
        this.damage(e.body.x);
      }
    }
    const p = this.hp as DuckPlayer;
    this.hud = [this.won ? 'You made it! R to reset' : p.ducking ? 'ducking: slower, no firing, half height' : 'hold down to duck under the shots'];
  }
}

export const ducking: Demo = {
  id: 'ducking',
  title: 'Ducking',
  category: 'Movement',
  blurb: 'A turret sprays shots at standing height. Hold down to duck under them, at the cost of speed and the jump.',
  controls: [...BASE_CONTROLS, 'hold ↓: duck'],
  touch: [{ action: 'down', label: 'DUCK' }],
  create: () => new DuckScene(),
};
