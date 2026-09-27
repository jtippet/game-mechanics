import { Projectile } from '../engine/entities/projectile';
import type { Rect } from '../engine/geom';
import { overlaps } from '../engine/geom';
import type { Input } from '../engine/input';
import { BaseScene } from '../engine/scene';
import { ARENA, ARENA_SPOTS, Respawner, type Spot } from './arena';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#c77dff';
const FIRE_COOLDOWN = 30;

export class HomingScene extends BaseScene {
  readonly spawner: Respawner;
  private cooldown = 0;
  hits = 0;
  touched = 0;

  constructor(rows: readonly string[] = ARENA, spots: Spot[] = ARENA_SPOTS) {
    super(rows, { accent: ACCENT });
    this.spawner = new Respawner(this, spots);
  }

  private nearest(): Rect | null {
    const b = this.player.body;
    let best: Rect | null = null;
    let bestDist = Infinity;
    for (const e of this.spawner.enemies()) {
      const dx = e.body.x - b.x;
      const dy = e.body.y - b.y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; best = e.body; }
    }
    return best;
  }

  protected override afterUpdate(input: Input): void {
    if (this.cooldown > 0) this.cooldown--;
    const b = this.player.body;
    if (input.pressed('act') && this.cooldown === 0) {
      this.cooldown = FIRE_COOLDOWN;
      const facing = this.player.facing;
      const x = facing > 0 ? b.x + b.w : b.x - 4;
      this.entities.push(new Projectile(x, b.y + 6, facing, 90, ACCENT, { homing: () => this.nearest(), turnRate: 0.06, life: 180 }));
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

export const homingMissiles: Demo = {
  id: 'homing-missiles',
  title: 'Homing missiles',
  category: 'Combat',
  blurb: 'Fire a missile that turns toward the nearest enemy and gives up after 3 s.',
  controls: [...BASE_CONTROLS, 'X: fire'],
  touch: [{ action: 'act', label: 'FIRE' }],
  create: () => new HomingScene(ARENA),
};
