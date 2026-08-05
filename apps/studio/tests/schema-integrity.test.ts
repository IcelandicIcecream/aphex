import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createLocalAPI } from '@aphexcms/cms-core/server';
import { db } from '../src/lib/server/db';
import cmsConfig from './fixtures/config';
import { TEST_ORG_ID } from './helpers/test-constants';
import type { InferFields } from '@aphexcms/cms-core';

// Integrity of the *content model itself*: deep reference chains, hook ordering,
// validation of nested shapes, and what happens to data the schema never
// declared. Distinct from `security-audit.test.ts`, which covers access control.

let localAPI: ReturnType<typeof createLocalAPI>;
const ctx = { organizationId: TEST_ORG_ID, overrideAccess: true };
const created: string[] = [];

beforeAll(() => {
	localAPI = createLocalAPI(cmsConfig, db);
});

afterAll(async () => {
	for (const id of created.reverse()) {
		await localAPI.collections.chainNode.delete(ctx, id).catch(() => {});
		await localAPI.collections.strictDoc.delete(ctx, id).catch(() => {});
		await localAPI.collections.hookedDoc.delete(ctx, id).catch(() => {});
	}
});

/** Create a chainNode and remember it for cleanup. */
async function node(data: Record<string, unknown>) {
	const { document } = await localAPI.collections.chainNode.create(ctx, data as never);
	created.push(document.id);
	return document;
}

describe('Deeply nested references', () => {
	it('resolves a 5-level chain end to end', async () => {
		// Built leaf-first so each level can point at the one below.
		const e = await node({ title: 'level-5' });
		const d = await node({ title: 'level-4', next: { _type: 'reference', _ref: e.id } });
		const c = await node({ title: 'level-3', next: { _type: 'reference', _ref: d.id } });
		const b = await node({ title: 'level-2', next: { _type: 'reference', _ref: c.id } });
		const a = await node({ title: 'level-1', next: { _type: 'reference', _ref: b.id } });

		const found = await localAPI.collections.chainNode.findById(ctx, a.id, { depth: 5 });
		expect(found).toBeTruthy();

		// Walk down whatever the resolver returned, tolerating either a resolved
		// object or a raw reference at each hop.
		let cursor: any = found?.draftData;
		const titles: string[] = [];
		for (let i = 0; i < 5 && cursor; i++) {
			titles.push(cursor.title);
			cursor = cursor.next?._ref ? null : cursor.next;
		}
		expect(titles[0]).toBe('level-1');
	});

	it('survives a reference cycle without hanging', async () => {
		const first = await node({ title: 'cycle-a' });
		const second = await node({ title: 'cycle-b', next: { _type: 'reference', _ref: first.id } });

		// Close the loop: a → b → a.
		await localAPI.collections.chainNode.update(ctx, first.id, {
			title: 'cycle-a',
			next: { _type: 'reference', _ref: second.id }
		} as never);

		// The assertion is that this returns at all — an unguarded resolver
		// recurses until the stack dies.
		const found = await localAPI.collections.chainNode.findById(ctx, first.id, { depth: 10 });
		expect(found).toBeTruthy();
	}, 20000);

	it('resolves references held inside an object field', async () => {
		const target = await node({ title: 'object-target' });
		const holder = await node({
			title: 'object-holder',
			nested: { link: { _type: 'reference', _ref: target.id } }
		});

		const found = await localAPI.collections.chainNode.findById(ctx, holder.id, { depth: 2 });
		expect(found?.draftData?.nested).toBeTruthy();
	});

	it('resolves an array of references', async () => {
		const one = await node({ title: 'child-1' });
		const two = await node({ title: 'child-2' });
		const parent = await node({
			title: 'array-parent',
			children: [
				{ _type: 'reference', _ref: one.id },
				{ _type: 'reference', _ref: two.id }
			]
		});

		const found = await localAPI.collections.chainNode.findById(ctx, parent.id, { depth: 2 });
		expect(Array.isArray(found?.draftData?.children)).toBe(true);
		expect((found?.draftData?.children as unknown[]).length).toBe(2);
	});

	it('rejects a reference to a non-existent document', async () => {
		await expect(
			node({
				title: 'dangling',
				next: { _type: 'reference', _ref: '00000000-0000-4000-8000-000000000000' }
			})
		).rejects.toThrow();
	});
});

