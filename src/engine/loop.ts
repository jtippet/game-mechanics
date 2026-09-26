import { DT } from './constants';

const MAX_CATCHUP = 0.25;

/** Fixed-step simulation, one render per animation frame. */
export class Loop {
  private acc = 0;
  private last = 0;
  private raf = 0;
  running = false;

  constructor(private readonly tick: () => void, private readonly render: () => void) {}

  /** Advance by elapsed seconds; returns how many ticks ran. Pure, for tests. */
  advance(elapsed: number): number {
    this.acc += Math.max(0, Math.min(elapsed, MAX_CATCHUP));
    let n = 0;
    while (this.acc >= DT) {
      this.tick();
      this.acc -= DT;
      n++;
    }
    return n;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const frame = (now: number): void => {
      if (!this.running) return;
      this.advance((now - this.last) / 1000);
      this.last = now;
      this.render();
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
