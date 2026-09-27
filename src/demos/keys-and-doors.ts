import { TILE } from '../engine/constants';
import { Pickup } from '../engine/entities/pickup';
import type { Rect, Vec } from '../engine/geom';
import { overlaps } from '../engine/geom';
import { drawKey } from '../engine/renderer';
import { BaseScene, type Entity } from '../engine/scene';
import { setTile, touchesKind } from '../engine/tilemap';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#f2e26a';

const LEVEL = [
  '########################################',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................................#',
  '#......................k...............#',
  '#.....................####.............#',
  '#..........................d.......*...#',
  '#..@.......................d...........#',
  '#..........................d...........#',
  '########################################',
  '########################################',
];

class KeyItem implements Entity {
  rect: Rect;
  dead = false;

  constructor(cell: Vec, private readonly onTake: () => void) {
    this.rect = { x: cell.x + 3, y: cell.y + 5, w: 10, h: 6 };
  }

  update(scene: BaseScene): void {
    if (overlaps(this.rect, scene.player.body)) { this.dead = true; this.onTake(); }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawKey(ctx, this.rect.x + 5, this.rect.y + 3);
  }
}

export class KeyDoorScene extends BaseScene {
  hasKey = false;
  opened = false;
  won = false;

  constructor(rows: readonly string[]) {
    super(rows, { accent: ACCENT });
    for (const k of this.level.keys) this.entities.push(new KeyItem(k, () => { this.hasKey = true; }));
    for (const g of this.level.pickups) this.entities.push(new Pickup(g, () => { this.won = true; }, ACCENT));
  }

  protected override afterUpdate(): void {
    if (this.hasKey && !this.opened) {
      const b = this.player.body;
      if (touchesKind(this.level, { x: b.x - 1, y: b.y, w: b.w + 2, h: b.h }, 'door')) {
        for (const d of this.level.doors) setTile(this.level, d.x / TILE, d.y / TILE, 'empty');
        this.opened = true;
      }
    }
    this.hud = [this.won ? 'You made it! R to reset' : this.hasKey ? 'key: yes — walk into the door' : 'key: no — find it first'];
  }

  protected override drawHud(ctx: CanvasRenderingContext2D): void {
    super.drawHud(ctx);
    if (this.hasKey && !this.opened) drawKey(ctx, 10, 20);
  }
}

export const keysAndDoors: Demo = {
  id: 'keys-and-doors',
  title: 'Keys and doors',
  category: 'World',
  blurb: 'The door is solid until you bring the key to it. Then it is gone and the goal is reachable.',
  controls: BASE_CONTROLS,
  create: () => new KeyDoorScene(LEVEL),
};
