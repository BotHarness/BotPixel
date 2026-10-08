import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AVATAR_TURNS,
  DEFAULT_RECIPE,
  MAX_PART_FIXED_COLORS,
  canonicalCustomPart,
  canonicalRecipe,
  createCustomPart,
  customPartId,
  emptyPartLayer,
  fillPartLayer,
  isPixelAvatarRecipe,
  isPixelCustomPart,
  mirrorPartX,
  paintPartLayer,
  partCells,
  partLayer,
  partToneColor,
  pixelAvatarSvg,
  pixelFigure,
  withHeadpiece,
  withSpecies,
  type PartCell,
  type PartInk,
  type PixelAvatarRecipe,
  type PixelCustomPart,
} from '../src/index.js';

const hair: PartInk = { color: 'hairColor', tone: 0 };
const gold: PartInk = { color: '#EFB93F', tone: 1 };

const ears: PixelCustomPart = {
  slot: 'headpiece',
  front: [
    [9, 1, 'hairColor', 0],
    [9, 2, 'hairColor', 0],
    [9, 3, 'hairColor', -1],
    [22, 1, 'hairColor', 0],
    [22, 2, 'hairColor', 0],
    [22, 3, 'hairColor', -1],
  ],
  back: [
    [14, 6, '#efb93f', 0],
    [15, 6, '#efb93f', 0],
  ],
};

const cellAt = (recipe: PixelAvatarRecipe, x: number, y: number, yaw = 0) =>
  pixelFigure(recipe, yaw).cells.find((cell) => cell.x === x && cell.y === y)?.c;

describe('Custom Part data', () => {
  it('validates the slot bounds, cell shape, colors and tones', () => {
    expect(isPixelCustomPart(ears)).toBe(true);
    expect(isPixelCustomPart({ ...ears, front: [[32, 0, 'hairColor', 0]] })).toBe(false);
    expect(isPixelCustomPart({ ...ears, front: [[0, 16, 'hairColor', 0]] })).toBe(false);
    expect(isPixelCustomPart({ ...ears, front: [[-1, 0, 'hairColor', 0]] })).toBe(false);
    expect(isPixelCustomPart({ ...ears, front: [[0.5, 0, 'hairColor', 0]] })).toBe(false);
    expect(isPixelCustomPart({ ...ears, front: [[0, 0, 'mouthColor', 0]] })).toBe(false);
    expect(isPixelCustomPart({ ...ears, front: [[0, 0, '#fff', 0]] })).toBe(false);
    expect(isPixelCustomPart({ ...ears, front: [[0, 0, 'hairColor', 3]] })).toBe(false);
    expect(isPixelCustomPart({ ...ears, front: [[0, 0, 'hairColor']] })).toBe(false);
    expect(
      isPixelCustomPart({
        ...ears,
        front: [
          [0, 0, 'hairColor', 0],
          [0, 0, 'skinColor', 0],
        ],
      }),
    ).toBe(false);
    expect(isPixelCustomPart({ ...ears, slot: 'mouth' })).toBe(false);
    expect(isPixelCustomPart({ ...ears, name: 'ears' })).toBe(false);
    const palette = Array.from({ length: MAX_PART_FIXED_COLORS + 1 }, (_, i): PartCell => [
      i,
      0,
      `#${i.toString(16).padStart(6, '0')}`,
      0,
    ]);
    expect(isPixelCustomPart({ ...ears, front: palette.slice(0, -1), back: [] })).toBe(true);
    expect(isPixelCustomPart({ ...ears, front: palette, back: [] })).toBe(false);
  });

  it('identifies a part by its content, not by cell order or color case', () => {
    const id = customPartId(ears);
    expect(id).toMatch(/^[\da-f]{64}$/u);
    expect(id).toBe(
      createHash('sha256')
        .update(
          JSON.stringify({
            slot: 'headpiece',
            front: [...ears.front].sort((a, b) => a[1] - b[1] || a[0] - b[0]),
            back: ears.back,
          }),
        )
        .digest('hex'),
    );
    expect(customPartId({ ...ears, front: [...ears.front].reverse() })).toBe(id);
    expect(
      customPartId({
        ...ears,
        back: [
          [14, 6, '#EFB93F', 0],
          [15, 6, '#efb93f', 0],
        ],
      }),
    ).toBe(id);
    expect(customPartId({ ...ears, back: [[14, 6, '#efb93f', 0]] })).not.toBe(id);
    expect(
      customPartId({
        ...ears,
        back: [
          [14, 6, '#efb93f', 1],
          [15, 6, '#efb93f', 0],
        ],
      }),
    ).not.toBe(id);
    expect(customPartId({ ...ears, front: ears.back, back: ears.front })).not.toBe(id);
  });

  it('round-trips between drawn layers and cells', () => {
    const part = createCustomPart('headpiece', {
      front: partLayer('headpiece', ears.front),
      back: partLayer('headpiece', ears.back),
    });
    expect(customPartId(part)).toBe(customPartId(ears));
    expect(partCells(emptyPartLayer('headpiece'))).toEqual([]);
  });
});

