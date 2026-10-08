import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AVATAR_HAIR_PARTS,
  AVATAR_PARTS,
  AVATAR_PRESETS,
  AVATAR_RANGES,
  AVATAR_SPECIES_SWATCHES,
  AVATAR_TURNS,
  DEFAULT_RECIPE,
  canonicalRecipe,
  detailedRecipe,
  isPixelAvatarRecipe,
  pixelAvatarSvg,
  pixelFigure,
  withSpecies,
  type PixelAvatarRecipe,
} from '../src/index.js';

const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const render = (recipe: PixelAvatarRecipe) => ({
  front: hash(pixelAvatarSvg(recipe)),
  turns: hash(pixelAvatarSvg(recipe, { turns: AVATAR_TURNS })),
  mouths: hash(pixelFigure(recipe, 0, { mouthLayers: true }).head),
});

const goblin = withSpecies(DEFAULT_RECIPE, 'goblin');

describe('asset version 2 recipes', () => {
  it('validates species, split side hair and piece colors', () => {
    expect(isPixelAvatarRecipe(goblin)).toBe(true);
    expect(isPixelAvatarRecipe({ ...goblin, leftSideHairColor: '#E2B04A' })).toBe(true);
    expect(
      isPixelAvatarRecipe({ ...goblin, leftSideHairColor: '#e2b04a', rightSideHairColor: '#000' }),
    ).toBe(false);
    expect(isPixelAvatarRecipe({ ...goblin, species: 'dragon' })).toBe(false);
    expect(isPixelAvatarRecipe({ ...goblin, rightSideHair: 'afro' })).toBe(false);
    expect(isPixelAvatarRecipe({ ...goblin, assetVersion: 1 })).toBe(false);
    expect(isPixelAvatarRecipe({ ...DEFAULT_RECIPE, assetVersion: 2 })).toBe(false);
    const { bangs: _, ...partial } = goblin;
    expect(isPixelAvatarRecipe(partial)).toBe(false);
    const { species: __, rightSideHair: ___, ...v1 } = { ...goblin, assetVersion: 1 as const };
    expect(isPixelAvatarRecipe(v1)).toBe(true);
  });

  it('keeps version 2 fields when canonicalising', () => {
    const recipe = { ...goblin, rightSideHair: 'bob' as const, rightSideHairColor: '#3FC1B8' };
    expect(canonicalRecipe(recipe)).toEqual({ ...recipe, rightSideHairColor: '#3fc1b8' });
    expect(canonicalRecipe(DEFAULT_RECIPE)).toEqual(DEFAULT_RECIPE);
  });

  it('switches species keeping choices and moving suggested skin colors only', () => {
    expect(goblin).toMatchObject({ assetVersion: 2, species: 'goblin', rightSideHair: 'crop' });
    expect(goblin.skinColor).toBe(AVATAR_SPECIES_SWATCHES.goblin[0]);
    const custom = withSpecies({ ...DEFAULT_RECIPE, skinColor: '#123456' }, 'goblin');
    expect(custom.skinColor).toBe('#123456');
    const back = withSpecies({ ...goblin, rightSideHair: 'bob' }, 'human');
    expect(back).toMatchObject({ species: 'human', rightSideHair: 'bob', hair: 'crop' });
    expect(back.skinColor).toBe(AVATAR_SPECIES_SWATCHES.human[0]);
  });

  it('renders a human version 2 recipe exactly like its version 1 source', () => {
    const sources = [DEFAULT_RECIPE, ...AVATAR_PRESETS];
    for (const source of sources) {
      const v2 = { ...withSpecies(source, 'human'), skinColor: source.skinColor };
      expect(pixelAvatarSvg(v2, { turns: AVATAR_TURNS })).toBe(
        pixelAvatarSvg(detailedRecipe(source), { turns: AVATAR_TURNS }),
      );
    }
  });

  it('ignores a piece color equal to the hair color', () => {
    const same = { ...goblin, leftSideHairColor: goblin.hairColor.toUpperCase() };
    expect(pixelAvatarSvg(same)).toBe(pixelAvatarSvg(goblin));
  });

  it('recolors only the chosen side piece', () => {
    const bob = withSpecies({ ...DEFAULT_RECIPE, hair: 'bob' }, 'human');
    const left = pixelFigure({ ...bob, leftSideHairColor: '#f06292' }, 0).cells;
    const plain = pixelFigure(bob, 0).cells;
    const changed = left.filter((cell, i) => cell.c !== plain[i]!.c);
    expect(changed.length).toBeGreaterThan(10);
    expect(changed.every((cell) => cell.x < 16)).toBe(true);
  });

  it('draws goblin ears and tusks without hiding the speaking mouth', () => {
    const human = pixelFigure(withSpecies(DEFAULT_RECIPE, 'human'), 0, { mouthLayers: true });
    const green = pixelFigure(goblin, 0, { mouthLayers: true });
    expect(green.head).toContain('#f6f0d8');
    expect(human.head).not.toContain('#f6f0d8');
    for (const state of ['closed', 'half-open', 'open'])
      expect(green.head).toContain(`data-avatar-mouth="${state}"`);
    const width = (cells: { x: number }[]) =>
      Math.max(...cells.map((c) => c.x)) - Math.min(...cells.map((c) => c.x));
    expect(width(green.cells)).toBeGreaterThanOrEqual(width(human.cells));
  });
});

// New golden entries for asset version 2. They are generated once (BOTPIXEL_WRITE_SPECIES_GOLDEN=1)
// and then pin the artwork; never regenerate them to make an unrelated change pass.
describe('species golden', () => {
  it('renders goblin parts, extremes, turns and split hair as pinned', () => {
    const recipes: Record<string, PixelAvatarRecipe> = { goblin };
    AVATAR_PRESETS.forEach((r, i) => (recipes[`preset-${i}`] = withSpecies(r, 'goblin')));
    for (const part of ['head', 'eyes', 'mouth', 'accessory', 'glasses'] as const)
      for (const value of AVATAR_PARTS[part])
        recipes[`${part}-${value}`] = { ...goblin, [part]: value };
    for (const value of AVATAR_HAIR_PARTS.sideHair)
      recipes[`right-${value}`] = { ...goblin, sideHair: 'none', rightSideHair: value };
    for (const [key, [min, max]] of Object.entries(AVATAR_RANGES))
      for (const value of [min, max])
        recipes[`${key}=${value}`] = { ...goblin, backHair: 'long', [key]: value };
    recipes['two-tone'] = {
      ...withSpecies({ ...DEFAULT_RECIPE, hair: 'bob' }, 'goblin'),
      leftSideHairColor: '#f06292',
      rightSideHairColor: '#3fc1b8',
    };
    const actual = Object.fromEntries(Object.entries(recipes).map(([k, r]) => [k, render(r)]));
    const file = new URL('./fixtures/species-golden.json', import.meta.url);
    if (process.env['BOTPIXEL_WRITE_SPECIES_GOLDEN'] === '1')
      writeFileSync(file, `${JSON.stringify(actual, null, 2)}\n`);
    expect(actual).toEqual(JSON.parse(readFileSync(file, 'utf8')));
  });
});
