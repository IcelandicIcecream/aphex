/**
 * Reference resolution is an access-control boundary, and GraphQL is where it was
 * missing.
 *
 * The reference resolvers used to fetch their target with
 * `databaseAdapter.findByDocIdAdvanced` — the one way into the document graph
 * that runs neither `permissions.canRead` nor the field-level read projection.
 * A caller only needed a readable document that *points at* a restricted one to
 * read the restricted one in full. The fixture models exactly that: a freely
 * readable `referenceToRestricted` holding references to `edm`, whose schema
 * limits read to admin/owner.
 *
 * Scalar and array references are separate resolvers in the implementation, so
 * both arities are asserted here — the first fix covered only one of them.
 *
 * Run: pnpm -F @aphexcms/studio test graphql-reference-access
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createLocalAPI } from '@aphexcms/cms-core/server';
import { db } from '$lib/server/db';
import cmsConfig from './fixtures/config';
import { createYoga, createSchema } from 'graphql-yoga';
import { generateGraphQLSchema } from '@aphexcms/cms-core/graphql/schema';
import { createResolvers } from '@aphexcms/cms-core/graphql/resolvers';
import type { CMSInstances } from '@aphexcms/cms-core/server';
import { TEST_ORG_ID } from './helpers/test-constants';

const ctx = { organizationId: TEST_ORG_ID, overrideAccess: true };

let localAPI: ReturnType<typeof createLocalAPI>;
let cmsInstances: CMSInstances;
let yoga: ReturnType<typeof createYoga>;

const created: Array<{ collection: 'edm' | 'referenceToRestricted'; id: string }> = [];

// Access is evaluated against `organizationRole` and `capabilities`, not
// `user.role` — the latter is only carried for display. `editor` is the role
// that makes this test meaningful: it can read the parent collection (which
// declares no `access` block) and cannot read `edm` (admin/owner only), which
// is precisely the gap a reference traversal used to bridge.
const editorAuth = {
	type: 'session' as const,
	organizationId: TEST_ORG_ID,
	organizationRole: 'editor',
	capabilities: ['document.read'],
	user: {
		id: 'editor-user-id',
		email: 'editor@example.com',
		name: 'Editor',
		role: 'editor'
	}
};

const adminAuth = {
	type: 'session' as const,
	organizationId: TEST_ORG_ID,
	organizationRole: 'owner',
	capabilities: ['document.read'],
	user: {
		id: 'admin-user-id',
		email: 'admin@example.com',
		name: 'Admin',
		role: 'admin'
	}
};

// The GraphQL context is built once, at Yoga creation, so per-query auth is
// swapped through this rather than passed in at call time — same harness shape
// as `comprehensive-graphql-api.test.ts`.
let currentAuth: typeof editorAuth = adminAuth;

async function graphql(query: string, auth: typeof editorAuth) {
	currentAuth = auth;
	const response = await yoga.fetch('http://localhost/graphql', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ query })
	});
	return response.json();
}

beforeAll(async () => {
	localAPI = createLocalAPI(cmsConfig, db);
	cmsInstances = {
		config: cmsConfig,
		databaseAdapter: db,
		localAPI
	} as CMSInstances;

	const typeDefs = generateGraphQLSchema(cmsConfig.schemaTypes);
	const resolvers = createResolvers(cmsInstances, cmsConfig.schemaTypes, 'draft');
	yoga = createYoga({
		schema: createSchema({ typeDefs, resolvers }),
		context: async () => ({
			organizationId: TEST_ORG_ID,
			auth: currentAuth,
			localAPI
		}),
		// Surface real resolver errors instead of "Unexpected error." — an access
		// test that can't tell a denial from a crash is not a test.
		maskedErrors: false,
		logging: false
	});
}, 30000);

afterAll(async () => {
	for (const { collection, id } of created.reverse()) {
		await localAPI
			.getCollection(collection)
			?.delete(ctx, id)
			.catch(() => {});
	}
});

async function seed() {
	const { document: campaign } = await localAPI.collections.edm.create(ctx, {
		subject: 'Restricted Campaign',
		body: 'internal only'
	} as never);
	created.push({ collection: 'edm', id: campaign.id });

	const { document: parent } = await localAPI.collections.referenceToRestricted.create(ctx, {
		title: 'Public Parent',
		campaign: { _type: 'reference', _ref: campaign.id },
		campaigns: [{ _type: 'reference', _ref: campaign.id }]
	} as never);
	created.push({ collection: 'referenceToRestricted', id: parent.id });

	return { campaign, parent };
}

describe('GraphQL reference resolution honours read access', () => {
	it('does not resolve a scalar reference into a collection the caller cannot read', async () => {
		const { parent } = await seed();

		const result = await graphql(
			`{ referenceToRestricted(id: "${parent.id}") { id campaign { id subject } } }`,
			editorAuth
		);

		expect(result.errors).toBeUndefined();
		// The parent is readable; the restricted target must come back as null
		// rather than as a document with its contents.
		expect(result.data.referenceToRestricted.id).toBe(parent.id);
		expect(result.data.referenceToRestricted.campaign).toBeNull();
	});

	it('does not resolve an array of references into a collection the caller cannot read', async () => {
		const { parent } = await seed();

		const result = await graphql(
			`{ referenceToRestricted(id: "${parent.id}") { id campaigns { id subject } } }`,
			editorAuth
		);

		expect(result.errors).toBeUndefined();
		const campaigns = result.data.referenceToRestricted.campaigns;
		// The array keeps its shape — one entry in, one entry out — so a caller
		// pairing it against the raw field doesn't silently misalign.
		expect(campaigns).toHaveLength(1);
		expect(campaigns[0]).toBeNull();
	});

	it('still resolves both arities for a caller that can read the target', async () => {
		const { campaign, parent } = await seed();

		const result = await graphql(
			`{ referenceToRestricted(id: "${parent.id}") {
				campaign { id subject }
				campaigns { id subject }
			} }`,
			adminAuth
		);

		expect(result.errors).toBeUndefined();
		const doc = result.data.referenceToRestricted;
		expect(doc.campaign?.id).toBe(campaign.id);
		expect(doc.campaign?.subject).toBe('Restricted Campaign');
		expect(doc.campaigns).toHaveLength(1);
		expect(doc.campaigns[0]?.id).toBe(campaign.id);
	});
});
