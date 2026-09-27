import { Projectile } from '../engine/entities/projectile';
import { overlaps } from '../engine/geom';
import type { Input } from '../engine/input';
import { BaseScene } from '../engine/scene';
import { ARENA, ARENA_SPOTS, Respawner, type Spot } from './arena';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#4dd6ff';
const FIRE_COOLDOWN = 15;

export class ArcScene extends BaseScene {
  readonly spawner: Respawner;
  private cooldown = 0;
  hits = 0;
  touched = 0;

  constructor(rows: readonly string[] = ARENA, spots: Spot[] = ARENA_SPOTS) {
    super(rows, { accent: ACCENT });
    this.spawner = new Respawner(this, spots);
  }

  protected override afterUpdate(input: Input): void {
    if (this.cooldown > 0) this.cooldown--;
    const b = this.player.body;
    if (input.pressed('act') && this.cooldown === 0) {
      this.cooldown = FIRE_COOLDOWN;
      const facing = this.player.facing;
      const x = facing > 0 ? b.x + b.w : b.x - 4;
      this.entities.push(new Projectile(x, b.y + 4, facing, 200, ACCENT, { gravity: 600, vy0: -150 }));
    }
    const shots = this.entities.filter((e): e is Projectile => e instanceof Projectile && !e.dead);
    for (const shot of shots) {
      for (const enemy of this.spawner.enemies()) {
        if (overlaps(shot.body, enemy.body)) {
          shot.dead = true;
          this.spawner.kill(enemy);
          this.hits++;
          break;
        }
      }
    }
    if (this.spawner.update() && this.spawner.hurtPlayer()) { this.touched++; this.respawn(); }
    this.hud = [`hits ${this.hits}   touched ${this.touched}`];
  }
}

export const arcingShots: Demo = {
  id: 'arcing-shots',
  title: 'Arcing shots',
  category: 'Combat',
  blurb: 'Lob a shot in an arc under gravity. It falls onto whatever is standing where it lands.',
  controls: [...BASE_CONTROLS, 'X: lob'],
  touch: [{ action: 'act', label: 'LOB' }],
  create: () => new ArcScene(ARENA),
};
