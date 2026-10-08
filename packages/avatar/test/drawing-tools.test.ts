import { describe, expect, it } from 'vitest';
import {
  ditherThreshold,
  emptyPartLayer,
  gradientPartLayer,
  mirrorPartX,
  noisePartLayer,
  paintPartLayer,
  partLayer,
  partLinePoints,
  partRectPoints,
  shadePartLayer,
  type PartLayer,
} from '../src/index.js';

const tones = (layer: PartLayer, y: number) => layer[y]!.map((ink) => (ink ? ink.tone : null));

describe('line and rectangle tools', () => {
  it('draws pixel-perfect lines with one cell per step', () => {
    expect(partLinePoints([0, 0], [4, 2])).toEqual([
      [0, 0],
      [1, 1],
      [2, 1],
      [3, 2],
      [4, 2],
    ]);
    expect(partLinePoints([3, 3], [3, 3])).toEqual([[3, 3]]);
    expect(partLinePoints([5, 1], [1, 1])).toHaveLength(5);
  });

  it('snaps lines to 0°, 45° and 90°', () => {
    expect(partLinePoints([2, 2], [9, 3], true).at(-1)).toEqual([9, 2]);
    expect(partLinePoints([2, 2], [3, 9], true).at(-1)).toEqual([2, 9]);
    expect(partLinePoints([2, 2], [6, 7], true).at(-1)).toEqual([7, 7]);
    expect(partLinePoints([6, 6], [1, 2], true).at(-1)).toEqual([1, 1]);
  });

  it('outlines rectangles once per cell, and squares with the modifier', () => {
    const rect = partRectPoints([1, 1], [4, 3]);
    expect(rect).toHaveLength(10);
    expect(new Set(rect.map(String)).size).toBe(rect.length);
    expect(rect).not.toContainEqual([2, 2]);
    const square = partRectPoints([5, 5], [1, 3], true);
    expect(Math.min(...square.map(([x]) => x))).toBe(1);
    expect(Math.min(...square.map(([, y]) => y))).toBe(1);
    expect(partRectPoints([2, 2], [2, 2])).toEqual([[2, 2]]);
  });
});

describe('gradient tool', () => {
  it('uses the standard ordered-dither matrices', () => {
    const four = Array.from({ length: 16 }, (_, i) => ditherThreshold(i % 4, Math.floor(i / 4)));
    expect(new Set(four).size).toBe(16);
    expect(four.every((t) => t > 0 && t < 1)).toBe(true);
    expect(ditherThreshold(0, 0, 2)).toBe(0.125);
    expect(ditherThreshold(5, 7, 4)).toBe(ditherThreshold(1, 3, 4));
  });

  it('steps through tones between the ends and stays inside the start region', () => {
    let layer = emptyPartLayer('headpiece');
    layer = paintPartLayer(
      'headpiece',
      layer,
      Array.from({ length: 16 }, (_, y) => [10, y] as const),
      { color: '#112233', tone: 0 },
    );
    const out = gradientPartLayer('headpiece', layer, [0, 4], [8, 4], 'hairColor', -2, 2);
    const row = tones(out, 4).slice(0, 10);
    expect(row[0]).toBe(-2);
    expect(row[8]).toBe(2);
    expect(row[9]).toBe(2);
    for (let x = 1; x < row.length; x++) expect(row[x]!).toBeGreaterThanOrEqual(row[x - 1]! - 1);
    expect(new Set(row)).toEqual(new Set([-2, -1, 0, 1, 2]));
    expect(out[4]![10]).toEqual({ color: '#112233', tone: 0 });
    expect(out[4]![11]).toBeNull();
    expect(out[0]![0]?.color).toBe('hairColor');
  });

  it('dithers between neighboring tones only', () => {
    const out = gradientPartLayer(
      'bangs',
      emptyPartLayer('bangs'),
      [0, 0],
      [20, 0],
      'skinColor',
      0,
      1,
      {
        dither: 2,
      },
    );
    const all = out.flat().map((ink) => ink!.tone);
    expect(new Set(all)).toEqual(new Set([0, 1]));
    const middle = tones(out, 0).slice(8, 12).concat(tones(out, 1).slice(8, 12));
    expect(new Set(middle)).toEqual(new Set([0, 1]));
  });

  it('mirrors the gradient into the mirrored region', () => {
    const layer = paintPartLayer(
      'headpiece',
      emptyPartLayer('headpiece'),
      Array.from({ length: 16 }, (_, y) => [15, y] as const),
      { color: '#000000', tone: 0 },
      true,
    );
    const out = gradientPartLayer('headpiece', layer, [0, 0], [14, 0], 'shirtColor', -2, 2, {
      mirror: true,
    });
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 15; x++) expect(out[y]![mirrorPartX('headpiece', x)]).toEqual(out[y]![x]);
  });

  it('mirrors symmetrically inside a region shared by both halves', () => {
    const out = gradientPartLayer(
      'headpiece',
      emptyPartLayer('headpiece'),
      [2, 3],
      [12, 3],
      'hairColor',
      2,
      -2,
      { mirror: true },
    );
    expect(out[3]![2]).toEqual({ color: 'hairColor', tone: 2 });
    expect(out[3]![12]).toEqual({ color: 'hairColor', tone: -2 });
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) expect(out[y]![mirrorPartX('headpiece', x)]).toEqual(out[y]![x]);
  });
});

