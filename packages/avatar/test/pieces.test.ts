import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AVATAR_HEADPIECES,
  AVATAR_STRANDS,
  AVATAR_TURNS,
  DEFAULT_RECIPE,
  builtInHeadpiece,
  headpieceStart,
  canonicalRecipe,
  hiddenChoices,
  isPixelAvatarRecipe,
  pixelAvatarSvg,
  pixelFigure,
  withBuiltInHeadpiece,
  withCustomPart,
  withPieces,
  withSpecies,
  wornPart,
  type PixelAvatarRecipe,
  type PixelCustomPart,
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

const human = withPieces(DEFAULT_RECIPE);
const long = {
  ...human,
  bangs: 'bob',
  sideHair: 'long',
  rightSideHair: 'long',
  backHair: 'long',
} as const;
const crown: PixelCustomPart = { slot: 'headpiece', front: [[16, 1, '#efb93f', 0]], back: [] };

describe('every hair piece colored and built-in headpieces (asset version 4)', () => {
  it('accepts version 4 fields only in version 4 and keeps earlier recipes valid', () => {
    expect(human.assetVersion).toBe(4);
    expect(isPixelAvatarRecipe(human)).toBe(true);
    expect(
      isPixelAvatarRecipe({
        ...long,
        bangsColor: '#F06292',
        backHairColor: '#3fc1b8',
        strand: 'curl',
        strandColor: '#e2b04a',
        headpiece: 'wings',
        accessory: 'bow',
      }),
    ).toBe(true);
    expect(isPixelAvatarRecipe(withCustomPart(human, 'headpiece', crown))).toBe(true);
    expect(isPixelAvatarRecipe({ ...human, headpiece: 'tiara' })).toBe(false);
    expect(isPixelAvatarRecipe({ ...human, strand: 'mohawk' })).toBe(false);
    expect(isPixelAvatarRecipe({ ...human, bangsColor: 'pink' })).toBe(false);
    const v2 = withSpecies(DEFAULT_RECIPE, 'human');
    expect(isPixelAvatarRecipe({ ...v2, bangsColor: '#f06292' })).toBe(false);
    expect(isPixelAvatarRecipe({ ...v2, strand: 'ahoge' })).toBe(false);
    expect(
      isPixelAvatarRecipe({ ...withCustomPart(v2, 'headpiece', crown), headpiece: 'halo' }),
    ).toBe(false);
    expect(canonicalRecipe({ ...human, bangsColor: '#F06292', headpiece: 'halo' })).toEqual({
      ...human,
      bangsColor: '#f06292',
      headpiece: 'halo',
    });
  });

  it('moves a headpiece accessory into the headpiece slot only through withPieces', () => {
    const saved = { ...DEFAULT_RECIPE, accessory: 'catears' } as const;
    expect(pixelAvatarSvg(saved)).toBe(pixelAvatarSvg({ ...DEFAULT_RECIPE, accessory: 'catears' }));
    const edited = withPieces(saved);
    expect(edited).toMatchObject({ assetVersion: 4, accessory: 'none', headpiece: 'catears' });
    expect(builtInHeadpiece(edited)).toBe('catears');
    expect(wornPart(edited, 'headpiece')).toBeUndefined();
    const both = { ...edited, accessory: 'bow' } as const;
    expect(isPixelAvatarRecipe(both)).toBe(true);
    expect(changed(withBuiltInHeadpiece(both, undefined), both).length).toBeGreaterThan(0);
    expect(changed({ ...edited, accessory: 'none' }, both).length).toBeGreaterThan(0);
    const drawn = withPieces({
      ...withCustomPart(DEFAULT_RECIPE, 'headpiece', crown),
      accessory: 'horns',
    });
    expect(drawn.accessory).toBe('horns');
    expect(wornPart(drawn, 'headpiece')).toEqual(crown);
    expect(withCustomPart(both, 'headpiece', crown)).toMatchObject({
      assetVersion: 4,
      headpiece: crown,
    });
    expect(withCustomPart(both, 'headpiece', undefined).headpiece).toBeUndefined();
    expect(withCustomPart(human, 'bangs', undefined).assetVersion).toBe(4);
  });

  it('draws a headpiece base behind the hair and hides the far side when turned', () => {
    const ears = withBuiltInHeadpiece(human, 'catears');
    const asAccessory = { ...human, accessory: 'catears' } as const;
    const behind = changed(ears, asAccessory);
    expect(behind.length).toBeGreaterThan(0);
    expect(behind.every((key) => Number(key.split(',')[1]) <= 8)).toBe(true);
    for (const yaw of [-30, 30]) {
      const diff = changed(ears, human, yaw).map((key) => Number(key.split(',')[0]));
      const sides = new Set(diff.map((x) => (x < 16 ? 'left' : 'right')));
      expect(sides.size).toBe(1);
      expect([...sides][0]).toBe(yaw > 0 ? 'left' : 'right');
    }
    expect(
      new Set(
        changed(withBuiltInHeadpiece(human, 'halo'), human, 30).map(
          (k) => Number(k.split(',')[0]!) < 16,
        ),
      ),
    ).toEqual(new Set([true, false]));
  });

  it('colors each hair piece on its own and leaves the rest of the face alone', () => {
    const plain = cells(long);
    for (const [key, rows] of [
      ['bangsColor', [0, 17]],
      ['backHairColor', [0, 32]],
      ['leftSideHairColor', [6, 32]],
    ] as const) {
      const recolored = { ...long, [key]: '#3fc1b8' } as PixelAvatarRecipe;
      const diff = changed(long, recolored);
      expect(diff.length).toBeGreaterThan(4);
      for (const k of diff) {
        const y = Number(k.split(',')[1]);
        expect(y).toBeGreaterThanOrEqual(rows[0]);
        expect(y).toBeLessThan(rows[1]);
      }
      if (key === 'leftSideHairColor')
        expect(diff.every((k) => Number(k.split(',')[0]) < 16)).toBe(true);
      expect(changed({ ...long, [key]: long.hairColor } as PixelAvatarRecipe, long)).toEqual([]);
    }
    expect(plain.size).toBeGreaterThan(0);
    const strand = { ...human, strand: 'ahoge' } as const;
    const tinted = changed(strand, { ...strand, strandColor: '#e2b04a' });
    expect(tinted.length).toBeGreaterThan(0);
    expect(tinted.every((k) => Number(k.split(',')[1]) <= 5)).toBe(true);
    expect(hiddenChoices({ ...withSpecies(strand, 'flower') })).toContain('strand');
  });

  it('flattens a built-in headpiece into a Custom Part that renders identically facing front', () => {
    for (const headpiece of AVATAR_HEADPIECES) {
      const wearing = withBuiltInHeadpiece({ ...human, accessory: 'hairclip' }, headpiece);
      const start = headpieceStart(wearing);
      expect(start.front.length + start.back.length).toBeGreaterThan(0);
      const copy = withCustomPart(wearing, 'headpiece', start);
      expect(builtInHeadpiece(copy)).toBeUndefined();
      expect(changed(copy, wearing)).toEqual([]);
    }
    const ears = headpieceStart(withBuiltInHeadpiece(human, 'catears'));
    expect(ears.front.some(([, , color]) => color === 'hairColor')).toBe(true);
    expect(headpieceStart(withCustomPart(human, 'headpiece', crown))).toEqual(crown);
    expect(headpieceStart(human)).toEqual({ slot: 'headpiece', front: [], back: [] });
  });

  it('matches the version 4 golden output', () => {
    const recipes: Record<string, PixelAvatarRecipe> = {};
    for (const headpiece of AVATAR_HEADPIECES)
      recipes[`headpiece-${headpiece}`] = withBuiltInHeadpiece(
        { ...human, accessory: 'hairclip' },
        headpiece,
      );
    for (const strand of AVATAR_STRANDS) {
      recipes[`strand-${strand}`] = { ...human, strand };
      recipes[`strand-${strand}-colored`] = { ...human, strand, strandColor: '#e2b04a' };
    }
    recipes['pieces-all'] = {
      ...long,
      bangsColor: '#f06292',
      backHairColor: '#3fc1b8',
      leftSideHairColor: '#e2b04a',
      rightSideHairColor: '#5a7be0',
    };
    recipes['pieces-bangs'] = { ...long, bangsColor: '#f06292' };
    recipes['pieces-back'] = { ...long, backHairColor: '#3fc1b8' };
    recipes['migrated-ahoge-catears'] = withPieces({
      ...DEFAULT_RECIPE,
      hair: 'ahoge',
      accessory: 'catears',
    });
    const actual = Object.fromEntries(Object.entries(recipes).map(([k, r]) => [k, render(r)]));
    const file = new URL('./fixtures/pieces-golden.json', import.meta.url);
    if (process.env['BOTPIXEL_WRITE_PIECES_GOLDEN'] === '1')
      writeFileSync(file, `${JSON.stringify(actual, null, 2)}\n`);
    expect(actual).toEqual(JSON.parse(readFileSync(file, 'utf8')));
  });
});
