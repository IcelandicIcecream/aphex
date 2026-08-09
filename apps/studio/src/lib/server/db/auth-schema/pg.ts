// The auth tables live in @aphexcms/auth, which owns their shape alongside the
// better-auth version that expects it — the two have to move together, and a
// hand-copied duplicate here is exactly how they drift apart.
//
// Re-exported rather than imported directly at each call site so drizzle-kit
// keeps resolving a local path, and so an app that wants to add a column (or
// swap in its own tables entirely) has one obvious file to edit.
export * from '@aphexcms/auth/schema/pg';
