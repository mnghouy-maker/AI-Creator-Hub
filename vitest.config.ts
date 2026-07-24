/**
 * One Vitest config for the whole workspace. Runs the unit + integration suites
 * across packages and apps. Node environment; generous timeout for the DB-backed
 * ledger tests. The credit-ledger integration suite self-skips unless
 * TEST_DATABASE_URL points at a throwaway Postgres (CI provides one; see ci.yml).
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'apps/**/src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    environment: 'node',
    globals: true,
    testTimeout: 20000,
  },
});
