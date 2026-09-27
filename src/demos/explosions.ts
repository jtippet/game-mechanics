import { Projectile } from '../engine/entities/projectile';
import { overlaps } from '../engine/geom';
import type { Input } from '../engine/input';
import { HpScene } from '../engine/hp-scene';
import { ARENA, ARENA_SPOTS, Respawner, type Spot } from './arena';
import { detonate } from './blast';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#ff7a59';
const THROW_COOLDOWN = 30;
const RADIUS = 40;

export class ExplosionScene extends HpScene {
  readonly spawner: Respawner;
  private cooldown = 0;
  hits = 0;

  constructor(rows: readonly string[] = ARENA, spots: Spot[] = ARENA_SPOTS) {
    super(rows, { accent: ACCENT });
    this.spawner = new Respawner(this, spots);
  }

  protected override afterUpdate(input: Input): void {
    this.spawner.update();
    if (!this.tickDying()) {
      if (this.cooldown > 0) this.cooldown--;
      const b = this.hp.body;
      if (input.pressed('act') && this.cooldown === 0) {
        this.cooldown = THROW_COOLDOWN;
        const facing = this.hp.facing;
        const x = facing > 0 ? b.x + b.w : b.x - 4;
        this.entities.push(new Projectile(x, b.y + 4, facing, 160, ACCENT, {
          gravity: 600,
          vy0: -120,
          onImpact: (px, py) => { this.hits += detonate(this, this.spawner, px, py, RADIUS, ACCENT); },
        }));
      }
      // "Explodes on its first contact (wall or enemy)": onImpact above only fires for
      // a wall/floor hit (Projectile.update only calls it on a level collision), so a
      // bomb that flies straight into an enemy without ever touching a tile would
      // otherwise sail through unexploded. Detonate it on that contact too.
      const bombs = this.entities.filter((e): e is Projectile => e instanceof Projectile && !e.dead);
      for (const bomb of bombs) {
        for (const enemy of this.spawner.enemies()) {
          if (overlaps(bomb.body, enemy.body)) {
            bomb.dead = true;
            const cx = bomb.body.x + bomb.body.w / 2;
            const cy = bomb.body.y + bomb.body.h / 2;
            this.hits += detonate(this, this.spawner, cx, cy, RADIUS, ACCENT);
            break;
          }
        }
      }
      for (const enemy of this.spawner.enemies()) if (overlaps(enemy.body, b)) this.damage(enemy.body.x + enemy.body.w / 2);
    }
    this.hud = [`hits ${this.hits}   deaths ${this.deaths}`, 'the blast hurts them and you'];
  }
}

export const explosions: Demo = {
  id: 'explosions',
  title: 'Explosions',
  category: 'Combat',
  blurb: 'Throw a bomb along an arc. It blows a radius on landing — enemies in range die, and you take a heart if you are too close.',
  controls: [...BASE_CONTROLS, 'X: throw'],
  touch: [{ action: 'act', label: 'BOMB' }],
  create: () => new ExplosionScene(ARENA),
};
