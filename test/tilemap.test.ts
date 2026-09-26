import { describe, expect, it } from 'vitest';
import { cellsUnder, hazardAt, parseLevel, setTile, tileAt, touchesKind } from '../src/engine/tilemap';

const ROWS = [
  '######',
  '#.@..#',
  '#-^|d#',
  '#*k..#',
  '######',
];

describe('parseLevel', () => {
  it('reads size, tiles, spawn and markers in pixels', () => {
    const l = parseLevel(ROWS);
    expect(l.cols).toBe(6);
    expect(l.rows).toBe(5);
    expect(l.pixelWidth).toBe(96);
    expect(l.pixelHeight).toBe(80);
    expect(l.spawn).toEqual({ x: 32, y: 16 });
    expect(l.pickups).toEqual([{ x: 16, y: 48 }]);
    expect(l.keys).toEqual([{ x: 32, y: 48 }]);
    expect(l.doors).toEqual([{ x: 64, y: 32 }]);
    expect(tileAt(l, 1, 2)).toBe('oneway');
    expect(tileAt(l, 2, 2)).toBe('spike');
    expect(tileAt(l, 3, 2)).toBe('climb');
    expect(tileAt(l, 4, 2)).toBe('door');
    expect(tileAt(l, 2, 1)).toBe('empty');
  });

  it('rejects ragged rows with the row number', () => {
    expect(() => parseLevel(['###', '#@', '###'])).toThrow('row 1 has length 2, expected 3');
  });

  it('rejects unknown characters with row and col', () => {
    expect(() => parseLevel(['###', '#@q', '###'])).toThrow("unknown tile 'q' at row 1 col 2");
  });

  it('requires exactly one spawn', () => {
    expect(() => parseLevel(['###', '#.#', '###'])).toThrow("no spawn");
    expect(() => parseLevel(['####', '#@@#', '####'])).toThrow('second spawn');
  });
});

describe('queries', () => {
  it('treats out-of-bounds as solid', () => {
    const l = parseLevel(ROWS);
    expect(tileAt(l, -1, 0)).toBe('solid');
    expect(tileAt(l, 0, 99)).toBe('solid');
  });

  it('cellsUnder lists overlapped cells and ignores touching edges', () => {
    const l = parseLevel(ROWS);
    expect(cellsUnder(l, { x: 16, y: 16, w: 16, h: 16 }).map(c => [c.col, c.row])).toEqual([[1, 1]]);
    expect(cellsUnder(l, { x: 20, y: 20, w: 24, h: 24 }).map(c => [c.col, c.row])).toEqual([[1, 1], [2, 1], [1, 2], [2, 2]]);
  });

  it('setTile changes a cell and ignores out-of-bounds', () => {
    const l = parseLevel(ROWS);
    setTile(l, 4, 2, 'empty');
    expect(tileAt(l, 4, 2)).toBe('empty');
    setTile(l, 99, 99, 'solid');
  });

  it('hazardAt only counts the lower half of a spike cell', () => {
    const l = parseLevel(ROWS);
    // spike cell is col 2, row 2 → pixels x 32..48, y 32..48; hazard is y 40..48
    expect(hazardAt(l, { x: 34, y: 30, w: 8, h: 8 })).toBe(false);
    expect(hazardAt(l, { x: 34, y: 36, w: 8, h: 8 })).toBe(true);
  });

  it('touchesKind reports any overlapped cell of that kind', () => {
    const l = parseLevel(ROWS);
    expect(touchesKind(l, { x: 47, y: 34, w: 4, h: 4 }, 'climb')).toBe(true);
    expect(touchesKind(l, { x: 20, y: 20, w: 4, h: 4 }, 'climb')).toBe(false);
  });
});