describe('noise and shade tools', () => {
  const solid = partLayer(
    'outfit',
    Array.from({ length: 6 }, (_, i) => [8 + i, 2, 'shirtColor', 0] as const),
  );

  it('is deterministic per seed, moves tones by one and leaves empty cells empty', () => {
    const a = noisePartLayer('outfit', solid, 0.5, 'seed-a');
    expect(noisePartLayer('outfit', solid, 0.5, 'seed-a')).toEqual(a);
    expect(a.flat().filter(Boolean)).toHaveLength(6);
    expect(a.flat().every((ink) => !ink || Math.abs(ink.tone) <= 1)).toBe(true);
    const seeds = ['a', 'b', 'c', 'd', 'e'].map((seed) =>
      JSON.stringify(noisePartLayer('outfit', solid, 0.5, seed)),
    );
    expect(new Set(seeds).size).toBeGreaterThan(1);
    expect(noisePartLayer('outfit', solid, 0, 'x')).toEqual(solid);
    expect(
      noisePartLayer('outfit', solid, 1, 'x')
        .flat()
        .filter((ink) => ink?.tone === 0),
    ).toEqual([]);
  });

  it('gives a cell and its mirror the same change', () => {
    const symmetric = paintPartLayer(
      'outfit',
      solid,
      Array.from({ length: 6 }, (_, i) => [8 + i, 2] as const),
      { color: 'shirtColor', tone: 0 },
      true,
    );
    const out = noisePartLayer('outfit', symmetric, 0.6, 'mirror', true);
    for (const [x] of Array.from({ length: 6 }, (_, i) => [8 + i]))
      expect(out[2]![mirrorPartX('outfit', x!)]).toEqual(out[2]![x!]);
  });

  it('shades each colored cell once per stroke and clamps the tone', () => {
    const stroke = [
      [8, 2],
      [9, 2],
      [8, 2],
      [0, 0],
    ] as const;
    const once = shadePartLayer('outfit', solid, stroke, -1);
    expect(tones(once, 2).slice(8, 11)).toEqual([-1, -1, 0]);
    expect(once[0]![0]).toBeNull();
    let dark = solid;
    for (let i = 0; i < 4; i++) dark = shadePartLayer('outfit', dark, stroke, -1);
    expect(dark[2]![8]?.tone).toBe(-2);
    const mirrored = shadePartLayer('outfit', solid, [[8, 2]], 1, true);
    expect(mirrored[2]![8]?.tone).toBe(1);
    expect(mirrored[2]![mirrorPartX('outfit', 8)]).toBeNull();
  });
});
