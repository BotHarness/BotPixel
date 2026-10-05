import type { PixelCell } from '@botharness/pixel-morph';
import { pixelFigure } from './figure.js';
import { isPixelAvatarRecipe, type PixelAvatarRecipe } from './recipe.js';

const YAW = { front: 0, left: -25, right: 25 } as const;

/** Head-turn offsets (degrees) the thinking animation cycles through. */
export const AVATAR_TURNS = [-14, -7, 7, 14] as const;

export interface PixelAvatarSvgOptions {
  /** Extra yaw offsets to pre-render as hidden `[data-avatar-turn]` layers. */
  turns?: readonly number[];
  /** Class prefix for the rig layers (`-body`, `-head`, `-face`, `-gaze`, `-blink`). */
  classPrefix?: string;
}

/** Every visible pixel of the face at its pose, in paint order, for morphing. */
export function faceCells(recipe: PixelAvatarRecipe): PixelCell[] {
  return pixelFigure(recipe, YAW[recipe.pose]).cells;
}

/** A 32×32 SVG of the avatar: tile, body, head rig, optional turn layers and an empty morph layer. */
export function pixelAvatarSvg(
  recipe: PixelAvatarRecipe,
  options: PixelAvatarSvgOptions = {},
): string {
  if (!isPixelAvatarRecipe(recipe)) throw new Error('invalid Avatar recipe');
  const base = pixelFigure(recipe, YAW[recipe.pose]);
  const turns = (options.turns ?? [])
    .map((delta) => {
      const figure = pixelFigure(recipe, YAW[recipe.pose] + delta);
      const layers = `${figure.body}${figure.head}`.replaceAll(
        'class="bh-illustrated-',
        'data-turn-part="',
      );
      return `<g data-avatar-turn="${delta}" opacity="0">${layers}</g>`;
    })
    .join('');
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="512" height="512" shape-rendering="crispEdges" aria-hidden="true">',
    base.tile,
    base.body,
    base.head,
    turns,
    '<g data-avatar-pixel-morph=""></g>',
    '</svg>',
  ].join('');
  const prefix = options.classPrefix;
  return prefix === undefined || prefix === 'bh-illustrated'
    ? svg
    : svg.replaceAll('class="bh-illustrated-', `class="${prefix}-`);
}
