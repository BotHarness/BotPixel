import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AVATAR_EXTRA_PARTS,
  AVATAR_PARTS_V2,
  AVATAR_TURNS,
  DEFAULT_RECIPE,
  canonicalRecipe,
  hiddenChoices,
  isPixelAvatarRecipe,
  pixelAvatarSvg,
  pixelFigure,
  seededRecipe,
  seededRecipeV2,
  withSpecies,
  type PixelAvatarRecipe,
} from '../src/index.js';

const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const render = (recipe: PixelAvatarRecipe) => ({
  front: hash(pixelAvatarSvg(recipe)),
  turns: hash(pixelAvatarSvg(recipe, { turns: AVATAR_TURNS })),
  mouths: hash(pixelFigure(recipe, 0, { mouthLayers: true }).head),
});

const dwarf = withSpecies(DEFAULT_RECIPE, 'dwarf');
const flower = withSpecies(DEFAULT_RECIPE, 'flower');

describe('medieval species, beards, outfits and headwear', () => {
  it('accepts the new species, extras and version 2 catalog choices only in version 2', () => {
    for (const species of ['elf', 'dwarf', 'orc', 'flower'] as const)
      expect(isPixelAvatarRecipe(withSpecies(DEFAULT_RECIPE, species))).toBe(true);
    expect(isPixelAvatarRecipe({ ...dwarf, beard: 'braided', outfit: 'armor' })).toBe(true);
    expect(isPixelAvatarRecipe({ ...dwarf, accessory: 'helmet' })).toBe(true);
    expect(isPixelAvatarRecipe({ ...flower, petals: 'tulip', flowerBase: 'pot' })).toBe(true);
    expect(isPixelAvatarRecipe({ ...dwarf, beard: 'goatee' })).toBe(false);
    expect(isPixelAvatarRecipe({ ...DEFAULT_RECIPE, outfit: 'armor' })).toBe(false);
    expect(isPixelAvatarRecipe({ ...DEFAULT_RECIPE, beard: 'full' })).toBe(false);
    expect(canonicalRecipe({ ...dwarf, beard: 'full' })).toEqual({ ...dwarf, beard: 'full' });
  });

  it('reports choices it keeps but does not draw', () => {
    expect(hiddenChoices(DEFAULT_RECIPE)).toEqual([]);
    expect(hiddenChoices({ ...dwarf, accessory: 'hood' })).toEqual([
      'bangs',
      'sideHair',
      'rightSideHair',
      'backHair',
      'nose',
    ]);
    expect(hiddenChoices({ ...flower, beard: 'full' })).toEqual([
      'bangs',
      'sideHair',
      'rightSideHair',
      'backHair',
      'outfit',
      'accessory',
      'eyes',
      'brows',
      'nose',
      'cheeks',
      'glasses',
      'beard',
    ]);
  });

  it('hides hair under a helmet or hood and restores it when removed', () => {
    for (const accessory of ['helmet', 'hood'] as const) {
      const long = { ...dwarf, accessory, backHair: 'long' as const, bangs: 'messy' as const };
      expect(pixelAvatarSvg(long)).toBe(pixelAvatarSvg({ ...dwarf, accessory }));
    }
    expect(pixelAvatarSvg({ ...dwarf, backHair: 'long' })).not.toBe(pixelAvatarSvg(dwarf));
  });

  it('keeps hair, outfit and beard saved but undrawn on a flower', () => {
    const dressed = {
      ...flower,
      outfit: 'armor' as const,
      beard: 'full' as const,
      bangs: 'messy' as const,
    };
    expect(pixelAvatarSvg(dressed)).toBe(pixelAvatarSvg(flower));
  });

  it('gives a flower bead eyes instead of the saved eyes, brows, nose, cheeks and glasses', () => {
    const plain = pixelAvatarSvg(flower);
    for (const [part, value] of [
      ['eyes', 'sparkle'],
      ['brows', 'angry'],
      ['nose', 'line'],
      ['cheeks', 'freckles'],
      ['glasses', 'shades'],
    ] as const)
      expect(pixelAvatarSvg({ ...flower, [part]: value }), part).toBe(plain);
    for (const state of ['closed', 'half-open', 'open'])
      expect(pixelFigure(flower, 0, { mouthLayers: true }).head).toContain(
        `data-avatar-mouth="${state}"`,
      );
  });

  it('leaves every speaking mouth visible through a beard', () => {
    for (const beard of AVATAR_EXTRA_PARTS.beard) {
      const head = pixelFigure({ ...dwarf, beard }, 0, { mouthLayers: true }).head;
      for (const state of ['closed', 'half-open', 'open']) {
        const layer = head.split(`data-avatar-mouth="${state}"`)[1]!.split('</g>')[0]!;
        expect(layer, `${beard} ${state}`).toContain('#7a2a38');
      }
    }
  });

  it('renders the new species, parts, turns and mouths as pinned', () => {
    const recipes: Record<string, PixelAvatarRecipe> = {};
    for (const species of ['elf', 'dwarf', 'orc', 'flower'] as const)
      recipes[species] = withSpecies(DEFAULT_RECIPE, species);
    for (const beard of AVATAR_EXTRA_PARTS.beard)
      for (const head of ['round', 'square'] as const)
        recipes[`beard-${beard}-${head}`] = { ...dwarf, beard, head };
    for (const outfit of AVATAR_PARTS_V2.outfit.slice(-4))
      recipes[`outfit-${outfit}`] = { ...dwarf, outfit };
    for (const accessory of AVATAR_PARTS_V2.accessory.slice(-2))
      recipes[`accessory-${accessory}`] = { ...withSpecies(DEFAULT_RECIPE, 'elf'), accessory };
    for (const petals of AVATAR_EXTRA_PARTS.petals)
      for (const flowerBase of AVATAR_EXTRA_PARTS.flowerBase)
        recipes[`flower-${petals}-${flowerBase}`] = { ...flower, petals, flowerBase };
    recipes['flower-two-tone'] = {
      ...flower,
      petals: 'sakura',
      leftSideHairColor: '#f06292',
      rightSideHairColor: '#3fc1b8',
    };
    for (const name of ['Ada', 'Grace', 'Linus', 'DeepSeekBot', 'Gimli', 'Daisy'])
      recipes[`seed-v2-${name}`] = seededRecipeV2(name);
    recipes['dwarf-extremes'] = { ...dwarf, beard: 'braided', height: 1, spacing: 1 };
    const actual = Object.fromEntries(Object.entries(recipes).map(([k, r]) => [k, render(r)]));
    const file = new URL('./fixtures/species-more-golden.json', import.meta.url);
    if (process.env['BOTPIXEL_WRITE_SPECIES_GOLDEN'] === '1')
      writeFileSync(file, `${JSON.stringify(actual, null, 2)}\n`);
    expect(actual).toEqual(JSON.parse(readFileSync(file, 'utf8')));
  });

  it('seeds a valid, stable face from every species without changing version 1 seeds', () => {
    const names = Array.from({ length: 300 }, (_, i) => `bot-${i}`);
    const faces = names.map((name) => seededRecipeV2(name));
    for (const face of faces) expect(isPixelAvatarRecipe(face)).toBe(true);
    expect(new Set(faces.map((face) => face.species))).toEqual(
      new Set(['human', 'goblin', 'elf', 'dwarf', 'orc', 'flower']),
    );
    expect(faces.some((face) => face.beard)).toBe(true);
    expect(seededRecipeV2('Ada')).toEqual(seededRecipeV2(' ada '));
    expect(seededRecipe('Ada').assetVersion).toBe(1);
  });
});
