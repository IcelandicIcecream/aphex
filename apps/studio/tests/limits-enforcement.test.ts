import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SchemaType, Auth } from '@aphexcms/cms-core';
import { createLocalAPI, LimitExceededError, type LimitsProvider } from '@aphexcms/cms-core/server';
import { db } from '$lib/server/db';
import cmsConfig from './fixtures/config';
import { TEST_ORG_ID } from './helpers/test-constants';

const limitSchema: SchemaType = {
	type: 'document',
	name: 'limitProbe',
	title: 'Limit probe',
	fields: [{ name: 'title', type: 'string', title: 'Title' }]
};

/** A session caller authorized to create (capabilities are authoritative). */
const authedContext = {
	organizationId: TEST_ORG_ID,
	auth: {
		type: 'session',
		user: { id: 'user-limit-test', email: 'limit@test.dev' },
		session: { id: 's1', expiresAt: new Date(Date.now() + 3600_000) },
		organizationId: TEST_ORG_ID,
		organizationRole: 'owner',
		capabilities: ['document.create']
	} as unknown as Auth
};

/**
 * A real counting provider: caps `document.create` at `max` per org by counting
 * the rows that already exist — the thing `access`/hooks structurally can't do.
 */
function capProvider(max: number): LimitsProvider {
	return {
		async assertWithinLimit(ctx) {
			if (ctx.action !== 'document.create' || !ctx.schema) return;
			const used = await ctx.databaseAdapter.countDocsByType(ctx.organizationId, ctx.schema.name);
			if (used >= max) {
				throw new LimitExceededError(`Plan limit of ${max} reached`, {
					action: 'document.create',
					used,
					limit: max,
					upgradeUrl: '/billing'
				});
			}
		},
		async describeLimit(ctx) {
			const used = ctx.schema
				? await ctx.databaseAdapter.countDocsByType(ctx.organizationId, ctx.schema.name)
				: 0;
			return { used, limit: max };
		}
	};
}

const created: string[] = [];
afterEach(async () => {
	while (created.length) {
		const id = created.pop()!;
		await db.deleteDocById(TEST_ORG_ID, id).catch(() => {});
	}
});

describe('LimitsProvider enforcement', () => {
	it('rejects the create that would exceed the cap, allows the ones under it', async () => {
		const localAPI = createLocalAPI(
			{ ...cmsConfig, schemaTypes: [limitSchema], plugins: [], limits: capProvider(2) },
			db
		);
		const probes = localAPI.getCollection('limitProbe')!;

		for (let i = 0; i < 2; i++) {
			const r = await probes.create(authedContext, { title: `under-${i}` });
			created.push(r.document.id);
		}

		await expect(probes.create(authedContext, { title: 'over' })).rejects.toBeInstanceOf(
			LimitExceededError
		);

		// The rejected write created nothing.
		expect(await db.countDocsByType(TEST_ORG_ID, 'limitProbe')).toBe(2);
	});

	it('bypasses the limit for system writes (overrideAccess)', async () => {
		const assertWithinLimit = vi.fn(async () => {
			throw new LimitExceededError('should never be consulted', {
				action: 'document.create',
				used: 99,
				limit: 0
			});
		});
		const localAPI = createLocalAPI(
			{
				...cmsConfig,
				schemaTypes: [limitSchema],
				plugins: [],
				limits: { assertWithinLimit, describeLimit: async () => ({ used: 0, limit: null }) }
			},
			db
		);
		const probes = localAPI.getCollection('limitProbe')!;

		const r = await probes.create(
			{ organizationId: TEST_ORG_ID, overrideAccess: true },
			{ title: 'system write' }
		);
		created.push(r.document.id);
		expect(assertWithinLimit).not.toHaveBeenCalled();
	});

	it('is unlimited when no provider is configured', async () => {
		const localAPI = createLocalAPI({ ...cmsConfig, schemaTypes: [limitSchema], plugins: [] }, db);
		const probes = localAPI.getCollection('limitProbe')!;
		for (let i = 0; i < 3; i++) {
			const r = await probes.create(authedContext, { title: `nolimit-${i}` });
			created.push(r.document.id);
		}
		expect(await db.countDocsByType(TEST_ORG_ID, 'limitProbe')).toBe(3);
	});
});
