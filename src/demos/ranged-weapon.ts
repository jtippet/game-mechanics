import { Projectile } from '../engine/entities/projectile';
import { overlaps } from '../engine/geom';
import type { Input } from '../engine/input';
import { BaseScene } from '../engine/scene';
import { ARENA, ARENA_SPOTS, Respawner, type Spot } from './arena';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#fff275';
const FIRE_COOLDOWN = 10;

export class RangedScene extends BaseScene {
  private readonly spawner: Respawner;
  private cooldown = 0;
  hits = 0;
  touched = 0;

  constructor(rows: readonly string[], spots: Spot[] = ARENA_SPOTS) {
    super(rows, { accent: ACCENT });
    this.spawner = new Respawner(this, spots);
  }

  protected override afterUpdate(input: Input): void {
    if (this.cooldown > 0) this.cooldown--;
    const b = this.player.body;
    if (input.pressed('act') && this.cooldown === 0) {
      this.cooldown = FIRE_COOLDOWN;
      const x = this.player.facing > 0 ? b.x + b.w : b.x - 4;
      this.entities.push(new Projectile(x, b.y + 6, this.player.facing, 260, ACCENT));
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

export const rangedWeapon: Demo = {
  id: 'ranged-weapon',
  title: 'Ranged weapon',
  category: 'Combat',
  blurb: 'Fire a projectile the way you are facing. It stops at walls and takes out a patroller on contact.',
  controls: [...BASE_CONTROLS, 'X: fire'],
  touch: [{ action: 'act', label: 'SHOOT' }],
  create: () => new RangedScene(ARENA),
};
