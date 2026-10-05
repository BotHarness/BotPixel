import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pixelFrame, pixelMarkup, planPixels } from '@botharness/pixel-morph';
import { describe, expect, it } from 'vitest';
import {
  AVATAR_PARTS,
  AVATAR_PRESETS,
  AVATAR_TURNS,
  DEFAULT_RECIPE,
  PIXEL_SYMBOLS,
  faceCells,
  pixelAvatarSvg,
  pixelSymbolCells,
  seededRecipe,
  type PixelAvatarRecipe,
} from '../src/index.js';

// Hashes of BotHarness's own output before extraction (see `source` in the fixture). Saved
// avatars and name-seeded faces must not change when BotHarness switches to this package.
const golden = JSON.parse(
  readFileSync(new URL('./fixtures/botharness-golden.json', import.meta.url), 'utf8'),
) as {
  seeds: string[];
  colors: string[];
  svg: Record<string, string>;
  seeded: Record<string, PixelAvatarRecipe>;
  symbols: Record<string, string>;
  morph: Record<string, string>;
};
const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);

describe('BotHarness compatibility', () => {
  it('renders every catalog option and preset exactly as BotHarness did', () => {
    const recipes: Record<string, PixelAvatarRecipe> = { default: DEFAULT_RECIPE };
    AVATAR_PRESETS.forEach((recipe, index) => (recipes[`preset-${index}`] = recipe));
    for (const [part, values] of Object.entries(AVATAR_PARTS))
      for (const value of values)
        recipes[`${part}-${value}`] = { ...DEFAULT_RECIPE, [part]: value };
    const actual: Record<string, string> = {};
    for (const [key, recipe] of Object.entries(recipes)) {
      actual[key] = hash(pixelAvatarSvg(recipe));
      actual[`${key}+turns`] = hash(pixelAvatarSvg(recipe, { turns: AVATAR_TURNS }));
    }
    expect(actual).toEqual(golden.svg);
  });

  it('seeds the same face from the same name', () => {
    for (const seed of golden.seeds) expect(seededRecipe(seed), seed).toEqual(golden.seeded[seed]);
  });

  it('draws the same symbols and the same morph frames', () => {
    const symbols: Record<string, string> = {};
    for (const symbol of PIXEL_SYMBOLS)
      for (const color of golden.colors)
        symbols[`${symbol}${color}`] = hash(JSON.stringify(pixelSymbolCells(symbol, color)));
    expect(symbols).toEqual(golden.symbols);
    const morph: Record<string, string> = {};
    for (const [index, recipe] of AVATAR_PRESETS.entries())
      for (const symbol of PIXEL_SYMBOLS) {
        const pairs = planPixels(faceCells(recipe), pixelSymbolCells(symbol, recipe.hairColor));
        morph[`preset-${index}>${symbol}`] = hash(
          [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1].map((t) => pixelMarkup(pixelFrame(pairs, t))).join('|'),
        );
      }
    expect(morph).toEqual(golden.morph);
  });
});
