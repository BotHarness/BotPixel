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

  it('colors bun and odango knots with the back hair color, not the bangs color', () => {
    for (const backHair of ['bun', 'odango'] as const) {
      const knotted = { ...long, backHair, bangs: 'crop' } as const;
      const back = changed(knotted, { ...knotted, backHairColor: '#3fc1b8' });
      expect(back.length).toBeGreaterThan(4);
      expect(back.every((key) => Number(key.split(',')[1]) <= 7)).toBe(true);
      const bangs = changed(knotted, { ...knotted, bangsColor: '#f06292' });
      // only the dark outline on the seam between knot and fringe may take both colors
      const base = cells(knotted);
      const shared = bangs.filter((key) => back.includes(key));
      expect(shared.length).toBeLessThanOrEqual(4);
      for (const key of shared)
        expect(
          Math.max(...[1, 3, 5].map((i) => parseInt(base.get(key)!.slice(i, i + 2), 16))),
        ).toBeLessThan(0x40);
      expect(changed({ ...knotted, backHairColor: knotted.hairColor }, knotted)).toEqual([]);
      for (const yaw of [-30, 30])
        expect(
          changed(knotted, { ...knotted, backHairColor: '#3fc1b8' }, yaw).length,
        ).toBeGreaterThan(4);
    }
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

  it('keeps piece colors to hair pixels: no-ops, headpieces, eyes and petals stay put', () => {
    const sided = { ...long, leftSideHairColor: '#3fc1b8' } as const;
    for (const yaw of [0, -30, 30])
      expect(changed(sided, { ...sided, bangsColor: sided.hairColor }, yaw)).toEqual([]);
    const ears = withBuiltInHeadpiece({ ...human, bangs: 'curly' }, 'catears');
    const tinted = { ...ears, bangsColor: '#3fc1b8' };
    for (const key of ['8,3', '23,3', '7,4', '9,4', '22,4', '24,4'])
      expect(cells(tinted).get(key)).toBe(cells(ears).get(key));
    const eyed = {
      ...human,
      bangs: 'hime',
      sideHair: 'crop',
      rightSideHair: 'crop',
      backHair: 'long',
      eyeColor: '#123456',
    } as const;
    for (const yaw of [-30, 30]) {
      const head = pixelFigure({ ...eyed, bangsColor: '#3fc1b8' }, yaw).head;
      const face = head.indexOf('bh-illustrated-face');
      expect(head.slice(0, face < 0 ? head.length : face)).not.toContain('#123456');
    }
    const flower = withSpecies(human, 'flower');
    expect(changed(flower, { ...flower, backHairColor: '#3fc1b8' })).toEqual([]);
  });

  it('keeps withPieces idempotent and hides a strand without bangs', () => {
    const picked = { ...human, accessory: 'catears' } as const;
    expect(withPieces(picked)).toBe(picked);
    const bald = { ...human, bangs: 'none', strand: 'ahoge' } as const;
    expect(hiddenChoices(bald)).toContain('strand');
    expect(changed(bald, { ...bald, strand: undefined } as PixelAvatarRecipe)).toEqual([]);
    const plain = { ...human, bangs: 'crop' } as const;
    const tufted = { ...plain, strand: 'double' } as const;
    expect(
      changed(plain, tufted).every((key) => {
        const [x, y] = key.split(',').map(Number);
        return y! <= 4 && Math.abs(x! - 16) <= 4;
      }),
    ).toBe(true);
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
