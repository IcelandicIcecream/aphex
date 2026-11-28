/**
 * Deleting a document that others still reference is refused unless forced,
 * on every path: the Local API throws `ReferencedDocumentError`, HTTP answers
 * 409 with the referencing documents and takes `?force=true`.
 *
 * Run: pnpm test document-delete-guard
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	createLocalAPI,
	createAphexApi,
	mountAphexBuiltins,
	ReferencedDocumentError
} from '@aphexcms/cms-core/server';
import type { CMSInstances } from '@aphexcms/cms-core/server';
import type { Hono } from 'hono';
import { db } from './helpers/db';
import cmsConfig from './fixtures/config';
import { TEST_ORG_ID } from './helpers/test-constants';

let localAPI: ReturnType<typeof createLocalAPI>;
let cmsInstances: CMSInstances;
let apiApp: Hono<any>;

const ctx = { organizationId: TEST_ORG_ID, overrideAccess: true };
const created: Array<{ type: 'team' | 'league'; id: string }> = [];

const mockAuth = {
	type: 'session' as const,
	organizationId: TEST_ORG_ID,
	user: { id: 'test-user', email: 'test@example.com', name: 'Test', role: 'admin' as const }
};

beforeAll(async () => {
	localAPI = createLocalAPI(cmsConfig, db);
	cmsInstances = { config: cmsConfig, databaseAdapter: db, localAPI } as CMSInstances;
	apiApp = createAphexApi();
	mountAphexBuiltins(apiApp);
}, 30000);

afterAll(async () => {
	for (const { type, id } of [...created].reverse()) {
		try {
			await localAPI.collections[type].delete(ctx, id, { force: true });
		} catch {}
	}
});

async function createTeam(name: string) {
	const r = await localAPI.collections.team.create(ctx, { name, city: 'Test City' });
	created.push({ type: 'team', id: r.document.id });
	return r.document.id;
}

async function createLeague(name: string, teamIds: string[]) {
	const r = await localAPI.collections.league.create(ctx, {
		name,
		teams: teamIds.map((id, i) => ({ _type: 'reference', _ref: id, _key: `t${i}` }))
	});
	created.push({ type: 'league', id: r.document.id });
	return r.document.id;
}

function del(id: string, query = '') {
	return apiApp.fetch(
		new Request(new URL(`/api/documents/${id}${query}`, 'http://localhost'), { method: 'DELETE' }),
		{ aphexCMS: cmsInstances, auth: mockAuth }
	);
}

describe('Deleting a referenced document', () => {
	it('is refused by the Local API, naming what references it', async () => {
		const teamId = await createTeam('Guarded');
		const leagueId = await createLeague('Holds a draft reference', [teamId]);

		const error = await localAPI.collections.team.delete(ctx, teamId).catch((e) => e);
		expect(error).toBeInstanceOf(ReferencedDocumentError);
		expect(error.referencedBy.map((r: { id: string }) => r.id)).toEqual([leagueId]);
		expect(await localAPI.collections.team.findByID(ctx, teamId)).toBeTruthy();
	});

	it('goes ahead with force', async () => {
		const teamId = await createTeam('Forced');
		await createLeague('Points at the forced team', [teamId]);

		expect(await localAPI.collections.team.delete(ctx, teamId, { force: true })).toBe(true);
		expect(await localAPI.collections.team.findByID(ctx, teamId)).toBeNull();
	});

	it('is allowed once nothing references it any more', async () => {
		const teamId = await createTeam('Released');
		const leagueId = await createLeague('Lets go of its team', [teamId]);
		await localAPI.collections.league.update(ctx, leagueId, { name: 'Lets go', teams: [] });

		expect(await localAPI.collections.team.delete(ctx, teamId)).toBe(true);
	});

	it('answers 409 over HTTP with the referencing documents, and deletes with ?force=true', async () => {
		const teamId = await createTeam('Over HTTP');
		const leagueId = await createLeague('References it over HTTP', [teamId]);

		const refused = await del(teamId);
		expect(refused.status).toBe(409);
		const body = await refused.json();
		expect(body.success).toBe(false);
		expect(body.referencedBy).toEqual([expect.objectContaining({ id: leagueId, type: 'league' })]);

		const forced = await del(teamId, '?force=true');
		expect(forced.status).toBe(200);
	});

	it('leaves an unreferenced document as easy to delete as before', async () => {
		const teamId = await createTeam('Unreferenced');
		expect(await localAPI.collections.team.delete(ctx, teamId)).toBe(true);
	});
});
