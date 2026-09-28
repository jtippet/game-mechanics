import { describe, expect, it } from 'vitest';
import { catalogue } from '../src/demos';
import { TILE } from '../src/engine/constants';
import { BaseScene } from '../src/engine/scene';
import { tileAt, type Level, type TileKind } from '../src/engine/tilemap';

// A single jump rises ~42 px, so two tiles up is the most a step may ask; three is impossible.
const JUMP_UP = 2;
const REACH_LEVEL = 4;   // cells of horizontal reach when landing level or lower
const REACH_UP_1 = 3;    // when rising one tile
const REACH_UP_2 = 2;    // when rising two tiles

const PASSABLE: TileKind[] = ['empty', 'spike', 'oneway', 'door', 'ladder', 'poison'];
const FLOOR: TileKind[] = ['solid', 'oneway', 'climb', 'ice', 'sand', 'beltR', 'beltL'];
const passable = (l: Level, c: number, r: number): boolean => PASSABLE.includes(tileAt(l, c, r));
const standable = (l: Level, c: number, r: number): boolean =>
  passable(l, c, r) && (FLOOR.includes(tileAt(l, c, r + 1)) || tileAt(l, c, r) === 'ladder');

/** A goal that needs flight to reach is exempt: the coarse flood fill has no notion of flying. */
const FLIGHT_DEMOS = ['flying'];

/** Coarse flood fill over standable cells from the spawn, using the jump limits above. Ignores walls in between: it is a floor for what a level may demand, not a solver. */
function reachableStands(l: Level): Set<string> {
  const start = { c: l.spawn.x / TILE, r: l.spawn.y / TILE };
  const seen = new Set<string>([`${start.c},${start.r}`]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (let r2 = Math.max(0, cur.r - JUMP_UP); r2 < l.rows; r2++) {
      const rise = cur.r - r2;
      const reach = rise === 2 ? REACH_UP_2 : rise === 1 ? REACH_UP_1 : REACH_LEVEL;
      for (let c2 = cur.c - reach; c2 <= cur.c + reach; c2++) {
        const k = `${c2},${r2}`;
        if (seen.has(k) || !standable(l, c2, r2)) continue;
        seen.add(k);
        queue.push({ c: c2, r: r2 });
      }
    }
  }
  return seen;
}

describe('every catalogued level is playable', () => {
  for (const demo of catalogue) {
    it(`${demo.id}: every pickup and key is within a jump of a reachable stand`, () => {
      if (FLIGHT_DEMOS.includes(demo.id)) return;
      const scene = demo.create();
      if (!(scene instanceof BaseScene)) return;
      const l = scene.level;
      const stands = reachableStands(l);
      const targets = [...l.pickups, ...l.keys].map(p => ({ c: p.x / TILE, r: p.y / TILE }));
      const unreachable = targets.filter(t => {
        for (let r2 = t.r; r2 <= t.r + JUMP_UP; r2++) {
          for (let c2 = t.c - REACH_LEVEL; c2 <= t.c + REACH_LEVEL; c2++) if (stands.has(`${c2},${r2}`)) return false;
        }
        return true;
      });
      expect(unreachable, `unreachable cells (col,row): ${JSON.stringify(unreachable)}`).toEqual([]);
    });
  }
});
