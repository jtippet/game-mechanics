import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset URLs: the same dist/ works at /, or /mechanics/.
  base: './',
  build: { target: 'es2022' },
  test: { environment: 'node', include: ['test/**/*.test.ts'] },
});
