import { Grid } from './grid.js';
import { seededRandom } from './random.js';
import { PAINTERS } from './scenes.js';

export const BANNER_SCENES = [
  'spring',
  'summer',
  'autumn',
  'winter',
  'sea',
  'mountain',
  'desert',
  'forest',
  'night-sky',
  'space',
] as const satisfies readonly (keyof typeof PAINTERS)[];

export type PixelBannerScene = (typeof BANNER_SCENES)[number];

export interface PixelBannerRecipe {
  scene: PixelBannerScene;
  seed: number;
}

export interface PixelBannerImage {
  width: number;
  height: number;
  // row-major RGBA, 4 bytes per pixel, fully opaque; ready for ImageData or a PNG encoder
  data: Uint8ClampedArray;
}

// 150×50 scaled ×10 is exactly 1500×500, the 3:1 banner size, with no fractional pixels
export const BANNER_WIDTH = 150;
export const BANNER_HEIGHT = 50;
export const BANNER_SCALE = 10;

export function isPixelBannerRecipe(value: unknown): value is PixelBannerRecipe {
  if (typeof value !== 'object' || value === null) return false;
  const { scene, seed } = value as Record<string, unknown>;
  return (
    BANNER_SCENES.includes(scene as PixelBannerScene) &&
    Number.isInteger(seed) &&
    (seed as number) >= 0 &&
    (seed as number) < 2 ** 32
  );
}

export function seededBannerRecipe(name: string): PixelBannerRecipe {
  const rnd = seededRandom(`pixel-banner:${name}`);
  return {
    scene: BANNER_SCENES[Math.floor(rnd() * BANNER_SCENES.length)]!,
    seed: Math.floor(rnd() * 2 ** 32),
  };
}

export function pixelBannerPixels(recipe: PixelBannerRecipe): PixelBannerImage {
  if (!isPixelBannerRecipe(recipe)) throw new TypeError('invalid pixel banner recipe');
  const grid = new Grid(BANNER_WIDTH, BANNER_HEIGHT);
  PAINTERS[recipe.scene](grid, seededRandom(`${recipe.scene}:${recipe.seed}`));
  return { width: grid.width, height: grid.height, data: grid.data };
}

export function scalePixels(image: PixelBannerImage, scale: number): PixelBannerImage {
  if (!Number.isInteger(scale) || scale < 1)
    throw new RangeError('scale must be a positive integer');
  const width = image.width * scale;
  const height = image.height * scale;
  const data = new Uint8ClampedArray(width * height * 4);
  const source = new Uint32Array(
    image.data.buffer,
    image.data.byteOffset,
    image.width * image.height,
  );
  const target = new Uint32Array(data.buffer);
  for (let y = 0; y < height; y++) {
    const row = Math.floor(y / scale) * image.width;
    for (let x = 0; x < width; x++) target[y * width + x] = source[row + Math.floor(x / scale)]!;
  }
  return { width, height, data };
}

export function pixelBannerImage(
  recipe: PixelBannerRecipe,
  options: { scale?: number } = {},
): PixelBannerImage {
  return scalePixels(pixelBannerPixels(recipe), options.scale ?? BANNER_SCALE);
}
