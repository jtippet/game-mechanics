import type { TouchButton } from '../demos/demo';
import type { Action, Input } from '../engine/input';

/**
 * Pure decision for whether the touch overlay should reveal itself: once a
 * real touch pointer has been seen, it stays revealed (module state in the
 * caller carries `prevSeen` across demos in the same page load).
 */
export function shouldShow(prevSeen: boolean, pointerType: string): boolean {
  return prevSeen || pointerType === 'touch';
}

let seen = false;

/** Whether a touch pointer has been seen yet this page load. */
export function touchSeen(): boolean {
  return seen;
}

const revealListeners = new Set<() => void>();

function reveal(): void {
  if (seen) return;
  seen = true;
  for (const fn of revealListeners) fn();
}

let globalListenerInstalled = false;

/**
 * Document-level: the first touch anywhere (even outside the overlay) shows
 * the controls from then on, for every demo in this page load. Installed
 * lazily on the first `mountTouchBar` call (not at module load) so this
 * module stays importable in a DOM-less test environment.
 */
function ensureGlobalListener(): void {
  if (globalListenerInstalled) return;
  globalListenerInstalled = true;
  document.addEventListener('pointerdown', (e: PointerEvent) => {
    if (shouldShow(seen, e.pointerType)) reveal();
  });
  document.addEventListener('touchstart', () => reveal(), { passive: true });
}

/**
 * Builds a translucent overlay inside `.stage`, over the canvas: ◀ ▶ at the
 * bottom-left, JUMP nearest the bottom-right corner with up to three extra
 * buttons stacked beside it. Hidden until a touch is seen (module-level, so
 * once revealed it stays revealed across demos). Pointer tracking is by
 * coordinates, so a thumb can slide from ◀ to ▶ without lifting.
 */
export function mountTouchBar(slot: HTMLElement, input: Input, buttons: readonly TouchButton[]): () => void {
  ensureGlobalListener();
  const overlay = document.createElement('div');
  overlay.className = 'touch-overlay';
  if (!seen) overlay.hidden = true;

  const left = document.createElement('div');
  left.className = 'touch-cluster touch-cluster--left';
  const right = document.createElement('div');
  right.className = 'touch-cluster touch-cluster--right';

  const makeButton = (b: TouchButton): HTMLButtonElement => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'touch-btn';
    el.dataset.action = b.action;
    el.textContent = b.label;
    return el;
  };

  for (const b of buttons) {
    if (b.action === 'left' || b.action === 'right') left.appendChild(makeButton(b));
  }
  const jumpButton = buttons.find(b => b.action === 'jump');
  const extras = buttons.filter(b => b.action !== 'left' && b.action !== 'right' && b.action !== 'jump');
  // A 2-column grid pinned to the bottom-right corner: JUMP sits in the
  // corner cell, up to three extras fill leftward then upward from there.
  const CELLS: ReadonlyArray<[column: number, row: number]> = [[2, 2], [1, 2], [2, 1], [1, 1]];
  if (jumpButton) {
    const el = makeButton(jumpButton);
    const [col, row] = CELLS[0];
    el.style.gridColumn = String(col);
    el.style.gridRow = String(row);
    right.appendChild(el);
  }
  extras.slice(0, 3).forEach((b, i) => {
    const el = makeButton(b);
    const [col, row] = CELLS[i + 1];
    el.style.gridColumn = String(col);
    el.style.gridRow = String(row);
    right.appendChild(el);
  });

  overlay.append(left, right);

  const active = new Map<number, Action>();
  const actionAt = (x: number, y: number): Action | null => {
    const el = document.elementFromPoint(x, y)?.closest('[data-action]') as HTMLElement | null | undefined;
    return (el?.dataset.action as Action | undefined) ?? null;
  };
  const setDown = (a: Action, down: boolean): void => {
    const el = overlay.querySelector(`[data-action="${a}"]`);
    el?.classList.toggle('is-down', down);
  };
  const down = (e: PointerEvent): void => {
    const a = actionAt(e.clientX, e.clientY);
    if (!a) return;
    e.preventDefault();
    active.set(e.pointerId, a);
    input.press(a);
    setDown(a, true);
  };
  const move = (e: PointerEvent): void => {
    const prev = active.get(e.pointerId);
    if (prev === undefined) return;
    const a = actionAt(e.clientX, e.clientY);
    if (a === prev) return;
    input.release(prev);
    setDown(prev, false);
    if (a) { active.set(e.pointerId, a); input.press(a); setDown(a, true); } else active.delete(e.pointerId);
  };
  const up = (e: PointerEvent): void => {
    const a = active.get(e.pointerId);
    if (a === undefined) return;
    input.release(a);
    setDown(a, false);
    active.delete(e.pointerId);
  };
  const block = (e: Event): void => e.preventDefault();
  overlay.addEventListener('pointerdown', down);
  overlay.addEventListener('contextmenu', block);
  overlay.addEventListener('touchstart', block, { passive: false });
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);

  const onReveal = (): void => { overlay.hidden = false; };
  revealListeners.add(onReveal);

  slot.appendChild(overlay);
  return () => {
    revealListeners.delete(onReveal);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    overlay.remove();
  };
}
