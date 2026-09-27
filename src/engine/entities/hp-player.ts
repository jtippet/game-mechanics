import type { Vec } from '../geom';
import type { BaseScene } from '../scene';
import { Player } from './player';

export const INVULN_TICKS = 60;

/** A player with hearts. `hurt()` costs one heart (or one armor), knocks back, and grants invulnerability. */
export class HpPlayer extends Player {
  hp: number;
  invuln = 0;
  armor = 0;

  constructor(spawn: Vec, readonly maxHp = 3) {
    super(spawn);
    this.hp = maxHp;
  }

  hurt(fromX: number): boolean {
    if (this.invuln > 0 || this.hp <= 0) return false;
    this.invuln = INVULN_TICKS;
    this.flicker = true;
    if (this.armor > 0) { this.armor--; return true; }
    this.hp--;
    const dir = this.body.x + this.body.w / 2 < fromX ? -1 : 1;
    this.body.vx = dir * 160;
    this.body.vy = -150;
    this.controlLock = 12;
    return true;
  }

  protected override integrate(scene: BaseScene): void {
    super.integrate(scene);
    if (this.invuln > 0 && --this.invuln === 0) this.flicker = false;
  }
}
