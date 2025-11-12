import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  treeshake: true,
  outDir: 'dist',
  external: [
    'jiti',
    'chokidar',
    'js-yaml',
    'deep-diff',
    'lodash.merge',
    'lodash.get',
    'lodash.set',
    'eventemitter3',
    'toml',
    'ini',
  ],
  noExternal: [],
  platform: 'node',
  target: 'node14',
});