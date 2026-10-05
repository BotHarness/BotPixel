import { describe, expect, it } from 'vitest';

import {
  AVATAR_HAIR_PARTS,
  AVATAR_PARTS,
  AVATAR_PRESETS,
  AVATAR_RANGES,
  canonicalRecipe,
  detailedRecipe,
  DEFAULT_RECIPE,
  pixelAvatarSvg,
  isPixelAvatarRecipe,
  seededRecipe,
  createSeededRecipe,
  type AvatarPart,
  type PixelAvatarRecipe,
} from '../src/index.js';

const parts = Object.keys(AVATAR_PARTS) as AvatarPart[];
const variants: PixelAvatarRecipe[] = parts.flatMap((part) =>
  AVATAR_PARTS[part].map((value) => ({ ...DEFAULT_RECIPE, [part]: value })),
);
const crowded: PixelAvatarRecipe[] = AVATAR_PARTS.head.flatMap((head) =>
  AVATAR_PARTS.hair.map((hair, index) => ({
    ...DEFAULT_RECIPE,
    head,
    hair,
    glasses: AVATAR_PARTS.glasses[index % AVATAR_PARTS.glasses.length]!,
    accessory: AVATAR_PARTS.accessory[index % AVATAR_PARTS.accessory.length]!,
  })),
);

