import { describe, expect, it, vi } from 'vitest';
import type { DatabaseAdapter, SchemaType } from '@aphexcms/cms-core';
import { createLocalAPI } from '@aphexcms/cms-core/server';
import { db } from '$lib/server/db';
import cmsConfig from './fixtures/config';
import { TEST_ORG_ID } from './helpers/test-constants';

const probeSchema: SchemaType = {
	type: 'document',
	name: 'outboxProbe',
	title: 'Outbox probe',
	fields: [{ name: 'title', type: 'string', title: 'Title' }]
};

function boundProxy(
	target: DatabaseAdapter,
	overrides: Partial<Record<keyof DatabaseAdapter, unknown>>
): DatabaseAdapter {
	return new Proxy(target, {
		get(object, property) {
			if (property in overrides) return overrides[property as keyof DatabaseAdapter];
			const value = Reflect.get(object, property);
			return typeof value === 'function' ? value.bind(object) : value;
		}
	});
}

describe('Local API transactional outbox', () => {
	it('rolls back the document when appending its event fails', async () => {
		const id = crypto.randomUUID();
		const appendEvent = vi.fn().mockRejectedValue(new Error('outbox unavailable'));
		const adapter = boundProxy(db, {
			withTransaction: (callback: (tx: DatabaseAdapter) => Promise<unknown>) =>
				db.withTransaction((tx) => callback(boundProxy(tx, { appendEvent })))
		});
		const localAPI = createLocalAPI(
			{ ...cmsConfig, schemaTypes: [probeSchema], plugins: [] },
			adapter
		);
		const probes = localAPI.getCollection('outboxProbe');
		expect(probes).toBeDefined();

		await expect(
			probes!.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{ title: 'Must roll back' },
				{
					id,
					skipVersioning: true,
					outboxEvents: [{ type: 'test.probe.created', payload: { id } }]
				}
			)
		).rejects.toThrow('outbox unavailable');
		expect(appendEvent).toHaveBeenCalledOnce();
		expect(await db.findByDocIdAdvanced(TEST_ORG_ID, id)).toBeNull();
	});
});
