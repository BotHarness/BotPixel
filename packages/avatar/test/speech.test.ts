import { describe, expect, it } from 'vitest';
import {
  AVATAR_ANIMAL_SPECIES,
  AVATAR_PARTS,
  AVATAR_PATTERNS,
  AVATAR_PRESETS,
  AVATAR_TURNS,
  DEFAULT_RECIPE,
  detailedRecipe,
  pixelAvatarSvg,
  withSpecies,
  type PixelAvatarRecipe,
} from '../src/index.js';

describe('optional speech mouth rig', () => {
  it('provides saved, closed, half-open and open feature layers at every head turn', () => {
    const svg = pixelAvatarSvg(DEFAULT_RECIPE, { turns: AVATAR_TURNS, mouthLayers: true });
    for (const state of ['saved', 'closed', 'half-open', 'open']) {
      expect(svg.match(new RegExp(`data-avatar-mouth="${state}"`, 'gu'))).toHaveLength(5);
    }
    expect(svg).toContain('data-avatar-mouth="saved" opacity="1"');
    expect(svg).toContain('data-avatar-mouth="open" opacity="0"');
    expect(pixelAvatarSvg(DEFAULT_RECIPE)).not.toContain('data-avatar-mouth');
  });

  it('restores exact saved markup across catalog faces, poses and detailed geometry', () => {
    const recipes: PixelAvatarRecipe[] = [
      ...AVATAR_PRESETS,
      ...AVATAR_PARTS.mouth.flatMap((mouth) =>
        AVATAR_PARTS.pose.flatMap((pose) => [
          { ...DEFAULT_RECIPE, mouth, pose },
          { ...detailedRecipe(DEFAULT_RECIPE), mouth, pose, height: 1, spacing: -1 },
        ]),
      ),
    ];
    for (const recipe of recipes) {
      const snapshot = JSON.stringify(recipe);
      const normal = pixelAvatarSvg(recipe, { turns: AVATAR_TURNS });
      const speaking = pixelAvatarSvg(recipe, { turns: AVATAR_TURNS, mouthLayers: true });
      const restored = speaking
        .replace(/<g data-avatar-mouth="(?:closed|half-open|open)" opacity="0">.*?<\/g>/gu, '')
        .replace(/<g data-avatar-mouth="saved" opacity="1">(.*?)<\/g>/gu, '$1');
      expect(restored).toBe(normal);
      expect(JSON.stringify(recipe)).toBe(snapshot);
    }
  });

  it('opts into a flatter full opening without changing the accepted speech layers or saved artwork', () => {
    const recipes = [
      DEFAULT_RECIPE,
      ...AVATAR_PRESETS,
      detailedRecipe(DEFAULT_RECIPE),
      ...AVATAR_ANIMAL_SPECIES.flatMap((species) =>
        AVATAR_PATTERNS.map((pattern) => ({ ...withSpecies(DEFAULT_RECIPE, species), pattern })),
      ),
    ];
    for (const recipe of recipes) {
      const options = { turns: AVATAR_TURNS, mouthLayers: true };
      const original = pixelAvatarSvg(recipe, options);
      const legacy = pixelAvatarSvg(recipe, { ...options, speechMouthVersion: 1 });
      const natural = pixelAvatarSvg(recipe, { ...options, speechMouthVersion: 2 });
      expect(legacy).toBe(original);
      expect(natural).not.toBe(original);
      const withoutOpen = (svg: string) =>
        svg.replace(/<g data-avatar-mouth="open" opacity="0">.*?<\/g>/gu, '');
      expect(withoutOpen(natural)).toBe(withoutOpen(original));
      expect(pixelAvatarSvg(recipe, { speechMouthVersion: 2 })).toBe(pixelAvatarSvg(recipe));
    }
    const svg = pixelAvatarSvg(DEFAULT_RECIPE, { mouthLayers: true, speechMouthVersion: 2 });
    const open = svg.match(/<g data-avatar-mouth="open" opacity="0">(.*?)<\/g>/u)![1]!;
    expect(open).toContain('<rect x="14" y="20" width="1" height="1" fill="#7a2a38"/>');
    expect(open).toContain('<rect x="15" y="20" width="3" height="1" fill="#b8415a"/>');
    expect(open).toContain('<rect x="15" y="21" width="3" height="1" fill="#b8415a"/>');
    expect(open).not.toContain('y="22"');
  });
});
