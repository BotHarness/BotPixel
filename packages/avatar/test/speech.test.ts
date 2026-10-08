import { describe, expect, it } from 'vitest';
import {
  AVATAR_PARTS,
  AVATAR_PRESETS,
  AVATAR_TURNS,
  DEFAULT_RECIPE,
  detailedRecipe,
  pixelAvatarSvg,
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
});
