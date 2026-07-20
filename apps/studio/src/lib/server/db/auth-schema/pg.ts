// Canonical Better Auth tables (Postgres) are owned by @aphexcms/auth so
// security-relevant column changes ship via a version bump. The app re-exports
// them here — drizzle-kit and every db-layer consumer resolve these symbols
// unchanged, and migrations stay app-owned.
export * from '@aphexcms/auth/schema/pg';
