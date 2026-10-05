import { seededRandom } from './random.js';

export const AVATAR_PARTS = {
  head: ['round', 'oval', 'square', 'long', 'heart', 'vchin', 'chubby', 'diamond'],
  pose: ['front', 'left', 'right'],
  hair: [
    'crop',
    'sweep',
    'spiky',
    'buzz',
    'curly',
    'mohawk',
    'bob',
    'long',
    'bun',
    'pigtails',
    'afro',
    'twintails',
    'drills',
    'ponytail',
    'sidetail',
    'hime',
    'odango',
    'messy',
    'wavy',
    'braids',
    'wolf',
    'ahoge',
    'none',
  ],
  eyes: ['round', 'dot', 'sparkle', 'lashes', 'sleepy', 'happy', 'wink', 'sharp'],
  brows: ['soft', 'thick', 'raised', 'angry', 'worried', 'none'],
  nose: ['button', 'dot', 'line', 'none'],
  mouth: ['smile', 'grin', 'open', 'flat', 'smirk', 'cat', 'tongue', 'o'],
  cheeks: ['blush', 'freckles', 'none'],
  glasses: ['none', 'round', 'square', 'shades', 'monocle'],
  outfit: [
    'tee',
    'shirttie',
    'hoodie',
    'turtleneck',
    'sailor',
    'blazer',
    'overalls',
    'dress',
    'kimono',
    'cardigan',
    'maid',
    'jacket',
  ],
  backdrop: ['sparkles', 'hearts', 'stars', 'dots', 'none'],
  accessory: [
    'none',
    'beanie',
    'cap',
    'headphones',
    'flower',
    'bow',
    'earring',
    'crown',
    'halo',
    'catears',
    'hairclip',
    'horns',
    'beret',
    'ribbon',
    'headband',
    'bunnyears',
    'horseears',
    'flowercrown',
    'witch',
    'pins',
  ],
} as const;

export type AvatarPart = keyof typeof AVATAR_PARTS;
export const AVATAR_COLORS = ['skinColor', 'hairColor', 'eyeColor', 'shirtColor'] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

export type PixelAvatarRecipe = {
  schemaVersion: 1;
  family: 'illustrated';
  assetVersion: 1;
  rigVersion: 1;
} & { [P in AvatarPart]: (typeof AVATAR_PARTS)[P][number] } & Record<AvatarColor, string>;

export const DEFAULT_RECIPE: PixelAvatarRecipe = {
  schemaVersion: 1,
  family: 'illustrated',
  assetVersion: 1,
  rigVersion: 1,
  head: 'round',
  pose: 'front',
  hair: 'crop',
  eyes: 'round',
  brows: 'soft',
  nose: 'button',
  mouth: 'smile',
  cheeks: 'blush',
  glasses: 'none',
  outfit: 'tee',
  backdrop: 'sparkles',
  accessory: 'none',
  skinColor: '#f2c9a8',
  hairColor: '#5a3a2a',
  eyeColor: '#3f7fbf',
  shirtColor: '#5b8bd6',
};

const PART_KEYS = Object.keys(AVATAR_PARTS) as AvatarPart[];

