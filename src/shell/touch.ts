import type { Action, Input } from '../engine/input';

const BUTTONS: ReadonlyArray<[Action, string]> = [['left', '◀'], ['right', '▶'], ['jump', 'JUMP'], ['act', 'ACT']];

/**
 * Four big buttons that feed the same Input as the keyboard. Pointer tracking
 * is by coordinates, so a thumb can slide from ◀ to ▶ without lifting.
 * CSS shows the bar only on coarse-pointer devices.
 */
export function mountTouchBar(slot: HTMLElement, input: Input): () => void {
  const bar = document.createElement('div');
  bar.className = 'touchbar';
  for (const [action, label] of BUTTONS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.action = action;
    b.textContent = label;
    bar.appendChild(b);
  }
  const active = new Map<number, Action>();
  const actionAt = (x: number, y: number): Action | null => {
    const el = document.elementFromPoint(x, y)?.closest('[data-action]') as HTMLElement | null | undefined;
    return (el?.dataset.action as Action | undefined) ?? null;
  };
  const down = (e: PointerEvent): void => {
    const a = actionAt(e.clientX, e.clientY);
    if (!a) return;
    e.preventDefault();
    active.set(e.pointerId, a);
    input.press(a);
  };
  const move = (e: PointerEvent): void => {
    const prev = active.get(e.pointerId);
    if (prev === undefined) return;
    const a = actionAt(e.clientX, e.clientY);
    if (a === prev) return;
    input.release(prev);
    if (a) { active.set(e.pointerId, a); input.press(a); } else active.delete(e.pointerId);
  };
  const up = (e: PointerEvent): void => {
    const a = active.get(e.pointerId);
    if (a === undefined) return;
    input.release(a);
    active.delete(e.pointerId);
  };
  const block = (e: Event): void => e.preventDefault();
  bar.addEventListener('pointerdown', down);
  bar.addEventListener('contextmenu', block);
  bar.addEventListener('touchstart', block, { passive: false });
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  slot.appendChild(bar);
  return () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    bar.remove();
  };
}
