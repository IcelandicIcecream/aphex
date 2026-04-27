/**
 * Shared test constants — declare once, use everywhere.
 *
 * Tests do not run concurrently per-file by default in Vitest, and each test
 * file cleans up the docs it creates, so a single test org is enough.
 * Keep this in sync with `tests/setup.ts`, which seeds the row.
 */
export const TEST_ORG_ID = '8a5c55fe-f89e-4e73-93b3-aba660e8e26b';