export function isPixelAvatarRecipe(value: unknown): value is PixelAvatarRecipe {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  if (Object.keys(r).length !== Object.keys(DEFAULT_RECIPE).length) return false;
  return (
    r['schemaVersion'] === 1 &&
    r['family'] === 'illustrated' &&
    r['assetVersion'] === 1 &&
    r['rigVersion'] === 1 &&
    PART_KEYS.every(
      (key) =>
        typeof r[key] === 'string' && (AVATAR_PARTS[key] as readonly string[]).includes(r[key]),
    ) &&
    AVATAR_COLORS.every((key) => typeof r[key] === 'string' && /^#[\da-f]{6}$/iu.test(r[key]))
  );
}

export function canonicalRecipe(recipe: PixelAvatarRecipe): PixelAvatarRecipe {
  const canonical: Record<string, unknown> = {
    schemaVersion: 1,
    family: 'illustrated',
    assetVersion: 1,
    rigVersion: 1,
  };
  for (const key of PART_KEYS) canonical[key] = recipe[key];
  for (const key of AVATAR_COLORS) canonical[key] = recipe[key].toLowerCase();
  return canonical as PixelAvatarRecipe;
}

export const AVATAR_SWATCHES: Record<AvatarColor, readonly string[]> = {
  skinColor: [
    '#ffe3cf',
    '#f2c9a8',
    '#e0a87e',
    '#c68863',
    '#9a6142',
    '#6e4129',
    '#4a2c1c',
    '#f4f1ec',
  ],
  hairColor: [
    '#1d1b22',
    '#5a3a2a',
    '#8a5a36',
    '#e2b04a',
    '#c4452f',
    '#d9475a',
    '#f06292',
    '#3fc1b8',
    '#5a7be0',
    '#9aa3ad',
    '#f4f1ec',
  ],
  eyeColor: [
    '#3f7fbf',
    '#5a3a2a',
    '#2f9e8f',
    '#4c8a3c',
    '#8a5ad0',
    '#d0533f',
    '#d9a13a',
    '#2a2230',
  ],
  shirtColor: [
    '#5b8bd6',
    '#e07a5f',
    '#3d9970',
    '#7a5cc7',
    '#f2c14e',
    '#2f3a4a',
    '#e2565f',
    '#9ad0c2',
  ],
};

const SEEDED_CHOICES: { [P in AvatarPart]: readonly (typeof AVATAR_PARTS)[P][number][] } = {
  head: ['round', 'oval', 'square', 'long', 'heart', 'vchin', 'chubby', 'diamond'],
  pose: ['front'],
  hair: AVATAR_PARTS.hair.filter((hair) => hair !== 'none'),
  eyes: ['round', 'round', 'sparkle', 'lashes', 'dot', 'happy', 'sharp'],
  brows: ['soft', 'soft', 'thick', 'raised'],
  nose: ['button', 'dot', 'none'],
  mouth: ['smile', 'smile', 'grin', 'open', 'cat'],
  cheeks: ['blush', 'blush', 'freckles', 'none'],
  glasses: ['none', 'none', 'none', 'none', 'round', 'square'],
  accessory: [
    'none',
    'none',
    'none',
    'flower',
    'bow',
    'hairclip',
    'catears',
    'headphones',
    'beanie',
    'cap',
  ],
  outfit: AVATAR_PARTS.outfit,
  backdrop: ['sparkles', 'hearts', 'stars', 'dots'],
};

/**
 * Returns a name-seeded recipe factory. Different namespaces give different faces for the same
 * name; the factory takes the name only, so it is safe to pass straight to `Array.map`.
 */
export function createSeededRecipe(namespace: string): (seed: string) => PixelAvatarRecipe {
  return (seed) => {
    const random = seededRandom(`${namespace}:${seed.trim().toLowerCase()}`);
    const pick = <T>(values: readonly T[]) => values[Math.floor(random() * values.length)]!;
    const recipe: Record<string, unknown> = {
      schemaVersion: 1,
      family: 'illustrated',
      assetVersion: 1,
      rigVersion: 1,
    };
    for (const part of Object.keys(AVATAR_PARTS) as AvatarPart[])
      recipe[part] = pick(SEEDED_CHOICES[part]);
    for (const color of AVATAR_COLORS) recipe[color] = pick(AVATAR_SWATCHES[color].slice(0, 7));
    return recipe as PixelAvatarRecipe;
  };
}

/** The same name always gives the same face (BotHarness's namespace). */
export const seededRecipe: (seed: string) => PixelAvatarRecipe =
  createSeededRecipe('botharness-avatar');

const preset = (parts: Partial<PixelAvatarRecipe>): PixelAvatarRecipe => ({
  ...DEFAULT_RECIPE,
  ...parts,
});

export const AVATAR_PRESETS: readonly PixelAvatarRecipe[] = [
  preset({
    hair: 'wavy',
    eyes: 'lashes',
    accessory: 'beret',
    outfit: 'dress',
    skinColor: '#ffe3cf',
    hairColor: '#e2b04a',
    eyeColor: '#3f7fbf',
    shirtColor: '#e2565f',
    backdrop: 'stars',
  }),
  preset({
    hair: 'braids',
    accessory: 'flowercrown',
    outfit: 'cardigan',
    skinColor: '#ffe3cf',
    hairColor: '#8a5a36',
    eyeColor: '#4c8a3c',
    shirtColor: '#9ad0c2',
    backdrop: 'hearts',
  }),
  preset({
    hair: 'twintails',
    eyes: 'sparkle',
    accessory: 'ribbon',
    outfit: 'maid',
    skinColor: '#ffe3cf',
    hairColor: '#3fc1b8',
    eyeColor: '#2f9e8f',
    shirtColor: '#e2565f',
    backdrop: 'stars',
  }),
  preset({
    hair: 'long',
    accessory: 'horseears',
    outfit: 'jacket',
    skinColor: '#ffe3cf',
    hairColor: '#8a5a36',
    eyeColor: '#d0533f',
    shirtColor: '#5b8bd6',
    backdrop: 'dots',
  }),
  preset({
    hair: 'hime',
    eyes: 'sleepy',
    accessory: 'pins',
    outfit: 'kimono',
    skinColor: '#f4f1ec',
    hairColor: '#1d1b22',
    eyeColor: '#d0533f',
    shirtColor: '#7a5cc7',
    backdrop: 'none',
  }),
  preset({
    hair: 'ahoge',
    accessory: 'headband',
    outfit: 'sailor',
    skinColor: '#ffe3cf',
    hairColor: '#f06292',
    eyeColor: '#2f9e8f',
    shirtColor: '#f4f1ec',
    backdrop: 'hearts',
  }),
  preset({
    hair: 'wolf',
    eyes: 'sharp',
    outfit: 'jacket',
    skinColor: '#e0a87e',
    hairColor: '#9aa3ad',
    eyeColor: '#5a7be0',
    shirtColor: '#2f3a4a',
    backdrop: 'stars',
  }),
  preset({
    hair: 'wavy',
    eyes: 'sparkle',
    accessory: 'witch',
    outfit: 'dress',
    skinColor: '#ffe3cf',
    hairColor: '#8a5ad0',
    eyeColor: '#d9a13a',
    shirtColor: '#2f3a4a',
    backdrop: 'sparkles',
  }),
  preset({
    hair: 'bob',
    eyes: 'happy',
    accessory: 'bunnyears',
    outfit: 'cardigan',
    skinColor: '#ffe3cf',
    hairColor: '#f4f1ec',
    eyeColor: '#d9475a',
    shirtColor: '#f2c14e',
    backdrop: 'hearts',
  }),
  preset({
    hair: 'spiky',
    glasses: 'round',
    accessory: 'headphones',
    outfit: 'hoodie',
    backdrop: 'dots',
  }),
  preset({
    hair: 'odango',
    eyes: 'lashes',
    accessory: 'bow',
    outfit: 'kimono',
    hairColor: '#e2b04a',
    shirtColor: '#5b8bd6',
    backdrop: 'sparkles',
  }),
  preset({
    hair: 'crop',
    accessory: 'cap',
    outfit: 'shirttie',
    skinColor: '#9a6142',
    hairColor: '#1d1b22',
    shirtColor: '#3d9970',
    backdrop: 'dots',
  }),
];
