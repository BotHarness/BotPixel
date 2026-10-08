import {
  canonicalCustomPart,
  isPixelCustomPart,
  type PartSlot,
  type PixelCustomPart,
} from './part.js';
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

export const AVATAR_HAIR_PARTS = {
  bangs: [
    'crop',
    'bob',
    'sweep',
    'spiky',
    'curly',
    'messy',
    'wolf',
    'wavy',
    'ahoge',
    'hime',
    'buzz',
    'mohawk',
    'none',
  ],
  sideHair: ['crop', 'bun', 'bob', 'long', 'hime', 'curly', 'braids', 'none'],
  backHair: [
    'none',
    'bob',
    'long',
    'wavy',
    'wolf',
    'bun',
    'odango',
    'pigtails',
    'twintails',
    'drills',
    'ponytail',
    'sidetail',
    'afro',
  ],
} as const satisfies Record<string, readonly (typeof AVATAR_PARTS)['hair'][number][]>;
const HAIR_SPLIT: Record<
  (typeof AVATAR_PARTS)['hair'][number],
  { [P in AvatarHairPart]: (typeof AVATAR_HAIR_PARTS)[P][number] }
> = {
  crop: { bangs: 'crop', sideHair: 'crop', backHair: 'none' },
  sweep: { bangs: 'sweep', sideHair: 'crop', backHair: 'none' },
  spiky: { bangs: 'spiky', sideHair: 'crop', backHair: 'none' },
  buzz: { bangs: 'buzz', sideHair: 'none', backHair: 'none' },
  curly: { bangs: 'curly', sideHair: 'curly', backHair: 'none' },
  mohawk: { bangs: 'mohawk', sideHair: 'none', backHair: 'none' },
  bob: { bangs: 'bob', sideHair: 'bob', backHair: 'bob' },
  long: { bangs: 'bob', sideHair: 'long', backHair: 'long' },
  bun: { bangs: 'bob', sideHair: 'bun', backHair: 'bun' },
  pigtails: { bangs: 'bob', sideHair: 'bun', backHair: 'pigtails' },
  afro: { bangs: 'buzz', sideHair: 'none', backHair: 'afro' },
  twintails: { bangs: 'bob', sideHair: 'bob', backHair: 'twintails' },
  drills: { bangs: 'bob', sideHair: 'bob', backHair: 'drills' },
  ponytail: { bangs: 'bob', sideHair: 'bun', backHair: 'ponytail' },
  sidetail: { bangs: 'sweep', sideHair: 'bun', backHair: 'sidetail' },
  hime: { bangs: 'hime', sideHair: 'hime', backHair: 'long' },
  odango: { bangs: 'bob', sideHair: 'bun', backHair: 'odango' },
  messy: { bangs: 'messy', sideHair: 'bun', backHair: 'none' },
  wavy: { bangs: 'wavy', sideHair: 'long', backHair: 'wavy' },
  braids: { bangs: 'bob', sideHair: 'braids', backHair: 'none' },
  wolf: { bangs: 'wolf', sideHair: 'bun', backHair: 'wolf' },
  ahoge: { bangs: 'ahoge', sideHair: 'bob', backHair: 'bob' },
  none: { bangs: 'none', sideHair: 'none', backHair: 'none' },
};
export const AVATAR_RANGES = {
  spacing: [-1, 1],
  height: [-1, 1],
  hairLength: [-2, 2],
} as const;
export type AvatarHairPart = keyof typeof AVATAR_HAIR_PARTS;
export type AvatarRange = keyof typeof AVATAR_RANGES;
const DETAIL_KEYS = [
  ...(Object.keys(AVATAR_HAIR_PARTS) as AvatarHairPart[]),
  ...(Object.keys(AVATAR_RANGES) as AvatarRange[]),
] as const;

export type AvatarPart = keyof typeof AVATAR_PARTS;
export const AVATAR_COLORS = ['skinColor', 'hairColor', 'eyeColor', 'shirtColor'] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

/**
 * Avatar Species: a base on the pixel bust rig. Species share motion and anchors; each sets its
 * own ears, face details and suggested body colors. A recipe with a species is asset version 2.
 */
