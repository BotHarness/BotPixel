# @botharness/pixel-banner

Seeded pixel-art nature banners in ten scenes, for profile headers. Each banner is drawn at 150×50 and scaled by a whole number to exactly 1500×500 (3:1), so every pixel stays a crisp square.

<p align="center"><img src="https://raw.githubusercontent.com/BotHarness/BotPixel/main/assets/banner-scenes-light.png" alt="All ten banner scenes on a light page" width="100%"></p>

```ts
import { pixelBannerImage, seededBannerRecipe } from '@botharness/pixel-banner';

const recipe = seededBannerRecipe('DeepSeekBot'); // { scene: 'sea', seed: 2786543041 }, same name, same banner
const { width, height, data } = pixelBannerImage(recipe); // 1500×500 RGBA

const canvas = document.createElement('canvas');
canvas.width = width;
canvas.height = height;
canvas.getContext('2d')!.putImageData(new ImageData(data, width, height), 0, 0);
canvas.toBlob((png) => upload(png!), 'image/png');
```

- `BANNER_SCENES`: `spring`, `summer`, `autumn`, `winter`, `sea`, `mountain`, `desert`, `forest`, `night-sky`, `space`.
- A recipe is plain JSON: `{ scene, seed }`, where `seed` is a 32-bit unsigned integer. `isPixelBannerRecipe` validates a saved one.
- `seededBannerRecipe(name)`: the same name always gives the same recipe.
- `pixelBannerPixels(recipe)`: the 150×50 source pixels. Draw it on a 150×50 canvas and scale it with CSS `image-rendering: pixelated` if you do not need the full-size file.
- `pixelBannerImage(recipe, { scale })`: the pixels repeated `scale` times (default `BANNER_SCALE`, 10), with no smoothing. `scalePixels(image, scale)` does the same for any image.

Output is RGBA, row-major, 4 bytes per pixel, fully opaque. It uses only integer and basic float arithmetic, so the same recipe gives the same bytes in every JavaScript engine. `test/fixtures/banner-golden.json` locks the output of every scene; a change that alters existing banners needs a new scene name, not a new fixture.