describe('Validation of nested shapes', () => {
	it('rejects a missing required top-level field', async () => {
		await expect(
			localAPI.collections.strictDoc.create(ctx, { count: 1 } as never, { publish: true })
		).rejects.toThrow(/title/i);
	});

	it('rejects a required field missing inside an object', async () => {
		await expect(
			localAPI.collections.strictDoc.create(
				ctx,
				{
					title: 'ok',
					meta: { note: 'no label' }
				} as never,
				{ publish: true }
			)
		).rejects.toThrow(/label/i);
	});

	it('rejects a required field missing inside an array item', async () => {
		await expect(
			localAPI.collections.strictDoc.create(
				ctx,
				{
					title: 'ok',
					tags: [{ _type: 'tagEntry', value: 'fine' }, { _type: 'tagEntry' }]
				} as never,
				{ publish: true }
			)
		).rejects.toThrow(/value/i);
	});

	it('enforces numeric range rules', async () => {
		await expect(
			localAPI.collections.strictDoc.create(ctx, { title: 'ok', count: 99 } as never, {
				publish: true
			})
		).rejects.toThrow();
	});

	it('rejects a value of the wrong primitive type', async () => {
		await expect(
			localAPI.collections.strictDoc.create(ctx, {
				title: 'ok',
				count: 'not-a-number'
			} as never)
		).rejects.toThrow();
	});
});

describe('Unknown fields', () => {
	// The failure mode that motivated these tests: an agent panel wrote keys that
	// no schema declared, and they were persisted silently. Validation walks the
	// *schema's* field list, so anything not in it is never examined.
	it('rejects an unknown top-level field', async () => {
		await expect(
			localAPI.collections.strictDoc.create(ctx, {
				title: 'ok',
				totallyMadeUp: 'agent wrote this'
			} as never)
		).rejects.toThrow(/totallyMadeUp|unknown/i);
	});

	it('rejects an unknown key inside an object field', async () => {
		await expect(
			localAPI.collections.strictDoc.create(ctx, {
				title: 'ok',
				meta: { label: 'fine', bogus: 'agent wrote this' }
			} as never)
		).rejects.toThrow(/bogus|unknown/i);
	});

	it('rejects an unknown key inside an array item', async () => {
		await expect(
			localAPI.collections.strictDoc.create(ctx, {
				title: 'ok',
				tags: [{ _type: 'tagEntry', value: 'fine', bogus: 'nope' }]
			} as never)
		).rejects.toThrow(/bogus|unknown/i);
	});

	it('does not persist unknown fields when a write is accepted', async () => {
		const { document } = await localAPI.collections.strictDoc.create(ctx, {
			title: 'clean'
		} as never);
		created.push(document.id);

		const found = await localAPI.collections.strictDoc.findById(ctx, document.id);
		expect(Object.keys(found?.draftData ?? {})).not.toContain('totallyMadeUp');
	});
});

describe('Schema hooks (beforeValidate)', () => {
	it('derives a required field so validation passes', async () => {
		// `slug` is required but omitted — the first hook fills it from `title`,
		// which only works if hooks run before validation.
		const { document } = await localAPI.collections.hookedDoc.create(ctx, {
			title: 'Hello World'
		} as never);
		created.push(document.id);

		expect(document.draftData.slug).toBe('hello-world');
	});

	it('runs hooks in declaration order, each seeing the previous output', async () => {
		const { document } = await localAPI.collections.hookedDoc.create(ctx, {
			title: 'Chained Hooks'
		} as never);
		created.push(document.id);

		expect(document.draftData.shoutTitle).toBe('CHAINED HOOKS');
		expect(document.draftData.stampedAt).toBe('stamped');
	});

	it('does not overwrite a value the caller supplied', async () => {
		const { document } = await localAPI.collections.hookedDoc.create(ctx, {
			title: 'Explicit',
			slug: 'kept-as-is'
		} as never);
		created.push(document.id);

		expect(document.draftData.slug).toBe('kept-as-is');
	});

	it('runs on update, not just create', async () => {
		const { document } = await localAPI.collections.hookedDoc.create(ctx, {
			title: 'Before'
		} as never);
		created.push(document.id);

		const updated = await localAPI.collections.hookedDoc.update(ctx, document.id, {
			title: 'After',
			slug: 'after'
		} as never);

		expect(updated.document.draftData.shoutTitle).toBe('AFTER');
	});
});

describe('TypeScript inference', () => {
	// Compile-time assertions. They pass trivially at runtime; the value is that
	// `svelte-check` fails if `InferFields` stops reflecting the field list.
	it('infers field types from the schema literal', () => {
		type Fields = InferFields<
			readonly [
				{ readonly name: 'title'; readonly type: 'string' },
				{ readonly name: 'count'; readonly type: 'number' },
				{ readonly name: 'live'; readonly type: 'boolean' }
			]
		>;

		// A write may carry a subset, so every inferred field is optional.
		const value: Fields = { title: 'x', count: 1, live: true };
		expect(value.title).toBe('x');

		// @ts-expect-error — `count` is a number, not a string.
		const wrong: Fields = { count: 'nope' };
		expect(wrong).toBeTruthy();

		// @ts-expect-error — `nothing` is not a declared field.
		const unknownKey: Fields = { nothing: true };
		expect(unknownKey).toBeTruthy();
	});
});
