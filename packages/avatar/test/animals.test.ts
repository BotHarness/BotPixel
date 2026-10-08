import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AVATAR_ANIMAL_SPECIES,
  AVATAR_PATTERNS,
  AVATAR_SPECIES_SWATCHES,
  AVATAR_TURNS,
  DEFAULT_RECIPE,
  hiddenChoices,
  isPixelAvatarRecipe,
  pixelAvatarSvg,
  pixelFigure,
  replacePartStart,
  seededRecipeV2,
  withBuiltInHeadpiece,
  withCustomPart,
  withSpecies,
  type PixelAvatarRecipe,
} from '../src/index.js';

const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const render = (recipe: PixelAvatarRecipe) => ({
  front: hash(pixelAvatarSvg(recipe)),
  turns: hash(pixelAvatarSvg(recipe, { turns: AVATAR_TURNS })),
  mouths: hash(pixelFigure(recipe, 0, { mouthLayers: true }).head),
});
const cells = (recipe: PixelAvatarRecipe, yaw = 0) =>
  new Map(pixelFigure(recipe, yaw).cells.map(({ x, y, c }) => [`${x},${y}`, c]));
const changed = (a: PixelAvatarRecipe, b: PixelAvatarRecipe, yaw = 0) => {
  const [ca, cb] = [cells(a, yaw), cells(b, yaw)];
  return [...new Set([...ca.keys(), ...cb.keys()])].filter((key) => ca.get(key) !== cb.get(key));
};

const cat = withSpecies(DEFAULT_RECIPE, 'cat');

describe('animal species with patterns (asset version 4)', () => {
  it('accepts animal species and patterns only in version 4, with fur swatches', () => {
    for (const species of AVATAR_ANIMAL_SPECIES) {
      const animal = withSpecies(DEFAULT_RECIPE, species);
      expect(animal).toMatchObject({ assetVersion: 4, species });
      expect(isPixelAvatarRecipe(animal)).toBe(true);
      expect(animal.skinColor).toBe(AVATAR_SPECIES_SWATCHES[species][0]);
    }
    expect(isPixelAvatarRecipe({ ...cat, pattern: 'tabby' })).toBe(true);
    expect(isPixelAvatarRecipe({ ...cat, pattern: 'stripes' })).toBe(false);
    const v2 = withSpecies(DEFAULT_RECIPE, 'human');
    expect(isPixelAvatarRecipe({ ...v2, species: 'cat' })).toBe(false);
    expect(isPixelAvatarRecipe({ ...v2, pattern: 'spots' })).toBe(false);
    expect(withSpecies(cat, 'human').assetVersion).toBe(4);
    const custom = { ...cat, skinColor: '#123456' };
    expect(withSpecies(custom, 'fox').skinColor).toBe('#123456');
  });

  it('keeps version 2 seeds human-world and unchanged', () => {
    for (const name of ['Ada', 'Grace', 'Linus', 'DeepSeekBot', 'Gimli', 'Daisy'])
      expect(AVATAR_ANIMAL_SPECIES as readonly string[]).not.toContain(
        seededRecipeV2(name).species,
      );
  });

  it('draws a muzzle and animal nose instead of the human nose, keeping every mouth layer', () => {
    expect(hiddenChoices(cat)).toContain('nose');
    expect(changed({ ...cat, nose: 'dot' }, { ...cat, nose: 'line' })).toEqual([]);
    const mouths = pixelFigure(cat, 0, { mouthLayers: true }).head;
    for (const state of ['saved', 'closed', 'half-open', 'open'])
      expect(mouths).toContain(`data-avatar-mouth="${state}"`);
    for (const species of AVATAR_ANIMAL_SPECIES)
      expect(
        changed(withSpecies(DEFAULT_RECIPE, species), withSpecies(DEFAULT_RECIPE, 'human')).length,
      ).toBeGreaterThan(10);
  });

  it('draws patterns in fur tones that follow recoloring', () => {
    for (const pattern of AVATAR_PATTERNS.slice(1)) {
      const patterned = { ...cat, bangs: 'none', pattern } as const;
      const diff = changed(patterned, { ...patterned, pattern: 'solid' });
      expect(diff.length, pattern).toBeGreaterThan(0);
      const recolored = { ...patterned, skinColor: '#9aa3ad' };
      const shown = cells(recolored);
      expect(diff.some((key) => shown.get(key) !== cells(patterned).get(key))).toBe(true);
    }
    const drawn = withCustomPart({ ...cat, pattern: 'spots' }, 'pattern', {
      slot: 'pattern',
      front: [[10, 12, 'skinColor', -2]],
      back: [],
    });
    expect(changed(drawn, { ...cat, pattern: 'spots' }).length).toBeGreaterThan(0);
    const start = replacePartStart({ ...cat, bangs: 'none', pattern: 'patches' }, 'pattern');
    expect(start.front.length).toBeGreaterThan(0);
    const fur = start.front.filter(([, , color]) => color === 'skinColor');
    expect(fur.length / start.front.length).toBeGreaterThan(0.9);
    const copy = withCustomPart({ ...cat, bangs: 'none', pattern: 'patches' }, 'pattern', start);
    expect(changed(copy, { ...cat, bangs: 'none', pattern: 'patches' }).length).toBeLessThanOrEqual(
      2,
    );
    const human = withSpecies(DEFAULT_RECIPE, 'human');
    expect(hiddenChoices({ ...withSpecies(cat, 'human'), pattern: 'tabby' })).toContain('pattern');
    expect(human.assetVersion).toBe(2);
  });

  it('hides animal-ear headpieces and accessories on an animal and keeps them saved', () => {
    const eared = withBuiltInHeadpiece(cat, 'bunnyears');
    expect(hiddenChoices(eared)).toContain('headpiece');
    expect(changed(eared, cat)).toEqual([]);
    expect(hiddenChoices(withBuiltInHeadpiece(cat, 'halo'))).not.toContain('headpiece');
    const accessory = { ...cat, accessory: 'catears' } as const;
    expect(hiddenChoices(accessory)).toContain('accessory');
    expect(changed(accessory, cat)).toEqual([]);
    expect(changed(withSpecies(eared, 'human'), withSpecies(cat, 'human')).length).toBeGreaterThan(
      0,
    );
  });

  it('matches the animal golden output', () => {
    const recipes: Record<string, PixelAvatarRecipe> = {};
    for (const species of AVATAR_ANIMAL_SPECIES) {
      const animal = withSpecies(DEFAULT_RECIPE, species);
      recipes[species] = animal;
      recipes[`${species}-extremes`] = {
        ...animal,
        spacing: 1,
        height: 1,
        hairLength: 2,
        head: 'long',
      };
      recipes[`${species}-low`] = {
        ...animal,
        spacing: -1,
        height: -1,
        head: 'chubby',
        bangs: 'none',
      };
    }
    for (const pattern of AVATAR_PATTERNS)
      recipes[`cat-${pattern}`] = { ...cat, bangs: 'none', pattern };
    recipes['dog-patches-white'] = {
      ...withSpecies(DEFAULT_RECIPE, 'dog'),
      pattern: 'patches',
      skinColor: '#f4f1ec',
    };
    const actual = Object.fromEntries(Object.entries(recipes).map(([k, r]) => [k, render(r)]));
    const file = new URL('./fixtures/animals-golden.json', import.meta.url);
    if (process.env['BOTPIXEL_WRITE_ANIMALS_GOLDEN'] === '1')
      writeFileSync(file, `${JSON.stringify(actual, null, 2)}\n`);
    expect(actual).toEqual(JSON.parse(readFileSync(file, 'utf8')));
  });
});
