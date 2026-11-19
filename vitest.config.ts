import { defineConfig } from 'vitest/config';

// Test-only config (Phase 07, decision D-29): node environment for
// the pure-logic suites (derived, validate, data/*). The DOM suite
// (src/session.test.ts) opts into jsdom per file with the
// `// @vitest-environment jsdom` header comment.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
