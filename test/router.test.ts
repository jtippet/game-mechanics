import { describe, expect, it } from 'vitest';
import { parseHash } from '../src/shell/router';

describe('parseHash', () => {
  it('maps empty, #, #/ to the menu', () => {
    expect(parseHash('')).toEqual({ kind: 'menu' });
    expect(parseHash('#')).toEqual({ kind: 'menu' });
    expect(parseHash('#/')).toEqual({ kind: 'menu' });
  });
  it('maps #/<slug> to a demo, with or without a trailing slash', () => {
    expect(parseHash('#/double-jump')).toEqual({ kind: 'demo', id: 'double-jump' });
    expect(parseHash('#/double-jump/')).toEqual({ kind: 'demo', id: 'double-jump' });
  });
  it('anything else is the menu', () => {
    expect(parseHash('#/Double Jump')).toEqual({ kind: 'menu' });
    expect(parseHash('#foo')).toEqual({ kind: 'menu' });
  });
});
