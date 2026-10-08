import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@botharness/pixel-morph': fileURLToPath(
        new URL('./packages/morph/src/index.ts', import.meta.url),
      ),
      '@botharness/pixel-avatar': fileURLToPath(
        new URL('./packages/avatar/src/index.ts', import.meta.url),
      ),
      '@botharness/pixel-banner': fileURLToPath(
        new URL('./packages/banner/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    environment: 'node',
  },
});
