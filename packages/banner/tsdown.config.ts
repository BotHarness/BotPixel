import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  // the package is type: module, so the ESM output is plain .js
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
});
