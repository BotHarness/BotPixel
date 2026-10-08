# @botharness/pixel-avatar

Seeded, editable 32×32 chibi pixel avatars with state symbols they can morph into.

```ts
import {
  pixelAvatarSvg,
  seededRecipe,
  faceCells,
  pixelSymbolCells,
} from '@botharness/pixel-avatar';

const recipe = seededRecipe('DeepSeekBot');
const svg = pixelAvatarSvg(recipe); // 32×32 viewBox, crisp edges, no ids or scripts
```

- `seededRecipe(name)`: the same name always gives the same face. `createSeededRecipe(namespace)` makes a factory with its own set of faces.
- `AVATAR_PARTS`, `AVATAR_SWATCHES`, `AVATAR_PRESETS`, `DEFAULT_RECIPE`: everything an editor needs.
- `isPixelAvatarRecipe`, `canonicalRecipe`: validate and normalise saved recipes.
- `AVATAR_HAIR_PARTS`, `AVATAR_RANGES`, `detailedRecipe(recipe)`: optional finer controls. A recipe may carry `bangs`, `sideHair`, `backHair`, `spacing`, `height` and `hairLength`, all six or none; `detailedRecipe` derives them from the plain `hair` so an editor can start from what is on screen. Recipes without them render exactly as before.
- `AVATAR_SPECIES`, `AVATAR_SPECIES_SWATCHES`, `AVATAR_PIECE_COLORS`, `withSpecies(recipe, species)`: Avatar Species (`human`, `goblin`) on the same rig, as asset version 2. `withSpecies` keeps every choice, splits side hair into `sideHair` (left) and `rightSideHair`, and accepts optional `leftSideHairColor`/`rightSideHairColor`, where left and right are as seen on screen. Consumers built before version 2 reject these recipes with `isPixelAvatarRecipe` and can show a saved snapshot instead.
- `faceCells`, `pixelSymbolCells`, `symbolArtCells`: pixels for [`@botharness/pixel-morph`](../morph).
- `pixelAvatarSvg(recipe, { turns, classPrefix })`: optional pre-rendered head turns, and rig layer classes (`<prefix>-body`, `-head`, `-face`, `-gaze`, `-blink`) for CSS animation.
