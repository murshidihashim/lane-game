import { defineConfig } from 'vitest/config';

// Soak tests (100 bot-vs-bot matches) are slow, so they only run with SOAK=1 (npm run soak).
// The balance check (400 matches) only runs with BALANCE=1 (npm run balance).
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const soak = env.SOAK === '1';
const balance = env.BALANCE === '1';

export default defineConfig({
  base: './',
  build: { target: 'es2020', assetsInlineLimit: 0 },
  test: {
    include: balance ? ['tests/soak/balance.test.ts'] : soak ? ['tests/soak/soak.test.ts'] : ['tests/*.test.ts'],
    testTimeout: soak || balance ? 1_800_000 : 30_000,
  },
});
