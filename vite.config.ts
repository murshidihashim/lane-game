import { defineConfig } from 'vitest/config';

// Soak tests (100 bot-vs-bot matches) are slow, so they only run with SOAK=1 (npm run soak).
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const soak = env.SOAK === '1';

export default defineConfig({
  base: './',
  build: { target: 'es2020', assetsInlineLimit: 0 },
  test: {
    include: soak ? ['tests/soak/**/*.test.ts'] : ['tests/*.test.ts'],
    testTimeout: soak ? 600_000 : 30_000,
  },
});
