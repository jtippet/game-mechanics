import { Explosion } from '../engine/entities/explosion';
import type { HpScene } from '../engine/hp-scene';
import type { Respawner } from './arena';

/** Apply an explosion to a scene that has hearts and a Respawner: enemies in range die, the player in range takes a hit. Returns enemy kills. */
export function detonate(scene: HpScene, spawner: Respawner, cx: number, cy: number, radius: number, color: string): number {
  const e = new Explosion(cx, cy, radius, 20, color);
  scene.entities.push(e);
  let kills = 0;
  for (const enemy of spawner.enemies()) if (e.inRange(enemy.body)) { spawner.kill(enemy); kills++; }
  if (e.inRange(scene.hp.body)) scene.hurt(cx);
  return kills;
}
