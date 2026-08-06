/**
 * The CMS tables for whichever driver the suite is running against.
 *
 * `$lib/server/db/cms-schema` is Postgres-only — it re-exports the pg adapter's
 * schema, so its column defaults are pg SQL (`now()`), which libsql rejects with
 * "no such function: now". Tests that talk to Drizzle directly (rather than
 * through the Local API) therefore can't import it unconditionally; with
 * `APHEX_DATABASE=sqlite` they have to use the sqlite adapter's table defs.
 *
 * Same pattern the app already uses for `db/auth-schema` (pg.ts / sqlite.ts).
 * The two schemas are structurally identical — the conformance suite in
 * `packages/sqlite-adapter/tests/conformance.spec.ts` is what keeps them so.
 */
const driver = process.env.APHEX_DATABASE?.toLowerCase();

const schema =
	driver === 'sqlite'
		? await import('@aphexcms/sqlite-adapter/schema')
		: await import('../../src/lib/server/db/cms-schema');

export const { organizations, organizationMembers, documents, documentVersions, assets } = schema;

// `documentReferences` is the reference index; named separately because the
// pg and sqlite modules both export it but TS narrows the union better this way.
export const documentReferences = schema.documentReferences;
