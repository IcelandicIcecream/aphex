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
import cmsConfig from '../aphex.config';
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

describe('beforeValidate hooks (Local API)', () => {
	it('normalizes input and stamps submittedAt on create', async () => {
		const { document } = await localAPI.collections.contactSubmission.create(ctx, {
			name: '  Bob Smith  ',
			email: '  BOB@Example.COM ',
			subject: '  Hi there  ',
			message: 'Hello, this is a test message.'
		} as Record<string, unknown>);
		createdIds.push(document.id);

		const doc = document as Record<string, unknown>;
		// Transform hook #1: trimmed + lowercased.
		expect(doc.name).toBe('Bob Smith');
		expect(doc.email).toBe('bob@example.com');
		expect(doc.subject).toBe('Hi there');
		// Transform hook #2: submittedAt stamped once, on create.
		expect(typeof doc.submittedAt).toBe('string');
		expect(Number.isNaN(Date.parse(doc.submittedAt as string))).toBe(false);
	});

	it('re-normalizes on update but does not overwrite submittedAt', async () => {
		const created = await localAPI.collections.contactSubmission.create(ctx, {
			name: 'Alice',
			email: 'alice@example.com',
			message: 'First message.'
		} as Record<string, unknown>);
		createdIds.push(created.document.id);
		const stampedAt = (created.document as Record<string, unknown>).submittedAt as string;
		expect(stampedAt).toBeTruthy();

		const updated = await localAPI.collections.contactSubmission.update(ctx, created.document.id, {
			email: '  NEW@Example.COM '
		} as Record<string, unknown>);
		const doc = updated!.document as Record<string, unknown>;
		// Update path still runs the normalize hook.
		expect(doc.email).toBe('new@example.com');
		// But the create-only stamp is preserved, not reset.
		expect(doc.submittedAt).toBe(stampedAt);
	});
});

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
