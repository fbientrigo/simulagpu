import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@simulagpu/contracts': resolve('./packages/contracts/src/index.ts'),
      '@simulagpu/core': resolve('./packages/core/src/index.ts'),
      '@simulagpu/visuals': resolve('./packages/visuals/src/index.ts'),
      '@simulagpu/theme/tokens.css': resolve('./packages/theme/src/tokens.css'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