describe('pixel avatar artwork', () => {
  it('renders every catalog option as distinct, inert, id-free pixel markup with stable rig nodes', () => {
    for (const part of parts.filter((name) => name !== 'backdrop')) {
      const rendered = new Set(
        AVATAR_PARTS[part].map((value) => pixelAvatarSvg({ ...DEFAULT_RECIPE, [part]: value })),
      );
      expect(rendered.size, part).toBe(AVATAR_PARTS[part].length);
    }
    for (const recipe of [...variants, ...crowded]) {
      const svg = pixelAvatarSvg(recipe);
      expect(svg).not.toMatch(/\sid=|<defs|<script|<image|href=|url\(/u);
      expect(svg).toContain('viewBox="0 0 32 32"');
      expect(svg).toContain('shape-rendering="crispEdges"');
      expect(svg).not.toContain('data-avatar-attention-mark');
      for (const node of ['body', 'head', 'face', 'gaze', 'blink'])
        expect(svg).toContain(`class="bh-illustrated-${node}"`);
      expect(svg).not.toContain('data-avatar-mark=');
      expect(svg).not.toContain('<path');
      expect(svg).toContain('<g data-avatar-pixel-morph=""></g>');
      expect(svg.match(/<rect/gu)!.length).toBeLessThan(1400);
    }
  });

  it('joins both lenses of framed glasses with a continuous bridge', () => {
    for (const [glasses, from, to] of [
      ['round', 14, 17],
      ['square', 14, 17],
    ] as const) {
      const svg = pixelAvatarSvg({ ...DEFAULT_RECIPE, glasses });
      const row = [
        ...svg.matchAll(/<rect x="(\d+)" y="16" width="(\d+)" height="1" fill="#2a2230"\/>/gu),
      ];
      const covered = new Set(
        row.flatMap(([, x, w]) => Array.from({ length: Number(w) }, (_, i) => Number(x) + i)),
      );
      for (let x = from; x <= to; x++) expect(covered.has(x), `${glasses} x=${x}`).toBe(true);
    }
  });

  it('keeps every static pixel inside the rounded tile', () => {
    const inside = (x: number, y: number) => {
      const clamp = (v: number) => Math.min(Math.max(v, 6), 26);
      return (x + 0.5 - clamp(x + 0.5)) ** 2 + (y + 0.5 - clamp(y + 0.5)) ** 2 <= 36;
    };
    for (const recipe of [...variants, ...crowded]) {
      const svg = pixelAvatarSvg(recipe).replace(
        /<g data-avatar-attention-mark[\s\S]*?<\/g>/gu,
        '',
      );
      for (const [, x, y, w] of svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)"/gu))
        for (let i = 0; i < Number(w); i++)
          expect(
            inside(Number(x) + i, Number(y)),
            `${recipe.hair}/${recipe.accessory} ${x},${y}`,
          ).toBe(true);
    }
  });

  it('splits hair into bangs, side and back hair with bounded geometry, all-or-none', () => {
    const base = detailedRecipe(DEFAULT_RECIPE);
    expect(isPixelAvatarRecipe(base)).toBe(true);
    for (const part of Object.keys(AVATAR_HAIR_PARTS) as (keyof typeof AVATAR_HAIR_PARTS)[]) {
      const rendered = new Set(
        AVATAR_HAIR_PARTS[part].map((value) =>
          pixelAvatarSvg({
            ...base,
            bangs: 'none',
            sideHair: 'none',
            backHair: 'none',
            [part]: value,
          }),
        ),
      );
      expect(rendered.size, part).toBe(AVATAR_HAIR_PARTS[part].length);
    }
    for (const [key, [min, max]] of Object.entries(AVATAR_RANGES)) {
      expect(isPixelAvatarRecipe({ ...base, [key]: min })).toBe(true);
      expect(isPixelAvatarRecipe({ ...base, [key]: max })).toBe(true);
      expect(isPixelAvatarRecipe({ ...base, [key]: max + 1 })).toBe(false);
      expect(isPixelAvatarRecipe({ ...base, [key]: min - 1 })).toBe(false);
      expect(isPixelAvatarRecipe({ ...base, [key]: 0.5 })).toBe(false);
    }
    const { bangs: _bangs, ...partial } = base;
    expect(isPixelAvatarRecipe(partial)).toBe(false);
    expect(isPixelAvatarRecipe({ ...base, backHair: 'crown' })).toBe(false);
    expect(detailedRecipe(base)).toBe(base);
    expect(canonicalRecipe({ ...base, backHair: 'twintails' })).toMatchObject({
      bangs: base.bangs,
      backHair: 'twintails',
      hairLength: 0,
    });
    const inside = (x: number, y: number) => {
      const clamp = (v: number) => Math.min(Math.max(v, 6), 26);
      return (x + 0.5 - clamp(x + 0.5)) ** 2 + (y + 0.5 - clamp(y + 0.5)) ** 2 <= 36;
    };
    for (const backHair of AVATAR_HAIR_PARTS.backHair)
      for (const pose of AVATAR_PARTS.pose)
        for (const extreme of [-1, 1]) {
          const recipe = {
            ...base,
            pose,
            backHair,
            spacing: extreme,
            height: extreme,
            hairLength: extreme * 2,
          };
          expect(isPixelAvatarRecipe(recipe), `${backHair}/${pose}`).toBe(true);
          const svg = pixelAvatarSvg(recipe, { turns: [-14, 14] });
          for (const [, x, y, w] of svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)"/gu))
            for (let i = 0; i < Number(w); i++)
              expect(inside(Number(x) + i, Number(y)), `${backHair}/${pose}`).toBe(true);
        }
  });

  it('derives a stable, valid default recipe from the name alone', () => {
    const ada = seededRecipe('Ada Lovelace');
    expect(isPixelAvatarRecipe(ada)).toBe(true);
    expect(seededRecipe('  ada lovelace ')).toEqual(ada);
    expect(ada.pose).toBe('front');
    const names = ['Ada', 'Grace', 'Linus', 'Margaret', 'Alan', 'Barbara', '小明', 'Rin'];
    const recipes = names.map(seededRecipe);
    expect(new Set(recipes.map((recipe) => JSON.stringify(recipe))).size).toBe(names.length);
    for (const recipe of recipes) expect(() => pixelAvatarSvg(recipe)).not.toThrow();
    expect(names.map(seededRecipe)[1]).toEqual(seededRecipe(names[1]!));
    expect(createSeededRecipe('other')('Ada')).not.toEqual(seededRecipe('Ada'));
  });

  it('tints the tile from the hair colour and keeps colourless hair on paper', () => {
    const tile = (hairColor: string) =>
      pixelAvatarSvg({ ...DEFAULT_RECIPE, hairColor }).match(
        /<rect width="32" height="32" rx="6" fill="(#[\da-f]{6})"/u,
      )![1];
    expect(tile('#1d1b22')).toBe('#ece8e1');
    expect(tile('#f4f1ec')).toBe('#ece8e1');
    const teal = tile('#3fc1b8');
    expect(teal).not.toBe('#ece8e1');
    expect(teal).not.toBe(tile('#e2b04a'));
    for (const backdrop of AVATAR_PARTS.backdrop)
      expect(tile('#3fc1b8')).toBe(
        pixelAvatarSvg({
          ...DEFAULT_RECIPE,
          hairColor: '#3fc1b8',
          backdrop,
        }).match(/<rect width="32" height="32" rx="6" fill="(#[\da-f]{6})"/u)![1],
      );
  });

  it('ships distinct, valid presets', () => {
    expect(AVATAR_PRESETS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(AVATAR_PRESETS.map((recipe) => JSON.stringify(recipe))).size).toBe(
      AVATAR_PRESETS.length,
    );
    for (const recipe of AVATAR_PRESETS) expect(isPixelAvatarRecipe(recipe)).toBe(true);
  });

  it('rejects unknown parts and keeps the recipe closed', () => {
    expect(isPixelAvatarRecipe(DEFAULT_RECIPE)).toBe(true);
    for (const invalid of [
      { ...DEFAULT_RECIPE, eyes: 'laser' },
      { ...DEFAULT_RECIPE, accessory: 'glasses' },
      { ...DEFAULT_RECIPE, extra: 'x' },
      { ...DEFAULT_RECIPE, skinColor: 'red' },
    ])
      expect(isPixelAvatarRecipe(invalid)).toBe(false);
  });

  it('applies recipe colours for extreme values', () => {
    const svg = pixelAvatarSvg({
      ...DEFAULT_RECIPE,
      skinColor: '#000000',
      hairColor: '#ffffff',
      shirtColor: '#ff00ff',
    });
    for (const colour of ['#000000', '#ff00ff']) expect(svg).toContain(`fill="${colour}"`);
  });

  it('renames the rig classes when asked and leaves the default untouched', () => {
    const svg = pixelAvatarSvg(DEFAULT_RECIPE, { classPrefix: 'face' });
    for (const node of ['body', 'head', 'face', 'gaze', 'blink'])
      expect(svg).toContain(`class="face-${node}"`);
    expect(svg).not.toContain('bh-illustrated');
    expect(pixelAvatarSvg(DEFAULT_RECIPE, { classPrefix: 'bh-illustrated' })).toBe(
      pixelAvatarSvg(DEFAULT_RECIPE),
    );
  });
});
