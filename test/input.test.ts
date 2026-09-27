import { describe, expect, it } from 'vitest';
import { Input, keyToAction } from '../src/engine/input';

describe('Input edges', () => {
  it('pressed is true for exactly one tick; held stays true', () => {
    const i = new Input();
    i.press('jump');
    i.tick();
    expect(i.pressed('jump')).toBe(true);
    expect(i.held('jump')).toBe(true);
    i.tick();
    expect(i.pressed('jump')).toBe(false);
    expect(i.held('jump')).toBe(true);
    i.release('jump');
    i.tick();
    expect(i.held('jump')).toBe(false);
  });

  it('a press and release inside one tick still counts as one pressed tick', () => {
    const i = new Input();
    i.press('act');
    i.release('act');
    i.tick();
    expect(i.pressed('act')).toBe(true);
    expect(i.held('act')).toBe(true);
    i.tick();
    expect(i.pressed('act')).toBe(false);
    expect(i.held('act')).toBe(false);
  });

  it('a repeated press while held does not re-fire pressed', () => {
    const i = new Input();
    i.press('left');
    i.tick();
    i.press('left');
    i.tick();
    expect(i.pressed('left')).toBe(false);
  });

  it('releaseAll clears everything', () => {
    const i = new Input();
    i.press('left');
    i.press('jump');
    i.tick();
    i.releaseAll();
    i.tick();
    expect(i.held('left')).toBe(false);
    expect(i.held('jump')).toBe(false);
  });
});

describe('keyboard mapping', () => {
  it('maps arrows, WASD, Z/Space, X, R', () => {
    expect(keyToAction('ArrowLeft')).toBe('left');
    expect(keyToAction('KeyA')).toBe('left');
    expect(keyToAction('ArrowRight')).toBe('right');
    expect(keyToAction('KeyD')).toBe('right');
    expect(keyToAction('ArrowUp')).toBe('up');
    expect(keyToAction('KeyW')).toBe('up');
    expect(keyToAction('ArrowDown')).toBe('down');
    expect(keyToAction('KeyS')).toBe('down');
    expect(keyToAction('KeyZ')).toBe('jump');
    expect(keyToAction('Space')).toBe('jump');
    expect(keyToAction('KeyX')).toBe('act');
    expect(keyToAction('KeyR')).toBe('reset');
    expect(keyToAction('KeyQ')).toBe(null);
  });

  it('attachKeyboard presses on keydown, releases on keyup and blur, prevents default only for mapped keys', () => {
    type Handler = (e: { code: string; repeat?: boolean; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean; preventDefault: () => void }) => void;
    const handlers: Record<string, Handler[]> = {};
    const target = {
      addEventListener: (type: string, h: Handler) => { (handlers[type] ??= []).push(h); },
      removeEventListener: (type: string, h: Handler) => { handlers[type] = (handlers[type] ?? []).filter(x => x !== h); },
    };
    const i = new Input();
    const detach = i.attachKeyboard(target as unknown as EventTarget);
    let prevented = 0;
    const fire = (type: string, code: string, repeat = false, mods: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean } = {}) =>
      (handlers[type] ?? []).forEach(h => h({
        code,
        repeat,
        ctrlKey: mods.ctrlKey ?? false,
        metaKey: mods.metaKey ?? false,
        altKey: mods.altKey ?? false,
        preventDefault: () => { prevented++; },
      }));

    fire('keydown', 'Space');
    i.tick();
    expect(i.held('jump')).toBe(true);
    expect(prevented).toBe(1);
    fire('keydown', 'KeyQ');
    expect(prevented).toBe(1);
    fire('keyup', 'Space');
    i.tick();
    expect(i.held('jump')).toBe(false);

    fire('keydown', 'ArrowLeft');
    (handlers.blur ?? []).forEach(h => h({ code: '', preventDefault: () => {} }));
    i.tick();
    expect(i.held('left')).toBe(false);

    const preventedBeforeModifier = prevented;
    fire('keydown', 'KeyR', false, { ctrlKey: true });
    i.tick();
    expect(prevented).toBe(preventedBeforeModifier);
    expect(i.held('reset')).toBe(false);

    detach();
    fire('keydown', 'KeyZ');
    i.tick();
    expect(i.held('jump')).toBe(false);
  });
});
