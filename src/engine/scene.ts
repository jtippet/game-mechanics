import { Camera } from './camera';
import { VIEW_H, VIEW_W } from './constants';
import { center, type Rect, type Vec } from './geom';
import type { Input } from './input';
import { drawLevel, drawText, PALETTE } from './renderer';
import type { Level } from './tilemap';
import { hazardAt, parseLevel } from './tilemap';
import { Player } from './entities/player';

export interface Scene {
  readonly camera: Camera;
  update(input: Input): void;
  draw(ctx: CanvasRenderingContext2D, camera: Camera): void;
}

export interface Entity {
  dead?: boolean;
  update(scene: BaseScene, input: Input): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export interface SceneOptions {
  accent?: string;
  player?: (spawn: Vec) => Player;
}

/** Level + player + entities + camera + HUD. Demos extend this and override hooks. */
export class BaseScene implements Scene {
  readonly level: Level;
  readonly player: Player;
  readonly camera: Camera;
  entities: Entity[] = [];
  hud: string[] = [];
  ticks = 0;
  accent: string;

  constructor(rows: readonly string[], opts: SceneOptions = {}) {
    this.level = parseLevel(rows);
    this.accent = opts.accent ?? PALETTE.player;
    this.player = opts.player ? opts.player(this.level.spawn) : new Player(this.level.spawn);
    this.camera = new Camera(VIEW_W, VIEW_H, this.level.pixelWidth, this.level.pixelHeight);
    const c = center(this.player.body);
    this.camera.snap(c.x, c.y);
  }

  update(input: Input): void {
    this.ticks++;
    this.beforeUpdate(input);
    this.player.update(this, input);
    for (const e of this.entities.slice()) e.update(this, input);
    this.entities = this.entities.filter(e => !e.dead);
    this.afterUpdate(input);
    const c = center(this.player.body);
    this.camera.follow(c.x, c.y);
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.drawBackground(ctx, camera);
    ctx.save();
    camera.apply(ctx);
    drawLevel(ctx, this.level, camera);
    for (const e of this.entities) e.draw(ctx);
    this.player.draw(ctx);
    this.drawWorld(ctx);
    ctx.restore();
    this.drawHud(ctx);
  }

  respawn(): void {
    this.player.moveTo(this.level.spawn);
  }

  hurtByHazard(r: Rect = this.player.body): boolean {
    return hazardAt(this.level, r);
  }

  protected beforeUpdate(_input: Input): void {}
  protected afterUpdate(_input: Input): void {}
  protected drawBackground(_ctx: CanvasRenderingContext2D, _camera: Camera): void {}
  /** Drawn in world space after the player. */
  protected drawWorld(_ctx: CanvasRenderingContext2D): void {}
  protected drawHud(ctx: CanvasRenderingContext2D): void {
    this.hud.forEach((line, i) => drawText(ctx, line, 20, 4 + i * 10));
  }
}
