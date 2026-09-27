import { describe, expect, it } from 'vitest';
import { scaleFor } from '../src/shell/scale';

describe('scaleFor', () => {
  it('is the largest integer that fits both axes', () => {
    expect(scaleFor(1000, 800)).toBe(3);
    expect(scaleFor(640, 1000)).toBe(2);
    expect(scaleFor(1000, 360)).toBe(2);
  });
  it('never drops below 1 on a narrow phone', () => {
    expect(scaleFor(300, 600)).toBe(1);
    expect(scaleFor(0, 0)).toBe(1);
  });
});
