import { describe, expect, it } from 'vitest';
import {
  AVATAR_HAIR_PARTS,
  AVATAR_TURNS,
  DEFAULT_RECIPE,
  HAIR_PART_SLOTS,
  canonicalRecipe,
  hairPieceStart,
  isPixelAvatarRecipe,
  isPixelCustomPart,
  pixelAvatarSvg,
  pixelFigure,
  withCustomPart,
  withHeadpiece,
  withSpecies,
  wornPart,
  type HairPartSlot,
  type PartCell,
  type PixelAvatarRecipe,
  type PixelCustomPart,
} from '../src/index.js';

const base = withSpecies(DEFAULT_RECIPE, 'human');
const wearStart = (recipe: PixelAvatarRecipe, slots: readonly HairPartSlot[] = HAIR_PART_SLOTS) =>
  slots.reduce<PixelAvatarRecipe>(
    (current, slot) => withCustomPart(current, slot, hairPieceStart(recipe, slot)),
    recipe,
  );
const cellAt = (recipe: PixelAvatarRecipe, x: number, y: number) =>
  pixelFigure(recipe, 0).cells.find((cell) => cell.x === x && cell.y === y)?.c;

describe('drawn hair pieces', () => {
  it(
    'flattens every built-in piece and renders an unchanged copy identically',
    { timeout: 30_000 },
    () => {
      const variants = [
        ...AVATAR_HAIR_PARTS.bangs.map((bangs) => ({ bangs })),
        ...AVATAR_HAIR_PARTS.sideHair.map((sideHair) => ({ sideHair, rightSideHair: sideHair })),
        ...AVATAR_HAIR_PARTS.backHair.map((backHair) => ({ backHair })),
        { sideHair: 'long' as const, rightSideHair: 'bob' as const },
      ];
      for (const variant of variants)
        for (const hairLength of [0, 2]) {
          const recipe = { ...base, ...variant, hairLength } as PixelAvatarRecipe;
          const label = `${JSON.stringify(variant)}/${hairLength}`;
          const worn = wearStart(recipe);
          expect(worn.assetVersion, label).toBe(3);
          expect(isPixelAvatarRecipe(worn), label).toBe(true);
          expect(pixelAvatarSvg(worn), label).toBe(pixelAvatarSvg(recipe));
        }
    },
  );

  it('turns an unchanged copy exactly like the built-in piece', () => {
    const turned = (recipe: PixelAvatarRecipe) => pixelAvatarSvg(recipe, { turns: AVATAR_TURNS });
    // Wolf back hair is notched on a tile-fixed pattern, so its turned mask is no pure shift; a
    // drawn copy keeps the notches it was drawn with and moves with the back-hair offset.
    for (const backHair of AVATAR_HAIR_PARTS.backHair.filter((style) => style !== 'wolf')) {
      const recipe = { ...base, backHair } as PixelAvatarRecipe;
      expect(turned(wearStart(recipe, ['backHair'])), backHair).toBe(turned(recipe));
    }
    for (const bangs of AVATAR_HAIR_PARTS.bangs) {
      const recipe = { ...base, bangs } as PixelAvatarRecipe;
      expect(turned(wearStart(recipe, ['bangs'])), bangs).toBe(turned(recipe));
    }
    for (const sideHair of AVATAR_HAIR_PARTS.sideHair) {
      const recipe = { ...base, sideHair, rightSideHair: sideHair } as PixelAvatarRecipe;
      expect(turned(wearStart(recipe, ['leftSideHair', 'rightSideHair'])), sideHair).toBe(
        turned(recipe),
      );
    }
  });

  it('keeps per-side hair colors on drawn side pieces', () => {
    const recipe = { ...base, sideHair: 'long' as const, leftSideHairColor: '#3fc1b8' };
    expect(pixelAvatarSvg(wearStart(recipe))).toBe(pixelAvatarSvg(recipe));
  });

  it('starts from the worn drawn piece once one is worn', () => {
    const start = hairPieceStart(base, 'bangs');
    const trimmed: PixelCustomPart = { ...start, front: start.front.slice(3) };
    const worn = withCustomPart(base, 'bangs', trimmed);
    expect(hairPieceStart(worn, 'bangs').front).toEqual(wornPart(worn, 'bangs')!.front);
  });

  it('reshapes, recolors with the hair and shows literal cells as drawn', () => {
    const start = hairPieceStart(base, 'bangs');
    const extra: PartCell[] = [
      [15, 0, 'hairColor', 0],
      [16, 0, '#efb93f', 0],
    ];
    const worn = withCustomPart(base, 'bangs', { ...start, front: [...start.front, ...extra] });
    expect(cellAt(base, 15, 0)).toBeUndefined();
    expect(cellAt(worn, 15, 0)).not.toBeUndefined();
    expect(cellAt(worn, 16, 0)).toBe('#efb93f');
    const pink = { ...worn, hairColor: '#f06292' };
    expect(pixelAvatarSvg(pink)).not.toBe(pixelAvatarSvg(worn));
    expect(cellAt(pink, 16, 0)).toBe('#efb93f');
  });

  it('hides drawn hair under a helmet or hood and on a flower', () => {
    const worn = wearStart(base);
    for (const accessory of ['helmet', 'hood'] as const)
      expect(pixelAvatarSvg({ ...worn, accessory } as PixelAvatarRecipe)).toBe(
        pixelAvatarSvg({ ...base, accessory }),
      );
    expect(pixelAvatarSvg(withSpecies(worn, 'flower'))).toBe(
      pixelAvatarSvg(withSpecies(base, 'flower')),
    );
  });

  it('turns drawn hair with the head and keeps every speech mouth', () => {
    const worn = wearStart(base);
    for (const turn of AVATAR_TURNS)
      expect(pixelFigure(worn, turn).cells.length).toBeGreaterThan(0);
    const head = pixelFigure(worn, 0, { mouthLayers: true }).head;
    for (const state of ['closed', 'half-open', 'open'])
      expect(head).toContain(`data-avatar-mouth="${state}"`);
  });

  it('restores the built-in piece when the drawn piece is taken off', () => {
    const worn = withCustomPart(base, 'backHair', hairPieceStart(base, 'backHair'));
    expect(withCustomPart(worn, 'backHair', undefined)).toEqual(base);
    const both = withHeadpiece(worn, {
      slot: 'headpiece',
      front: [[3, 3, 'hairColor', 0]],
      back: [],
    });
    expect(withCustomPart(both, 'backHair', undefined).assetVersion).toBe(3);
    expect(canonicalRecipe(both)).toEqual(both);
  });

  it('validates hair slots and the slot each recipe key holds', () => {
    const start = hairPieceStart(base, 'bangs');
    expect(isPixelCustomPart(start)).toBe(true);
    expect(isPixelCustomPart({ ...start, back: [[0, 0, 'hairColor', 0]] })).toBe(false);
    expect(isPixelCustomPart({ ...start, front: [[0, 32, 'hairColor', 0]] })).toBe(false);
    const worn = withCustomPart(base, 'bangs', start);
    expect(isPixelAvatarRecipe({ ...worn, bangsPart: { ...start, slot: 'backHair' } })).toBe(false);
    const { bangsPart: _, ...empty } = worn as Record<string, unknown>;
    expect(isPixelAvatarRecipe(empty)).toBe(false);
    expect(isPixelAvatarRecipe({ ...base, bangsPart: start })).toBe(false);
  });
});
