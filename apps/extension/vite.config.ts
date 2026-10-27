import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Vite build configuration for the TraceGuard Chrome MV3 Extension.
 *
 * Produces:
 *   dist/popup.html          ← popup entry
 *   dist/fullview.html       ← full analysis page
 *   dist/options.html        ← options/onboarding page
 *   dist/background.js       ← service worker (iife, no dynamic imports)
 *   dist/content.js          ← content script (iife)
 *   dist/manifest.json       ← copied from public/
 *   dist/icons/              ← copied from public/icons/
 */
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@traceguard/shared-types': resolve(
        __dirname,
        '../../packages/shared-types/src/index.ts',
      ),
      '@traceguard/analyzer': resolve(
        __dirname,
        '../../packages/analyzer/src/index.ts',
      ),
      '@traceguard/tracker-classifier': resolve(
        __dirname,
        '../../packages/tracker-classifier/src/index.ts',
      ),
      '@traceguard/scoring-engine': resolve(
        __dirname,
        '../../packages/scoring-engine/src/index.ts',
      ),
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Chrome MV3 requires ES2022 — avoid code splitting for SW and content
    target: 'es2022',

    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        fullview: resolve(__dirname, 'fullview.html'),
        options: resolve(__dirname, 'options.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        // Popup / fullview / options → hashed assets in assets/
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') return 'background.js';
          if (chunk.name === 'content') return 'content.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
