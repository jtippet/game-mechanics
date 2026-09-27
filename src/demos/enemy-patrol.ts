import { drawText } from '../engine/renderer';
import { BaseScene } from '../engine/scene';
import { ARENA, ARENA_SPOTS, Respawner } from './arena';
import { BASE_CONTROLS, type Demo } from './demo';

const ACCENT = '#4fb3e8';

class PatrolScene extends BaseScene {
  private readonly spawner = new Respawner(this, ARENA_SPOTS);
  touched = 0;

  protected override afterUpdate(): void {
    if (this.spawner.update()) { this.touched++; this.respawn(); }
    this.hud = [`touched ${this.touched}`, 'two turn at ledges; the floor one only turns at walls'];
  }

  protected override drawWorld(ctx: CanvasRenderingContext2D): void {
    for (const e of this.spawner.enemies()) {
      drawText(ctx, e.turnAtLedges ? 'ledge' : 'wall', e.body.x - 4, e.body.y - 10, ACCENT);
    }
  }
}

export const enemyPatrol: Demo = {
  id: 'enemy-patrol',
  title: 'Enemy patrol',
  category: 'Combat',
  blurb: 'Enemies walk back and forth. Some turn when the floor runs out; one only turns at walls. Touching one sends you back.',
  controls: BASE_CONTROLS,
  create: () => new PatrolScene(ARENA, { accent: ACCENT }),
};
