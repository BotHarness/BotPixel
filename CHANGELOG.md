# Changelog

## Unreleased

- `@botharness/pixel-morph`: `morphPixels` takes `frameMs` to advance in fixed steps and only draw when the step changes, and `markup` to choose the renderer; the new `pixelPathMarkup` draws one `<path>` per colour. Defaults and `pixelMarkup` output are unchanged. In BotHarness this cut 32 simultaneous pixel morphs from about 1 s to about 0.2 s of main-thread work per second.

## 0.1.0

- `@botharness/pixel-morph`: pixel pairing, frames, SVG markup and a `requestAnimationFrame` player, extracted from BotHarness; grid size is now an option.
- `@botharness/pixel-avatar`: the 32×32 pixel avatar generator, recipes, presets, name seeding and 16 state symbols, extracted from BotHarness with identical output, including split bangs, side and back hair with bounded eye spacing, feature height and hair length.
