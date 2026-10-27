import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@traceguard/shared-types': path.resolve('./packages/shared-types/src/index.ts'),
      '@traceguard/analyzer': path.resolve('./packages/analyzer/src/index.ts'),
      '@traceguard/tracker-classifier': path.resolve('./packages/tracker-classifier/src/index.ts'),
      '@traceguard/scoring-engine': path.resolve('./packages/scoring-engine/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'packages/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/index.ts'],
    },
  },
});
