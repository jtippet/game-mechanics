import { Laser } from '../engine/entities/laser';
import type { Input } from '../engine/input';
import { BaseScene } from '../engine/scene';
import { ARENA, ARENA_SPOTS, Respawner, type Spot } from './arena';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#ff4d6d';
const FIRE_COOLDOWN = 20;

export class LaserScene extends BaseScene {
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
      const x = facing > 0 ? b.x + b.w : b.x;
      const y = b.y + 6;
      const l = new Laser(x, y, facing, this.level, ACCENT);
      this.entities.push(l);
      for (const e of this.spawner.enemies()) {
        if (l.hits(e.body)) { this.spawner.kill(e); this.hits++; }
      }
    }
    if (this.spawner.update() && this.spawner.hurtPlayer()) { this.touched++; this.respawn(); }
    this.hud = [`hits ${this.hits}   touched ${this.touched}`];
  }
}

export const lasers: Demo = {
  id: 'lasers',
  title: 'Lasers',
  category: 'Combat',
  blurb: 'Fire an instant beam along your row. It stops at the first wall and takes out every patroller in its path.',
  controls: [...BASE_CONTROLS, 'X: fire'],
  touch: [{ action: 'act', label: 'FIRE' }],
  create: () => new LaserScene(ARENA),
};
