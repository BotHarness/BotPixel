# AGENTS.md — BotPixel

Three packages: `packages/morph` (`@botharness/pixel-morph`, generic pixel morph), `packages/avatar` (`@botharness/pixel-avatar`, the avatar generator and symbols) and `packages/banner` (`@botharness/pixel-banner`, seeded 3:1 nature banners). All are pure TypeScript with no third-party runtime dependencies; `pixel-avatar` depends only on `pixel-morph` (for `PixelCell` and attribute escaping), and `pixel-banner` depends on nothing.

## Commands

```bash
pnpm install
pnpm verify   # format:check, lint, typecheck, test
pnpm build
```

## Rules

- Output compatibility is the contract. `packages/avatar/test/fixtures/botharness-golden.json` holds hashes of BotHarness's output for every option, preset, seed, symbol and morph. Do not regenerate it to make a change pass; a visual change to existing options needs a new `rigVersion`/`assetVersion`. `packages/banner/test/fixtures/banner-golden.json` does the same for banners: a saved `{ scene, seed }` must keep its pixels, so a visual change needs a new scene name.
- Keep `pixel-morph` free of avatar concepts.
- Tool-to-symbol mapping belongs to the host app, not to this repo.

## Release

```bash
bash scripts/npm-token.sh   # store the npm publish token (gitignored, mode 600)
pnpm release                # build + verify, then print what it would publish
pnpm release -- --yes       # publish pixel-morph, pixel-avatar, then pixel-banner
```

Same flow as BotUI: a granular npm token with _Read and write_ + _Bypass 2FA_, scoped to `@botharness` (a token limited to package names cannot create new packages). To reuse BotUI's saved token, point at it: `NPM_TOKEN_FILE=../BotUI/npm_release.token pnpm release -- --yes`.

In CI, the `release` workflow (manual, Actions → release → Run workflow) does the same with the `NPM_TOKEN` repo secret.
