import { DT } from '../constants';
import type { Vec } from '../geom';
import { PALETTE } from '../renderer';
import type { BaseScene } from '../scene';
import { PlatformBody } from './platform-body';

const STAND_TICKS = 30;
const FADE_TICKS = 20;
const RETURN_TICKS = 180;

/** Gives way a moment after someone stands on it: 'fall' drops under gravity, 'fade' blinks out. Returns later. */
export class CrumblingPlatform extends PlatformBody {
  state: 'idle' | 'going' | 'gone' = 'idle';
  private stood = 0;
  private going = 0;
  private goneAt = 0;
  private vy = 0;

  constructor(private readonly home: Vec, w: number, readonly kind: 'fall' | 'fade') {
    super({ x: home.x, y: home.y, w, h: 6 });
  }

  protected override move(scene: BaseScene): void {
    switch (this.state) {
      case 'idle':
        this.stood = this.riding ? this.stood + 1 : 0;
        if (this.stood >= STAND_TICKS) { this.state = 'going'; this.going = 0; }
        break;
      case 'going':
        this.going++;
        if (this.kind === 'fall') {
          this.vy += 600 * DT;
          this.rect.y += this.vy * DT;
          if (this.rect.y > scene.level.pixelHeight) this.vanish(scene);
        } else {
          this.visible = ((this.going >> 2) & 1) === 0;
          if (this.going >= FADE_TICKS) this.vanish(scene);
        }
        break;
      case 'gone': {
        // Reposition a tick before going solid again: PlatformBody's catch
        // reads `rect.y` from the tick *before* `move()` runs, so relocating
        // and resolidifying in the same tick would hand it a stale, far-below
        // `prevTop` from the fall — enough for the "landing from above" check
        // to misfire and snap a player resting on the real floor back up
        // onto the platform. Landing one tick early keeps that read accurate.
        const elapsed = scene.ticks - this.goneAt;
        if (elapsed === RETURN_TICKS - 1) {
          this.rect.x = this.home.x; this.rect.y = this.home.y;
        } else if (elapsed >= RETURN_TICKS) {
          this.state = 'idle';
          this.solid = true; this.visible = true; this.stood = 0; this.vy = 0;
        }
        break;
      }
    }
  }

  private vanish(scene: BaseScene): void {
    this.state = 'gone';
    this.solid = false;
    this.visible = false;
    this.goneAt = scene.ticks;
  }

  override draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;
    super.draw(ctx);
    if (this.state === 'going' && this.kind === 'fall') {
      ctx.fillStyle = PALETTE.danger;
      ctx.fillRect(this.rect.x, this.rect.y + this.rect.h - 1, this.rect.w, 1);
    }
  }
}
