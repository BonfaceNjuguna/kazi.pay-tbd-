import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    // Backend uses Vitest (not Jest) for consistency with the frontend.
    // We update docs/milestones/phase-1-foundation.md §1.6 to reflect this
    // choice — one test runner across the monorepo means one mental model.
  },
});
