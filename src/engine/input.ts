export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'act' | 'reset';
export const ACTIONS: readonly Action[] = ['left', 'right', 'up', 'down', 'jump', 'act', 'reset'];

const KEYS: Record<string, Action> = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyZ: 'jump', Space: 'jump',
  KeyX: 'act',
  KeyR: 'reset',
};

export function keyToAction(code: string): Action | null {
  return KEYS[code] ?? null;
}

/**
 * Abstract input with per-tick edges. Physical sources (keyboard, touch
 * buttons) call press/release at any time; the loop calls tick() once per
 * simulation step, after which held()/pressed() describe that step.
 * A press that went down and up between two ticks still reads as one
 * pressed+held tick, so short taps are never lost.
 */
export class Input {
  private down = new Set<Action>();      // physically down right now
  private latched = new Set<Action>();   // went down since the last tick
  private heldNow = new Set<Action>();
  private pressedNow = new Set<Action>();

  press(a: Action): void {
    if (this.down.has(a)) return;        // key repeat
    this.down.add(a);
    this.latched.add(a);
  }

  release(a: Action): void {
    this.down.delete(a);
  }

  releaseAll(): void {
    this.down.clear();
    this.latched.clear();
  }

  tick(): void {
    this.pressedNow = new Set(this.latched);
    this.heldNow = new Set([...this.down, ...this.latched]);
    this.latched.clear();
  }

  held(a: Action): boolean { return this.heldNow.has(a); }
  pressed(a: Action): boolean { return this.pressedNow.has(a); }

  /** Wire keydown/keyup/blur on a window-like target. Returns a detach function. */
  attachKeyboard(target: EventTarget): () => void {
    const onDown = (e: Event): void => {
      const k = e as KeyboardEvent;
      const a = keyToAction(k.code);
      if (!a) return;
      k.preventDefault();
      if (k.repeat) return;
      this.press(a);
    };
    const onUp = (e: Event): void => {
      const a = keyToAction((e as KeyboardEvent).code);
      if (a) this.release(a);
    };
    const onBlur = (): void => this.releaseAll();
    target.addEventListener('keydown', onDown);
    target.addEventListener('keyup', onUp);
    target.addEventListener('blur', onBlur);
    return () => {
      target.removeEventListener('keydown', onDown);
      target.removeEventListener('keyup', onUp);
      target.removeEventListener('blur', onBlur);
    };
  }
}
