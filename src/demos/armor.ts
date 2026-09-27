import type { Rect, Vec } from '../engine/geom';
import { overlaps } from '../engine/geom';
import { HpScene } from '../engine/hp-scene';
import { drawShield } from '../engine/renderer';
import type { BaseScene, Entity } from '../engine/scene';
import { Respawner, type Spot } from './arena';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#8ce8ff';
const REPLACE_TICKS = 120;

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
  '#..@..*........^^^.....................#',
  '########################################',
  '########################################',
];

const SPOTS: Spot[] = [
  { cell: { x: 30 * 16, y: 9 * 16 }, dir: -1, turnAtLedges: false },
];

/** A pickup shaped like the HUD's own shield outline, mirroring Pickup. */
export class ShieldPickup implements Entity {
  rect: Rect;
  dead = false;

  constructor(cell: Vec, private readonly onCollect: () => void) {
    this.rect = { x: cell.x + 4, y: cell.y + 4, w: 8, h: 8 };
  }

  update(scene: BaseScene): void {
    if (overlaps(this.rect, scene.player.body)) {
      this.dead = true;
      this.onCollect();
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawShield(ctx, this.rect.x, this.rect.y);
  }
}

export class ArmorScene extends HpScene {
  readonly spawner: Respawner;
  private readonly cell: Vec;
  private prevArmor: number;
  private replaceAt = 0;

  constructor(rows: readonly string[] = LEVEL, spots: Spot[] = SPOTS) {
    super(rows, { accent: ACCENT });
    this.spawner = new Respawner(this, spots);
    this.cell = this.level.pickups[0];
    this.place();
    this.prevArmor = this.hp.armor;
  }

  private place(): void {
    this.entities.push(new ShieldPickup(this.cell, () => { this.hp.armor = 1; }));
  }

  protected override afterUpdate(): void {
    this.spawner.update();
    if (!this.tickDying()) {
      const b = this.hp.body;
      if (this.hurtByHazard()) this.damage(b.x + b.w / 2 + this.hp.facing);
      for (const e of this.spawner.enemies()) if (overlaps(e.body, b)) this.damage(e.body.x + e.body.w / 2);
    }
    if (this.prevArmor === 1 && this.hp.armor === 0) this.replaceAt = this.ticks + REPLACE_TICKS;
    if (this.replaceAt > 0 && this.ticks >= this.replaceAt) { this.replaceAt = 0; this.place(); }
    this.prevArmor = this.hp.armor;
    this.hud = [this.hp.armor > 0 ? 'armored: the next hit bounces off' : 'grab the shield'];
  }
}

export const armor: Demo = {
  id: 'armor',
  title: 'Armor',
  category: 'Items',
  blurb: 'A shield pickup absorbs the next hit with no knockback, then is gone until it reappears.',
  controls: BASE_CONTROLS,
  create: () => new ArmorScene(),
};
