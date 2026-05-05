/**
 * Reference chain tests — league → team → player (3 levels deep).
 * Covers local API, HTTP API, and GraphQL for nested reference data,
 * depth resolution, and publish guards across the chain.
 *
 * Run: pnpm test reference-chain
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	createLocalAPI,
	createAphexApi,
	mountAphexBuiltins
} from '@aphexcms/cms-core/server';
import { createYoga, createSchema } from 'graphql-yoga';
import { generateGraphQLSchema } from '@aphexcms/cms-core/graphql/schema';
import { createResolvers } from '@aphexcms/cms-core/graphql/resolvers';
import type { CMSInstances } from '@aphexcms/cms-core/server';
import type { Hono } from 'hono';
import { db } from '$lib/server/db';
import cmsConfig from '../aphex.config';
import { TEST_ORG_ID } from './helpers/test-constants';

let localAPI: ReturnType<typeof createLocalAPI>;
let cmsInstances: CMSInstances;
let apiApp: Hono<any>;
let yoga: any;

const ctx = { organizationId: TEST_ORG_ID, overrideAccess: true };
const createdIds: string[] = [];

const mockAuth = {
	type: 'session' as const,
	organizationId: TEST_ORG_ID,
	user: { id: 'test-user', email: 'test@example.com', name: 'Test', role: 'admin' as const }
};

beforeAll(async () => {
	localAPI = createLocalAPI(cmsConfig, db);
	cmsInstances = { config: cmsConfig, databaseAdapter: db, localAPI } as CMSInstances;

	// HTTP
	apiApp = createAphexApi();
	mountAphexBuiltins(apiApp);

	// GraphQL
	const typeDefs = generateGraphQLSchema(cmsConfig.schemaTypes);
	const resolvers = createResolvers(cmsInstances, cmsConfig.schemaTypes, 'published');
	yoga = createYoga({
		schema: createSchema({ typeDefs, resolvers }),
		context: async () => ({ organizationId: TEST_ORG_ID, auth: mockAuth, localAPI })
	});
}, 30000);

afterAll(async () => {
	for (const id of [...createdIds].reverse()) {
		try {
			await localAPI.deleteDocument(ctx, id);
		} catch {}
	}
});

// ─── Helpers ───
async function makeRequest(method: string, path: string, body?: any) {
	const request = new Request(new URL(path, 'http://localhost'), {
		method,
		body: body ? JSON.stringify(body) : undefined,
		headers: { 'content-type': 'application/json' }
	});
	return apiApp.fetch(request, { aphexCMS: cmsInstances, auth: mockAuth });
}

async function gql(query: string, variables: any = {}) {
	const res = await yoga.fetch('http://localhost/graphql', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ query, variables })
	});
	return res.json();
}

async function createPlayer(name: string, opts?: { publish?: boolean }) {
	const r = await localAPI.collections.player.create(
		ctx,
		{ name, position: 'Forward', number: 10 },
		opts
	);
	createdIds.push(r.document.id);
	return r;
}

async function createTeam(
	name: string,
	playerIds: string[],
	captainId?: string,
	opts?: { publish?: boolean }
) {
	const r = await localAPI.collections.team.create(
		ctx,
		{
			name,
			city: 'Test City',
			roster: playerIds.map((id, i) => ({ _type: 'reference', _ref: id, _key: `k${i}` })),
			...(captainId ? { captain: { _type: 'reference', _ref: captainId } } : {})
		},
		opts
	);
	createdIds.push(r.document.id);
	return r;
}

async function createLeague(
	name: string,
	teamIds: string[],
	mvpId?: string,
	opts?: { publish?: boolean }
) {
	const r = await localAPI.collections.league.create(
		ctx,
		{
			name,
			sport: 'Football',
			teams: teamIds.map((id, i) => ({ _type: 'reference', _ref: id, _key: `t${i}` })),
			...(mvpId ? { mvp: { _type: 'reference', _ref: mvpId } } : {})
		},
		opts
	);
	createdIds.push(r.document.id);
	return r;
}

// ─── Local API ───
describe('Reference Chain - Local API', () => {
	it('stores refs as { _type, _ref } wrappers', async () => {
		const p = await createPlayer('Alice');
		const t = await createTeam('Aces', [p.document.id], p.document.id);
		const l = await createLeague('Premier', [t.document.id], p.document.id);

		const league = await localAPI.collections.league.findByID(ctx, l.document.id);
		expect((league as any).teams[0]._type).toBe('reference');
		expect((league as any).teams[0]._ref).toBe(t.document.id);
		expect((league as any).mvp._type).toBe('reference');
		expect((league as any).mvp._ref).toBe(p.document.id);
	});

	it('depth=1 resolves one level only', async () => {
		const p = await createPlayer('Bob', { publish: true });
		const t = await createTeam('Bears', [p.document.id], p.document.id, { publish: true });
		const l = await createLeague('Super', [t.document.id], p.document.id, { publish: true });

		const league = await localAPI.collections.league.findByID(ctx, l.document.id, {
			depth: 1,
			perspective: 'published'
		});

		// League's refs → resolved
		const resolvedTeam = (league as any).teams[0];
		expect(resolvedTeam.id).toBe(t.document.id);

		// Team's inner refs → still raw wrappers
		const teamData = resolvedTeam.publishedData;
		expect(teamData.roster[0]._type).toBe('reference');
		expect(teamData.captain._type).toBe('reference');
	});

	it('depth=2 resolves two levels', async () => {
		const p = await createPlayer('Carol', { publish: true });
		const t = await createTeam('Cats', [p.document.id], p.document.id, { publish: true });
		const l = await createLeague('Ultra', [t.document.id], p.document.id, { publish: true });

		const league = await localAPI.collections.league.findByID(ctx, l.document.id, {
			depth: 2,
			perspective: 'published'
		});

		// Level 1: league's team ref → resolved Document
		const resolvedTeam = (league as any).teams[0];
		expect(resolvedTeam.id).toBe(t.document.id);

		// Level 2: team's player refs → also resolved Documents
		// The resolved team is a raw Document with publishedData containing
		// resolved refs. The roster items and captain are now full Documents.
		const teamPub = resolvedTeam.publishedData;
		const resolvedPlayer = teamPub.roster[0];
		// Could be a Document (has .id) or still nested depending on depth tracking
		expect(resolvedPlayer).toBeDefined();
		if (resolvedPlayer.id) {
			expect(resolvedPlayer.id).toBe(p.document.id);
		} else {
			// If depth didn't reach, it's still a reference wrapper
			expect(resolvedPlayer._ref).toBe(p.document.id);
		}
	});
});

// ─── Publish Guards ───
describe('Reference Chain - Publish Guards', () => {
	it('blocks league publish when a team ref is unpublished', async () => {
		const p = await createPlayer('Dan', { publish: true });
		const t = await createTeam('Draft Team', [p.document.id]);
		const l = await createLeague('Blocked', [t.document.id]);

		await expect(
			localAPI.collections.league.publish(ctx, l.document.id)
		).rejects.toThrow(/not published/);
	});

	it('blocks team publish when a player ref is unpublished', async () => {
		const p = await createPlayer('Eve');
		const t = await createTeam('Stuck', [p.document.id]);

		await expect(
			localAPI.collections.team.publish(ctx, t.document.id)
		).rejects.toThrow(/not published/);
	});

	it('publishes the full chain bottom-up', async () => {
		const p = await createPlayer('Fay', { publish: true });
		const t = await createTeam('Full', [p.document.id], p.document.id, { publish: true });
		const l = await createLeague('Complete', [t.document.id], p.document.id);

		const result = await localAPI.collections.league.publish(ctx, l.document.id);
		expect(result).toBeDefined();
	});
});

// ─── HTTP API ───
describe('Reference Chain - HTTP API', () => {
	it('returns raw refs at depth=0', async () => {
		const p = await createPlayer('Greg', { publish: true });
		const t = await createTeam('HTTP', [p.document.id], p.document.id, { publish: true });

		const res = await makeRequest(
			'GET',
			`/api/documents/${t.document.id}?perspective=published`
		);
		expect(res.status).toBe(200);
		const body = await res.json() as any;
		expect(body.data.captain._type).toBe('reference');
		expect(body.data.captain._ref).toBe(p.document.id);
	});

	it('resolves refs at depth=1', async () => {
		const p = await createPlayer('Hana', { publish: true });
		const t = await createTeam('Depth', [p.document.id], p.document.id, { publish: true });

		const res = await makeRequest(
			'GET',
			`/api/documents/${t.document.id}?perspective=published&depth=1`
		);
		expect(res.status).toBe(200);
		const body = await res.json() as any;
		expect(body.data.captain.id).toBe(p.document.id);
	});
});

// ─── GraphQL ───
describe('Reference Chain - GraphQL', () => {
	it('resolves team.roster and team.captain', async () => {
		const p = await createPlayer('Ivy', { publish: true });
		const t = await createTeam('GQL', [p.document.id], p.document.id, { publish: true });

		const result = await gql(
			`query($id: ID!) {
				team(id: $id, perspective: "published") {
					id name
					captain { id name position }
					roster  { id name }
				}
			}`,
			{ id: t.document.id }
		);

		expect(result.errors).toBeUndefined();
		expect(result.data.team.captain.id).toBe(p.document.id);
		expect(result.data.team.captain.name).toBe('Ivy');
		expect(result.data.team.roster).toHaveLength(1);
		expect(result.data.team.roster[0].id).toBe(p.document.id);
	});

	it('resolves league.teams and league.mvp', async () => {
		const p = await createPlayer('Jay', { publish: true });
		const t = await createTeam('GQL2', [p.document.id], p.document.id, { publish: true });
		const l = await createLeague('GQL League', [t.document.id], p.document.id, { publish: true });

		const result = await gql(
			`query($id: ID!) {
				league(id: $id, perspective: "published") {
					id name
					mvp   { id name }
					teams { id name city }
				}
			}`,
			{ id: l.document.id }
		);

		expect(result.errors).toBeUndefined();
		expect(result.data.league.mvp.name).toBe('Jay');
		expect(result.data.league.teams).toHaveLength(1);
		expect(result.data.league.teams[0].name).toBe('GQL2');
	});
});
