import { describe, expect, it } from 'vitest';
import { TOUCH_BASE, type Demo } from '../src/demos/demo';
import { shouldShow, touchSeen } from '../src/shell/touch';

const resolveButtons = (demo: Pick<Demo, 'touch'>): readonly { action: string; label: string }[] =>
  [...TOUCH_BASE, ...(demo.touch ?? [])];

describe('resolved touch button list', () => {
  it('is left, right, jump for a demo with no extras', () => {
    const buttons = resolveButtons({});
    expect(buttons.map(b => b.action)).toEqual(['left', 'right', 'jump']);
  });

  it('appends extras after the base three, in order', () => {
    const buttons = resolveButtons({ touch: [{ action: 'act', label: 'DASH' }] });
    expect(buttons.map(b => b.action)).toEqual(['left', 'right', 'jump', 'act']);
    expect(buttons[3]).toEqual({ action: 'act', label: 'DASH' });
  });

  it('preserves the order of multiple extras', () => {
    const buttons = resolveButtons({
      touch: [{ action: 'up', label: 'CLIMB' }, { action: 'down', label: 'DROP' }],
    });
    expect(buttons.map(b => b.action)).toEqual(['left', 'right', 'jump', 'up', 'down']);
  });
});

describe('shouldShow', () => {
  it('reveals on a touch pointer', () => {
    expect(shouldShow(false, 'touch')).toBe(true);
  });
  it('stays hidden for mouse or pen when not previously seen', () => {
    expect(shouldShow(false, 'mouse')).toBe(false);
    expect(shouldShow(false, 'pen')).toBe(false);
  });
  it('once seen, stays shown regardless of the new pointer type', () => {
    expect(shouldShow(true, 'mouse')).toBe(true);
    expect(shouldShow(true, 'touch')).toBe(true);
  });
});

describe('touchSeen', () => {
  it('starts false (module state, before any mountTouchBar call)', () => {
    expect(touchSeen()).toBe(false);
  });
});
