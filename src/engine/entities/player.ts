import { DT, TILE } from '../constants';
import type { Vec } from '../geom';
import { approach } from '../geom';
import type { Input } from '../input';
import type { Body, Contacts } from '../physics';
import { moveBody, NO_CONTACTS } from '../physics';
import { drawActor, PALETTE } from '../renderer';
import type { BaseScene, Entity } from '../scene';

export const PLAYER_W = 12;
export const PLAYER_H = 14;

/**
 * The hero. Run, jump, gravity, facing. Demos subclass and override the
 * protected hooks; nothing here knows about any one mechanic.
 */
export class Player implements Entity {
  body: Body;
  facing: 1 | -1 = 1;
  contacts: Contacts = NO_CONTACTS;
  prevBottom = 0;
  ticks = 0;
  flicker = false;
  dropThrough = false;
  /** Ticks during which horizontal input is ignored (wall kicks, knockback). */
  controlLock = 0;
  color: string = PALETTE.player;

  runSpeed = 90;
  accel = 900;
  airAccel = 500;
  friction = 800;
  gravity = 600;
  jumpSpeed = 230;
  maxFall = 260;

  constructor(spawn: Vec) {
    this.body = { x: 0, y: 0, w: PLAYER_W, h: PLAYER_H, vx: 0, vy: 0 };
    this.moveTo(spawn);
  }

  /** Stand on the floor of a cell, centred. */
  moveTo(cell: Vec): void {
    this.body.x = cell.x + (TILE - this.body.w) / 2;
    this.body.y = cell.y + TILE - this.body.h;
    this.body.vx = 0;
    this.body.vy = 0;
  }

  update(scene: BaseScene, input: Input): void {
    this.ticks++;
    this.control(scene, input);
    this.integrate(scene);
  }

  protected control(_scene: BaseScene, input: Input): void {
    if (this.controlLock > 0) this.controlLock--;
    const dir = this.controlLock > 0 ? 0 : (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
    const onGround = this.contacts.onGround;
    if (dir !== 0) {
      this.body.vx = approach(this.body.vx, dir * this.runSpeed, (onGround ? this.accel : this.airAccel) * DT);
      this.facing = dir as 1 | -1;
    } else if (this.controlLock === 0) {
      this.body.vx = approach(this.body.vx, 0, (onGround ? this.friction : this.airAccel * 0.5) * DT);
    }
    if (input.pressed('jump') && this.canJump()) this.jump();
  }

  protected canJump(): boolean {
    return this.contacts.onGround;
  }

  jump(): void {
    this.body.vy = -this.jumpSpeed;
    this.onJump();
  }

  protected onJump(): void {}

  protected integrate(scene: BaseScene): void {
    this.body.vy = Math.min(this.body.vy + this.gravity * DT, this.maxFall);
    this.prevBottom = this.body.y + this.body.h;
    this.contacts = moveBody(scene.level, this.body, { dropThrough: this.dropThrough });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.flicker && ((this.ticks >> 2) & 1)) return;
    drawActor(ctx, this.body, this.color, this.facing);
  }
}
