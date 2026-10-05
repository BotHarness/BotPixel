import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RECIPE,
  PIXEL_SYMBOLS,
  faceCells,
  pixelSymbolCells,
  symbolArtCells,
} from '../src/index.js';

describe('pixel avatar symbols', () => {
  it('draws every symbol inside the 32 grid in the given colour with an ink outline', () => {
    for (const symbol of PIXEL_SYMBOLS) {
      const cells = pixelSymbolCells(symbol, '#3fc1b8');
      expect(cells.length, symbol).toBeGreaterThan(80);
      expect(cells.every((c) => c.x >= 0 && c.x < 32 && c.y >= 0 && c.y < 32)).toBe(true);
      expect(
        cells.some((c) => c.c === '#3fc1b8'),
        symbol,
      ).toBe(true);
      expect(
        cells.some((c) => c.c === '#2a2230'),
        symbol,
      ).toBe(true);
      expect(new Set(cells.map((c) => `${c.x},${c.y}`)).size).toBe(cells.length);
    }
    expect(faceCells(DEFAULT_RECIPE).length).toBeGreaterThan(400);
  });

  it('draws host-supplied character art in the built-in style', () => {
    const cells = symbolArtCells(['AA', 'AH'], '#3fc1b8');
    expect(cells.filter((c) => c.c === '#3fc1b8')).toHaveLength(3);
    expect(cells.find((c) => c.x === 5 && c.y === 5)!.c).not.toBe('#3fc1b8');
    expect(cells.filter((c) => c.c === '#2a2230')).toHaveLength(8);
  });
});
