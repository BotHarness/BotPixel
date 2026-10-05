# @botharness/pixel-morph

Morph any pixel art into any other, snapped to the grid. No dependencies.

```ts
import {
  cellsFromRows,
  morphPixels,
  pixelFrame,
  pixelMarkup,
  planPixels,
} from '@botharness/pixel-morph';

const from = cellsFromRows(['XX', 'XX'], { X: '#2a2230' });
const to = cellsFromRows(['YYYY'], { Y: '#3fc1b8' }, 10, 10);

// browser: animate an SVG <g>
const run = morphPixels(group, from, to, 800);
await run.finished;

// anywhere: compute frames yourself
const pairs = planPixels(from, to);
const svgRects = pixelMarkup(pixelFrame(pairs, 0.5));
```

Grids default to 32×32; pass `{ size }` to `planPixels`, `pixelFrame` and `morphPixels` for others. When many morphs run at once, pass `{ frameMs: 50, markup: pixelPathMarkup }` to `morphPixels`: it steps at a pixel-art 20 fps and draws one `<path>` per colour instead of one `<rect>` per run. `run.current()` returns the pixels on screen, so a new morph can start mid-flight.
