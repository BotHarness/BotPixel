import { describe, expect, it } from 'vitest';
import {
  AVATAR_EXTRA_PARTS,
  AVATAR_PARTS_V2,
  AVATAR_TURNS,
  DEFAULT_RECIPE,
  REPLACE_PART_SLOTS,
  isPixelAvatarRecipe,
  isPixelCustomPart,
  pixelAvatarSvg,
  pixelFigure,
  replacePartStart,
  withCustomPart,
  withSpecies,
  type PartCell,
  type PixelAvatarRecipe,
  type ReplacePartSlot,
} from '../src/index.js';

const human = withSpecies(DEFAULT_RECIPE, 'human');
const dwarf = withSpecies(DEFAULT_RECIPE, 'dwarf');
const flower = withSpecies(DEFAULT_RECIPE, 'flower');
const wear = (recipe: PixelAvatarRecipe, slot: ReplacePartSlot) =>
  withCustomPart(recipe, slot, replacePartStart(recipe, slot));
const svg = (recipe: PixelAvatarRecipe) => pixelAvatarSvg(recipe);
const mouths = (recipe: PixelAvatarRecipe) => pixelFigure(recipe, 0, { mouthLayers: true }).head;

const variants: [ReplacePartSlot, PixelAvatarRecipe[]][] = [
  ['outfit', AVATAR_PARTS_V2.outfit.map((outfit) => ({ ...dwarf, outfit }))],
  [
    'accessory',
    AVATAR_PARTS_V2.accessory
      .filter((accessory) => accessory !== 'none' && accessory !== 'helmet' && accessory !== 'hood')
      .map((accessory) => ({ ...human, accessory })),
  ],
  ['beard', AVATAR_EXTRA_PARTS.beard.map((beard) => ({ ...dwarf, beard }))],
  [
    'glasses',
    AVATAR_PARTS_V2.glasses.filter((g) => g !== 'none').map((glasses) => ({ ...human, glasses })),
  ],
  ['nose', AVATAR_PARTS_V2.nose.filter((n) => n !== 'none').map((nose) => ({ ...human, nose }))],
  [
    'cheeks',
    AVATAR_PARTS_V2.cheeks.filter((c) => c !== 'none').map((cheeks) => ({ ...human, cheeks })),
  ],
  ['petals', AVATAR_EXTRA_PARTS.petals.map((petals) => ({ ...flower, petals }))],
  ['flowerBase', AVATAR_EXTRA_PARTS.flowerBase.map((flowerBase) => ({ ...flower, flowerBase }))],
];

describe('drawn replacement parts', () => {
  it('flattens every built-in part and renders an unchanged copy identically', () => {
    for (const [slot, recipes] of variants)
      for (const recipe of recipes) {
        const start = replacePartStart(recipe, slot);
        const label = `${slot} ${JSON.stringify(recipe[slot as keyof PixelAvatarRecipe])}`;
        expect(start.front.length, label).toBeGreaterThan(0);
        expect(isPixelCustomPart(start), label).toBe(true);
        const worn = wear(recipe, slot);
        expect(isPixelAvatarRecipe(worn), label).toBe(true);
        expect(svg(worn), label).toBe(svg(recipe));
        expect(mouths(worn), label).toBe(mouths(recipe));
      }
  });

  it('keeps flattened cells on appearance colors so they recolor', () => {
    const recipe = { ...dwarf, outfit: 'tee' as const };
    const start = replacePartStart(recipe, 'outfit');
    expect(start.front.some(([, , color]) => color === 'shirtColor')).toBe(true);
    const worn = wear(recipe, 'outfit');
    expect(svg({ ...worn, shirtColor: '#3d9970' })).not.toBe(svg(worn));
  });

  it('never covers the speaking mouth with a drawn face part', () => {
    const mouthCells: PartCell[] = [];
    for (let x = 10; x <= 21; x++)
      for (let y = 19; y <= 23; y++) mouthCells.push([x, y, '#1d1b22', 0]);
    for (const slot of ['beard', 'nose', 'cheeks', 'glasses'] as const) {
      const worn = withCustomPart(human, slot, { slot, front: mouthCells, back: [] });
      for (const state of ['closed', 'half-open', 'open']) {
        const layer = mouths(worn).split(`data-avatar-mouth="${state}"`)[1]!.split('</g>')[0]!;
        expect(layer, `${slot} ${state}`).toContain('#7a2a38');
      }
      const cells = pixelFigure(worn, 0).cells;
      expect(cells.find((c) => c.x === 15 && c.y === 21)?.c, slot).not.toBe('#1d1b22');
    }
  });

  it('hides drawn parts where the species or headwear hides the built-in part', () => {
    const blob: PartCell[] = [[16, 26, '#1d1b22', 0]];
    const onFlower = withCustomPart(flower, 'outfit', { slot: 'outfit', front: blob, back: [] });
    expect(svg(onFlower)).toBe(svg(flower));
    const nose: PartCell[] = [[15, 18, '#1d1b22', 0]];
    const dwarfNose = withCustomPart(dwarf, 'nose', { slot: 'nose', front: nose, back: [] });
    expect(svg(dwarfNose)).toBe(svg(dwarf));
    const petals = withCustomPart(human, 'petals', { slot: 'petals', front: blob, back: [] });
    expect(svg(petals)).toBe(svg(human));
  });

  it('shows the hair once a helmet is replaced by a drawn accessory', () => {
    const helmet = { ...dwarf, accessory: 'helmet' as const, backHair: 'long' as const };
    const worn = wear(helmet, 'accessory');
    expect(svg(worn)).not.toBe(svg(helmet));
    expect(svg(withCustomPart(worn, 'accessory', undefined))).toBe(svg(helmet));
  });

  it('turns drawn parts with the head', () => {
    for (const slot of REPLACE_PART_SLOTS) {
      const recipe =
        slot === 'petals' || slot === 'flowerBase'
          ? flower
          : { ...dwarf, beard: 'full' as const, glasses: 'round' as const };
      const worn = wear(recipe, slot);
      for (const turn of AVATAR_TURNS)
        expect(pixelFigure(worn, turn).cells.length).toBeGreaterThan(0);
    }
  });
});
