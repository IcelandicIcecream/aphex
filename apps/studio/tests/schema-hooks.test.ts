/**
 * Schema lifecycle hooks + cross-field validation context.
 *
 *  - `beforeValidate` transform hooks run on every Local API write (DB-backed,
 *    exercised through the `contactSubmission` collection).
 *  - `validateDocumentData` exposes the whole document to `Rule.custom` via
 *    `context.document` (pure, no DB).
 *
 * Run: pnpm -F @aphexcms/studio test schema-hooks
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createLocalAPI } from '@aphexcms/cms-core/server';
import { validateDocumentData } from '@aphexcms/cms-core';
import { db } from '$lib/server/db';
import cmsConfig from './fixtures/config';
import { TEST_ORG_ID } from './helpers/test-constants';

let localAPI: ReturnType<typeof createLocalAPI>;
const ctx = { organizationId: TEST_ORG_ID, overrideAccess: true };
const createdIds: string[] = [];

beforeAll(async () => {
	localAPI = createLocalAPI(cmsConfig, db);
}, 30000);

afterEach(async () => {
	for (const id of createdIds) {
		try {
			await localAPI.collections.contactSubmission.delete(ctx, id);
		} catch {
			// already gone
		}
	}
	createdIds.length = 0;
});

// The DB-backed `beforeValidate` cases live in `schema-integrity.test.ts`
// ("Schema hooks (beforeValidate)"), against the `hookedDoc` fixture: hooks run
// before validation, chain in declaration order, don't overwrite a value the
// caller supplied, and run on update as well as create. They used to be here
// too, written against a `contactSubmission` collection that no longer exists
// in the test-owned registry — dead duplicates, so they're gone rather than
// retargeted.

describe('validateDocumentData exposes context.document to Rule.custom', () => {
	it('cross-field validator can read the whole document', async () => {
		const schema = {
			type: 'document' as const,
			name: 'ctxDocProbe',
			title: 'Ctx Doc Probe',
			fields: [
				{ name: 'a', type: 'string' as const, title: 'A' },
				{
					name: 'b',
					type: 'string' as const,
					title: 'B',
					// Passes only if context.document.a is visible.
					validation: (Rule: {
						custom: (
							fn: (v: unknown, ctx: { document?: { a?: string } }) => true | string
						) => unknown;
					}) =>
						Rule.custom((_v, ctx) =>
							ctx.document?.a === 'hello' ? true : 'document.a not visible in validation context'
						)
				}
			]
		};

		const pass = await validateDocumentData(schema as never, { a: 'hello', b: 'world' });
		expect(pass.isValid).toBe(true);

		const fail = await validateDocumentData(schema as never, { a: 'nope', b: 'world' });
		expect(fail.isValid).toBe(false);
		expect(fail.errors.some((e) => e.field === 'b')).toBe(true);
	});
});
