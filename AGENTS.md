# AGENTS.md — BotPixel

Two packages: `packages/morph` (`@botharness/pixel-morph`, generic pixel morph) and `packages/avatar` (`@botharness/pixel-avatar`, the avatar generator and symbols). Both are pure TypeScript with no runtime dependencies; `pixel-avatar` uses `pixel-morph` only for its `PixelCell` type.

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
