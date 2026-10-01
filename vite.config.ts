import { defineConfig } from 'vitest/config';
import { engineVitePlugin } from './tools/vite/engineVitePlugin.ts';

export default defineConfig({
  plugins: [engineVitePlugin(import.meta.dirname)],
  server: { port: 5173 },
  build: { target: 'es2023', chunkSizeWarningLimit: 4000 },
  test: {
    include: ['engine/**/*.test.ts', 'games/**/*.test.ts', 'tools/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