export const AVATAR_SPECIES = ['human', 'goblin', 'elf', 'dwarf', 'orc', 'flower'] as const;
export type AvatarSpecies = (typeof AVATAR_SPECIES)[number];
/** Optional per-piece hair colors (asset version 2); an absent piece uses `hairColor`. */
export const AVATAR_PIECE_COLORS = ['leftSideHairColor', 'rightSideHairColor'] as const;
export type AvatarPieceColor = (typeof AVATAR_PIECE_COLORS)[number];

/** Part choices that exist only in asset version 2, added after every version 1 choice. */
export const AVATAR_PARTS_V2 = {
  ...AVATAR_PARTS,
  outfit: [...AVATAR_PARTS.outfit, 'armor', 'robe', 'tunic', 'cloak'],
  accessory: [...AVATAR_PARTS.accessory, 'helmet', 'hood'],
} as const satisfies { [P in AvatarPart]: readonly string[] };
/** Optional asset version 2 parts; an absent part is not drawn (or uses the first choice). */
export const AVATAR_EXTRA_PARTS = {
  beard: ['short', 'full', 'braided'],
  petals: ['trumpet', 'daisy', 'sunflower', 'tulip', 'sakura'],
  flowerBase: ['leaves', 'pot'],
} as const;
export type AvatarExtraPart = keyof typeof AVATAR_EXTRA_PARTS;

type Meta = { schemaVersion: 1; family: 'illustrated'; rigVersion: 1 } & Record<
  AvatarColor,
  string
>;

/** Asset version 1: optional split hair and geometry, all six or none. */
export type PixelAvatarRecipeV1 = Meta & { assetVersion: 1 } & {
  [P in AvatarPart]: (typeof AVATAR_PARTS)[P][number];
} & {
  [P in AvatarHairPart]?: (typeof AVATAR_PARTS)['hair'][number];
} & { [P in AvatarRange]?: number } & {
  species?: never;
  rightSideHair?: never;
} & { [P in AvatarPieceColor | AvatarExtraPart]?: never } & { [P in CustomPartKey]?: never };

/**
 * Asset version 2: a species, the full split hair and geometry, a separate right side hair
 * (`sideHair` is then the left side) and optional per-side hair colors.
 */
export type PixelAvatarRecipeV2 = Meta & { assetVersion: 2 } & {
  [P in AvatarPart]: (typeof AVATAR_PARTS_V2)[P][number];
} & {
  [P in AvatarHairPart]: (typeof AVATAR_PARTS)['hair'][number];
} & { [P in AvatarRange]: number } & {
  species: AvatarSpecies;
  rightSideHair: (typeof AVATAR_HAIR_PARTS)['sideHair'][number];
} & { [P in AvatarPieceColor]?: string } & {
  [P in AvatarExtraPart]?: (typeof AVATAR_EXTRA_PARTS)[P][number];
} & { [P in CustomPartKey]?: never };

/** The recipe key that embeds the Custom Part worn in each slot. */
export const CUSTOM_PART_KEYS = {
  headpiece: 'headpiece',
  bangs: 'bangsPart',
  leftSideHair: 'leftSideHairPart',
  rightSideHair: 'rightSideHairPart',
  backHair: 'backHairPart',
  outfit: 'outfitPart',
  accessory: 'accessoryPart',
  beard: 'beardPart',
  glasses: 'glassesPart',
  nose: 'nosePart',
  cheeks: 'cheeksPart',
  petals: 'petalsPart',
  flowerBase: 'flowerBasePart',
} as const satisfies Record<PartSlot, string>;
export type CustomPartKey = (typeof CUSTOM_PART_KEYS)[PartSlot];
const PART_KEY_ENTRIES = Object.entries(CUSTOM_PART_KEYS) as [PartSlot, CustomPartKey][];

/**
 * Asset version 3: version 2 wearing at least one embedded Custom Part. A drawn hair piece
 * replaces the built-in piece, which stays saved and returns when the part is taken off.
 */
export type PixelAvatarRecipeV3 = Omit<PixelAvatarRecipeV2, 'assetVersion' | CustomPartKey> & {
  assetVersion: 3;
} & { [P in CustomPartKey]?: PixelCustomPart };

