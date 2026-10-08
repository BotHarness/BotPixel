import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BANNER_HEIGHT,
  BANNER_SCALE,
  BANNER_SCENES,
  BANNER_WIDTH,
  isPixelBannerRecipe,
  pixelBannerImage,
  pixelBannerPixels,
  scalePixels,
  seededBannerRecipe,
  type PixelBannerRecipe,
} from '../src/index.js';

const golden = JSON.parse(
  readFileSync(new URL('./fixtures/banner-golden.json', import.meta.url), 'utf8'),
) as {
  seeds: number[];
  names: string[];
  pixels: Record<string, string>;
  image: Record<string, string>;
  seeded: Record<string, PixelBannerRecipe>;
};
const hash = (data: Uint8ClampedArray) =>
  createHash('sha256').update(data).digest('hex').slice(0, 16);

describe('golden output', () => {
  it('renders every scene and seed to the locked pixels', () => {
    const actual: Record<string, string> = {};
    for (const scene of BANNER_SCENES)
      for (const seed of golden.seeds)
        actual[`${scene}:${seed}`] = hash(pixelBannerPixels({ scene, seed }).data);
    expect(actual).toEqual(golden.pixels);
  });

  it('scales to the locked 1500×500 image', () => {
    const actual: Record<string, string> = {};
    for (const scene of BANNER_SCENES)
      actual[scene] = hash(pixelBannerImage({ scene, seed: golden.seeds[0]! }).data);
    expect(actual).toEqual(golden.image);
  });

  it('seeds the same recipe from the same name', () => {
    for (const name of golden.names)
      expect(seededBannerRecipe(name), name).toEqual(golden.seeded[name]);
  });
});

describe('pixels', () => {
  it('fills every pixel opaquely at 150×50 and scales to exactly 1500×500', () => {
    for (const scene of BANNER_SCENES) {
      const base = pixelBannerPixels({ scene, seed: 7 });
      expect([base.width, base.height]).toEqual([BANNER_WIDTH, BANNER_HEIGHT]);
      for (let i = 3; i < base.data.length; i += 4) expect(base.data[i], scene).toBe(255);
      const image = pixelBannerImage({ scene, seed: 7 });
      expect([image.width, image.height]).toEqual([1500, 500]);
      expect(BANNER_SCALE).toBe(10);
    }
  });

  it('repeats each source pixel as a crisp block with no smoothing', () => {
    const base = pixelBannerPixels({ scene: 'sea', seed: 3 });
    const image = scalePixels(base, 4);
    const at = (img: typeof base, x: number, y: number) =>
      Array.from(img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4));
    for (const [x, y] of [
      [0, 0],
      [75, 25],
      [149, 49],
    ] as const)
      for (let dy = 0; dy < 4; dy++)
        for (let dx = 0; dx < 4; dx++)
          expect(at(image, x * 4 + dx, y * 4 + dy)).toEqual(at(base, x, y));
  });

  it('scales RGBA views that start at an unaligned byte offset', () => {
    const base = pixelBannerPixels({ scene: 'desert', seed: 5 });
    const shifted = new Uint8ClampedArray(base.data.length + 1);
    shifted.set(base.data, 1);
    const view = { ...base, data: shifted.subarray(1) };
    expect(scalePixels(view, 2).data).toEqual(scalePixels(base, 2).data);
  });

  it('gives different seeds different pictures and the same seed the same one', () => {
    const a = pixelBannerPixels({ scene: 'mountain', seed: 1 }).data;
    expect(pixelBannerPixels({ scene: 'mountain', seed: 1 }).data).toEqual(a);
    expect(pixelBannerPixels({ scene: 'mountain', seed: 2 }).data).not.toEqual(a);
  });
});

describe('recipes', () => {
  it('accepts only known scenes and 32-bit unsigned seeds', () => {
    expect(isPixelBannerRecipe({ scene: 'space', seed: 0 })).toBe(true);
    expect(isPixelBannerRecipe({ scene: 'space', seed: 2 ** 32 - 1 })).toBe(true);
    expect(isPixelBannerRecipe({ scene: 'beach', seed: 0 })).toBe(false);
    expect(isPixelBannerRecipe({ scene: 'space', seed: -1 })).toBe(false);
    expect(isPixelBannerRecipe({ scene: 'space', seed: 1.5 })).toBe(false);
    expect(isPixelBannerRecipe(null)).toBe(false);
    expect(() => pixelBannerPixels({ scene: 'beach' } as never)).toThrow(TypeError);
    expect(() => scalePixels(pixelBannerPixels({ scene: 'space', seed: 0 }), 1.5)).toThrow(
      RangeError,
    );
  });

  it('spreads seeded names across every scene', () => {
    const scenes = new Set(
      Array.from({ length: 200 }, (_, i) => seededBannerRecipe(`bot-${i}`).scene),
    );
    expect([...scenes].sort()).toEqual([...BANNER_SCENES].sort());
  });
});