describe('Custom Part drawing', () => {
  it('mirrors across the Avatar centerline', () => {
    expect(mirrorPartX('headpiece', 0)).toBe(31);
    expect(mirrorPartX('headpiece', 15)).toBe(16);
    const layer = paintPartLayer('headpiece', emptyPartLayer('headpiece'), [[10, 2]], hair, true);
    expect(partCells(layer)).toEqual([
      [10, 2, 'hairColor', 0],
      [21, 2, 'hairColor', 0],
    ]);
    const erased = paintPartLayer('headpiece', layer, [[10, 2]], null, true);
    expect(partCells(erased)).toEqual([]);
  });

  it('fills a 4-connected region and stops at its boundary', () => {
    let layer = emptyPartLayer('headpiece');
    const ring: [number, number][] = [];
    for (let x = 4; x <= 8; x++) ring.push([x, 2], [x, 6]);
    for (let y = 3; y <= 5; y++) ring.push([4, y], [8, y]);
    layer = paintPartLayer('headpiece', layer, ring, hair);
    layer = paintPartLayer('headpiece', layer, [[9, 7]], hair);
    const inside = fillPartLayer('headpiece', layer, 6, 4, gold);
    const filled = partCells(inside).filter(([, , color]) => color === '#EFB93F');
    expect(filled.map(([x, y]) => `${x},${y}`).sort()).toEqual(
      ['5,3', '6,3', '7,3', '5,4', '6,4', '7,4', '5,5', '6,5', '7,5'].sort(),
    );
    const outside = fillPartLayer('headpiece', layer, 0, 0, gold);
    const outer = partCells(outside).filter(([, , color]) => color === '#EFB93F');
    expect(outer).toHaveLength(32 * 16 - ring.length - 1 - 9);
    expect(outer.some(([x, y]) => x === 6 && y === 4)).toBe(false);
    expect(outer.some(([x, y]) => x === 9 && y === 6)).toBe(true);
    const recolor = fillPartLayer('headpiece', layer, 4, 2, gold);
    expect(partCells(recolor).filter(([, , c]) => c === '#EFB93F')).toHaveLength(ring.length);
    expect(fillPartLayer('headpiece', layer, 4, 2, hair)).toEqual(layer);
  });

  it('fills the mirrored region too', () => {
    const layer = paintPartLayer(
      'headpiece',
      emptyPartLayer('headpiece'),
      Array.from({ length: 16 }, (_, y) => [15, y] as const),
      hair,
      true,
    );
    const filled = fillPartLayer('headpiece', layer, 2, 2, gold, true);
    const golden = partCells(filled).filter(([, , c]) => c === '#EFB93F');
    expect(golden).toHaveLength(32 * 16 - 32);
  });
});

describe('Custom Part rendering', () => {
  const human = withSpecies(DEFAULT_RECIPE, 'human');
  const wearing = withHeadpiece(human, ears);

  it('raises the asset version and keeps a valid canonical recipe', () => {
    expect(wearing.assetVersion).toBe(3);
    expect(isPixelAvatarRecipe(wearing)).toBe(true);
    expect(canonicalRecipe(wearing)).toEqual(wearing);
    expect(isPixelAvatarRecipe({ ...human, headpiece: ears })).toBe(false);
    expect(isPixelAvatarRecipe({ ...wearing, headpiece: { ...ears, slot: 'mouth' } })).toBe(false);
    const { headpiece: _, ...missing } = wearing;
    expect(isPixelAvatarRecipe(missing)).toBe(false);
    expect(withHeadpiece(wearing, undefined)).toEqual(human);
    expect(withHeadpiece(DEFAULT_RECIPE, ears).assetVersion).toBe(3);
    expect(withSpecies(wearing, 'goblin')).toMatchObject({
      assetVersion: 3,
      headpiece: canonicalCustomPart(ears),
    });
  });

  it('draws the front layer over the hair and recolors it with the hair', () => {
    expect(cellAt(wearing, 9, 2)).toBe(human.hairColor);
    expect(cellAt(wearing, 9, 3)).toBe(partToneColor(human.hairColor, -1));
    const pink = { ...wearing, hairColor: '#f06292' };
    expect(cellAt(pink, 9, 2)).toBe('#f06292');
  });

  it('keeps the back layer behind the hair', () => {
    expect(cellAt(human, 14, 6)).not.toBeUndefined();
    expect(cellAt(wearing, 14, 6)).toBe(cellAt(human, 14, 6));
    const bald = withHeadpiece(
      { ...human, bangs: 'none', sideHair: 'none', rightSideHair: 'none', backHair: 'none' },
      ears,
    );
    expect(cellAt(bald, 14, 6)).toBe('#efb93f');
  });

  it('follows the head through turns and leaves existing output unchanged', () => {
    const yaw = Math.max(...AVATAR_TURNS);
    const s = Math.round(Math.sin((yaw * Math.PI) / 180) * 3);
    expect(s).toBeGreaterThan(0);
    expect(cellAt(wearing, 22 + s, 2, yaw)).toBe(human.hairColor);
    expect(pixelAvatarSvg(withHeadpiece(wearing, undefined))).toBe(pixelAvatarSvg(human));
    for (const state of ['closed', 'half-open', 'open'])
      expect(pixelFigure(wearing, 0, { mouthLayers: true }).head).toContain(
        `data-avatar-mouth="${state}"`,
      );
  });

  it('renders custom parts as pinned', () => {
    const file = new URL('./fixtures/custom-part-golden.json', import.meta.url);
    const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);
    const actual = {
      ears: hash(pixelAvatarSvg(wearing, { turns: AVATAR_TURNS })),
      goblin: hash(pixelAvatarSvg(withSpecies(wearing, 'goblin'), { turns: AVATAR_TURNS })),
      flower: hash(pixelAvatarSvg(withSpecies(wearing, 'flower'), { turns: AVATAR_TURNS })),
    };
    if (process.env['BOTPIXEL_WRITE_SPECIES_GOLDEN'] === '1')
      writeFileSync(file, `${JSON.stringify(actual, null, 2)}\n`);
    expect(actual).toEqual(JSON.parse(readFileSync(file, 'utf8')));
  });
});