export type PixelAvatarRecipe = PixelAvatarRecipeV1 | PixelAvatarRecipeV2 | PixelAvatarRecipeV3;

export const DEFAULT_RECIPE: PixelAvatarRecipeV1 = {
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
  const detailed = DETAIL_KEYS.filter((key) => Object.hasOwn(r, key)).length;
  if (detailed !== 0 && detailed !== DETAIL_KEYS.length) return false;
  const v3 = r['assetVersion'] === 3;
  const v2 = r['assetVersion'] === 2 || v3;
  const worn = PART_KEY_ENTRIES.filter(([, key]) => Object.hasOwn(r, key));
  if (v3 ? worn.length === 0 : worn.length !== 0) return false;
  for (const [slot, key] of worn) {
    const part = r[key];
    if (!isPixelCustomPart(part) || part.slot !== slot) return false;
  }
  const pieces = AVATAR_PIECE_COLORS.filter((key) => Object.hasOwn(r, key));
  const extras = (Object.keys(AVATAR_EXTRA_PARTS) as AvatarExtraPart[]).filter((key) =>
    Object.hasOwn(r, key),
  );
  const v2Keys = v2 ? 2 + pieces.length + extras.length + worn.length : 0;
  if (Object.keys(r).length !== Object.keys(DEFAULT_RECIPE).length + detailed + v2Keys)
    return false;
  if (
    v2 &&
    (detailed === 0 ||
      !(AVATAR_SPECIES as readonly unknown[]).includes(r['species']) ||
      !(AVATAR_HAIR_PARTS.sideHair as readonly unknown[]).includes(r['rightSideHair']) ||
      !pieces.every((key) => typeof r[key] === 'string' && /^#[\da-f]{6}$/iu.test(r[key])) ||
      !extras.every((key) => (AVATAR_EXTRA_PARTS[key] as readonly unknown[]).includes(r[key])))
  )
    return false;
  const catalog: { [P in AvatarPart]: readonly string[] } = v2 ? AVATAR_PARTS_V2 : AVATAR_PARTS;
  return (
    (detailed === 0 ||
      ((Object.keys(AVATAR_HAIR_PARTS) as AvatarHairPart[]).every(
        (key) =>
          typeof r[key] === 'string' &&
          (AVATAR_HAIR_PARTS[key] as readonly string[]).includes(r[key]),
      ) &&
        (Object.keys(AVATAR_RANGES) as AvatarRange[]).every((key) => {
          const v = r[key];
          const [min, max] = AVATAR_RANGES[key];
          return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
        }))) &&
    r['schemaVersion'] === 1 &&
    r['family'] === 'illustrated' &&
    (r['assetVersion'] === 1 || v2) &&
    r['rigVersion'] === 1 &&
    PART_KEYS.every((key) => typeof r[key] === 'string' && catalog[key].includes(r[key])) &&
    AVATAR_COLORS.every((key) => typeof r[key] === 'string' && /^#[\da-f]{6}$/iu.test(r[key]))
  );
}

export function canonicalRecipe(recipe: PixelAvatarRecipe): PixelAvatarRecipe {
  const canonical: Record<string, unknown> = {
    schemaVersion: 1,
    family: 'illustrated',
    assetVersion: recipe.assetVersion,
    rigVersion: 1,
  };
  for (const key of PART_KEYS) canonical[key] = recipe[key];
  for (const key of AVATAR_COLORS) canonical[key] = recipe[key].toLowerCase();
  if (recipe.bangs !== undefined) for (const key of DETAIL_KEYS) canonical[key] = recipe[key];
  if (recipe.assetVersion !== 1) {
    canonical['species'] = recipe.species;
    canonical['rightSideHair'] = recipe.rightSideHair;
    for (const key of AVATAR_PIECE_COLORS)
      if (recipe[key] !== undefined) canonical[key] = recipe[key].toLowerCase();
    for (const key of Object.keys(AVATAR_EXTRA_PARTS) as AvatarExtraPart[])
      if (recipe[key] !== undefined) canonical[key] = recipe[key];
    if (recipe.assetVersion === 3)
      for (const [, key] of PART_KEY_ENTRIES) {
        const part = recipe[key];
        if (part !== undefined) canonical[key] = canonicalCustomPart(part);
      }
  }
  return canonical as PixelAvatarRecipe;
}

const HAIR_PIECES = ['bangs', 'sideHair', 'rightSideHair', 'backHair'] as const;

/**
 * Saved choices the recipe keeps but does not draw: a flower shows petals and a stem instead of
 * hair, outfit, beard and headwear, and a helmet or hood covers the hair. The choices return when
 * the species or headwear changes back.
 */
export function hiddenChoices(recipe: PixelAvatarRecipe): readonly string[] {
  if (recipe.species === 'flower')
    return [
      ...HAIR_PIECES,
      'outfit',
      'accessory',
      'eyes',
      'brows',
      'nose',
      'cheeks',
      'glasses',
      ...(recipe.beard || wornPart(recipe, 'beard') ? ['beard'] : []),
    ];
  const hidden: string[] = [];
  if (
    (recipe.accessory === 'helmet' || recipe.accessory === 'hood') &&
    !wornPart(recipe, 'accessory')
  )
    hidden.push(...HAIR_PIECES);
  if (recipe.species === 'dwarf') hidden.push('nose');
  return hidden;
}

/**
 * Returns the recipe as asset version 2 with the given species, keeping every other choice.
 * Side hair splits into left (`sideHair`) and right (`rightSideHair`) pieces that start equal.
 * When the skin color is one of the previous species' suggested colors, it moves to the new
 * species' first suggestion; a custom color is kept.
 */
export function withSpecies(
  recipe: PixelAvatarRecipeV3,
  species: AvatarSpecies,
): PixelAvatarRecipeV3;
export function withSpecies(
  recipe: PixelAvatarRecipeV1 | PixelAvatarRecipeV2,
  species: AvatarSpecies,
): PixelAvatarRecipeV2;
export function withSpecies(
  recipe: PixelAvatarRecipe,
  species: AvatarSpecies,
): PixelAvatarRecipeV2 | PixelAvatarRecipeV3;
export function withSpecies(
  recipe: PixelAvatarRecipe,
  species: AvatarSpecies,
): PixelAvatarRecipeV2 | PixelAvatarRecipeV3 {
  const detailed = detailedRecipe(recipe);
  const previous = recipe.species ?? 'human';
  const suggested = AVATAR_SPECIES_SWATCHES[previous].includes(recipe.skinColor.toLowerCase());
  return {
    ...detailed,
    assetVersion: recipe.assetVersion === 3 ? 3 : 2,
    species,
    rightSideHair: detailed.rightSideHair ?? detailed.sideHair!,
    skinColor:
      suggested && previous !== species ? AVATAR_SPECIES_SWATCHES[species][0]! : recipe.skinColor,
  } as PixelAvatarRecipeV2 | PixelAvatarRecipeV3;
}

/**
 * Returns the recipe wearing `part` in `slot`, or with that slot's part taken off. The recipe
 * embeds its own copy; it is asset version 3 while it wears any part and version 2 otherwise.
 */
export function withCustomPart(
  recipe: PixelAvatarRecipe,
  slot: PartSlot,
  part: PixelCustomPart | undefined,
): PixelAvatarRecipeV2 | PixelAvatarRecipeV3 {
  const base: Record<string, unknown> = {
    ...(recipe.assetVersion === 1 ? withSpecies(recipe, 'human') : recipe),
  };
  const key = CUSTOM_PART_KEYS[slot];
  delete base[key];
  if (part !== undefined) base[key] = canonicalCustomPart({ ...part, slot });
  const wearing = PART_KEY_ENTRIES.some(([, k]) => base[k] !== undefined);
  return { ...base, assetVersion: wearing ? 3 : 2 } as PixelAvatarRecipeV2 | PixelAvatarRecipeV3;
}

/** `withCustomPart` for the headpiece slot. */
export function withHeadpiece(
  recipe: PixelAvatarRecipe,
  part: PixelCustomPart | undefined,
): PixelAvatarRecipeV2 | PixelAvatarRecipeV3 {
  return withCustomPart(recipe, 'headpiece', part);
}

/** The Custom Part worn in a slot, if any. */
export function wornPart(recipe: PixelAvatarRecipe, slot: PartSlot): PixelCustomPart | undefined {
  return recipe.assetVersion === 3 ? recipe[CUSTOM_PART_KEYS[slot]] : undefined;
}

export function detailedRecipe(recipe: PixelAvatarRecipe): PixelAvatarRecipe {
  if (recipe.bangs !== undefined) return recipe;
  const pick = <P extends AvatarHairPart>(part: P) =>
    (AVATAR_HAIR_PARTS[part] as readonly string[]).includes(recipe.hair)
      ? (recipe.hair as (typeof AVATAR_HAIR_PARTS)[P][number])
      : HAIR_SPLIT[recipe.hair][part];
  return {
    ...recipe,
    bangs: pick('bangs'),
    sideHair: pick('sideHair'),
    backHair: pick('backHair'),
    spacing: 0,
    height: 0,
    hairLength: 0,
  };
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

/**
 * A version 2 name-seeded recipe factory over every species. Species are equally likely; a
 * person may get a beard or a version 2 outfit, and a flower gets petals and a base. Version 1
 * factories (`createSeededRecipe`) keep their faces, so a consumer chooses per identity which
 * seed version it was created with.
 */
export function createSeededRecipeV2(namespace: string): (seed: string) => PixelAvatarRecipeV2 {
  const base = createSeededRecipe(`${namespace}:base`);
  return (seed) => {
    const random = seededRandom(`${namespace}:${seed.trim().toLowerCase()}`);
    const pick = <T>(values: readonly T[]) => values[Math.floor(random() * values.length)]!;
    const species = pick(AVATAR_SPECIES);
    const recipe: PixelAvatarRecipeV2 = {
      ...withSpecies(base(seed) as PixelAvatarRecipeV1, species),
      skinColor: pick(AVATAR_SPECIES_SWATCHES[species]),
    };
    if (species === 'flower')
      return {
        ...recipe,
        petals: pick(AVATAR_EXTRA_PARTS.petals),
        flowerBase: pick(AVATAR_EXTRA_PARTS.flowerBase),
      };
    const beard = random() < 0.3 ? pick(AVATAR_EXTRA_PARTS.beard) : undefined;
    const outfit = random() < 0.25 ? pick(AVATAR_PARTS_V2.outfit.slice(-4)) : recipe.outfit;
    return { ...recipe, outfit, ...(beard ? { beard } : {}) };
  };
}

/** Version 2 counterpart of `seededRecipe` (BotHarness's namespace). */
export const seededRecipeV2: (seed: string) => PixelAvatarRecipeV2 =
  createSeededRecipeV2('botharness-avatar-v2');

/** The same name always gives the same face (BotHarness's namespace). */
export const seededRecipe: (seed: string) => PixelAvatarRecipe =
  createSeededRecipe('botharness-avatar');

/** Suggested body colors per species; any color remains allowed. */
export const AVATAR_SPECIES_SWATCHES: Record<AvatarSpecies, readonly string[]> = {
  human: AVATAR_SWATCHES.skinColor,
  goblin: ['#9cc464', '#7fae4f', '#6a9a45', '#b3cf7a', '#5c8a4a', '#8fa86a'],
  elf: ['#fbe7d6', '#f2d3c0', '#e2c9b0', '#d9c7e8', '#b9c6dd', '#8f7fa8'],
  dwarf: ['#f2c4a0', '#e9b08a', '#e0a87e', '#c68863', '#f0b8a0', '#9a6142'],
  orc: ['#8a9a5b', '#6f8a4e', '#7d8c6a', '#5f6f4a', '#9aa070', '#6a7a7a'],
  flower: ['#f6d36b', '#f2b84b', '#ffe3cf', '#e8a85a', '#c98b4a', '#f4f1ec'],
};

const preset = (parts: Partial<PixelAvatarRecipeV1>): PixelAvatarRecipeV1 => ({
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
