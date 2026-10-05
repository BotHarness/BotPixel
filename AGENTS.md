# AGENTS.md — BotPixel

Two packages: `packages/morph` (`@botharness/pixel-morph`, generic pixel morph) and `packages/avatar` (`@botharness/pixel-avatar`, the avatar generator and symbols). Both are pure TypeScript with no third-party runtime dependencies; `pixel-avatar` depends only on `pixel-morph` (for `PixelCell` and attribute escaping).

## Commands

```bash
pnpm install
pnpm verify   # format:check, lint, typecheck, test
pnpm build
```

## Rules

- Output compatibility is the contract. `packages/avatar/test/fixtures/botharness-golden.json` holds hashes of BotHarness's output for every option, preset, seed, symbol and morph. Do not regenerate it to make a change pass; a visual change to existing options needs a new `rigVersion`/`assetVersion`.
- Keep `pixel-morph` free of avatar concepts.
- Tool-to-symbol mapping belongs to the host app, not to this repo.

## Release

```bash
bash scripts/npm-token.sh   # store the npm publish token (gitignored, mode 600)
pnpm release                # build + verify, then print what it would publish
pnpm release -- --yes       # publish pixel-morph, then pixel-avatar
```

Same flow as BotUI: a granular npm token with _Read and write_ + _Bypass 2FA_, scoped to `@botharness` (a token limited to package names cannot create new packages). To reuse BotUI's saved token, point at it: `NPM_TOKEN_FILE=../BotUI/npm_release.token pnpm release -- --yes`.

In CI, the `release` workflow (manual, Actions → release → Run workflow) does the same with the `NPM_TOKEN` repo secret.
