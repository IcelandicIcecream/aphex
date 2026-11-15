/**
 * `depth` is an access-control boundary. A read with `depth` replaces each
 * reference with the document it points at, and that document must come back
 * only as a direct read of it would: as the same caller, in the same perspective.
 *
 * The database adapters used to do the expanding, reading each target as a raw
 * row. A caller only needed one document it could read that pointed at another to
 * get the other in full, whatever its type's read access or `requiredCapabilities`
 * and whatever its fields' read access, and with its draft even in the published
 * perspective. GraphQL had the same hole and was fixed separately
 * (`graphql-reference-access.test.ts`); this covers the Local API and REST.
 *
 * Run: pnpm -F @aphexcms/studio test reference-depth-access
 */
import { afterAll, describe, expect, it } from 'vitest';
import { ALL_CAPABILITIES, type Auth, type SchemaType } from '@aphexcms/cms-core';
import {
	createAphexApi,
	createLocalAPI,
	InMemoryCacheAdapter,
	mountAphexBuiltins,
	type CMSInstances
} from '@aphexcms/cms-core/server';
import { db } from './helpers/db';
import cmsConfig from './fixtures/config';
import { TEST_ORG_ID } from './helpers/test-constants';

const product: SchemaType = {
	type: 'document',
	name: 'rdProduct',
	title: 'Product',
	requiredCapabilities: ['site.shop'],
	fields: [{ name: 'title', type: 'string', title: 'Title' }]
};

const memo: SchemaType = {
	type: 'document',
	name: 'rdMemo',
	title: 'Memo',
	access: { read: ['admin', 'owner'] },
	fields: [{ name: 'title', type: 'string', title: 'Title' }]
};

const person: SchemaType = {
	type: 'document',
	name: 'rdPerson',
	title: 'Person',
	fields: [
		{ name: 'name', type: 'string', title: 'Name' },
		{ name: 'salary', type: 'number', title: 'Salary', access: { read: ['owner'] } },
		{ name: 'friend', type: 'reference', title: 'Friend', to: [{ type: 'rdPerson' }] }
	]
};

/** Readable by anyone; points at each of the above. */
const board: SchemaType = {
	type: 'document',
	name: 'rdBoard',
	title: 'Board',
	fields: [
		{ name: 'title', type: 'string', title: 'Title' },
		{ name: 'product', type: 'reference', title: 'Product', to: [{ type: 'rdProduct' }] },
		{ name: 'memo', type: 'reference', title: 'Memo', to: [{ type: 'rdMemo' }] },
		{
			name: 'people',
			type: 'array',
			title: 'People',
			of: [{ type: 'reference', to: [{ type: 'rdPerson' }] }]
		}
	]
};

const cache = new InMemoryCacheAdapter({ maxSize: 500 });
const config = { ...cmsConfig, schemaTypes: [product, memo, person, board], plugins: [], cache };
const api = createLocalAPI(config, db);
const system = { organizationId: TEST_ORG_ID, overrideAccess: true };
const collection = (name: string) => api.getCollection(name)!;
const created: Array<[string, string]> = [];

afterAll(async () => {
	for (const [type, id] of created.reverse()) {
		await collection(type)
			.delete(system, id, { force: true } as never)
			.catch(() => {});
	}
});

function as(role: 'owner' | 'editor', features: string[] = []) {
	const auth = {
		type: 'session',
		user: { id: `${role}-user`, email: `${role}@example.com`, name: role, role: 'editor' },
		session: { id: 's', expiresAt: new Date(Date.now() + 60_000) },
		organizationId: TEST_ORG_ID,
		organizationRole: role,
		capabilities: [...ALL_CAPABILITIES, ...features]
	} as Auth;
	return { organizationId: TEST_ORG_ID, auth };
}

const ref = (id: string, key?: string) => ({
	_type: 'reference',
	_ref: id,
	...(key ? { _key: key } : {})
});

async function make(type: string, data: Record<string, unknown>, publish = true) {
	const { document } = await collection(type).create(system, data as never, { publish });
	created.push([type, (document as { id: string }).id]);
	return document as { id: string };
}

async function seed() {
	const productDoc = await make('rdProduct', { title: 'Mug' });
	const memoDoc = await make('rdMemo', { title: 'Layoffs' });
	const ann = await make('rdPerson', { name: 'Ann', salary: 90000 });
	const bob = await make('rdPerson', { name: 'Bob', salary: 80000, friend: ref(ann.id) });
	const boardDoc = await make('rdBoard', {
		title: 'Board',
		product: ref(productDoc.id),
		memo: ref(memoDoc.id),
		people: [ref(bob.id, 'k1')]
	});
	return { productDoc, memoDoc, ann, bob, boardDoc };
}

type Loose = Record<string, any>;

describe('depth reads each referenced document as the caller', () => {
	it('leaves a reference to a type the organization lacks unresolved', async () => {
		const { productDoc, boardDoc } = await seed();

		const without = (await collection('rdBoard').findByID(as('owner'), boardDoc.id, {
			depth: 1
		})) as Loose;
		expect(without.product).toEqual(ref(productDoc.id));

		const withShop = (await collection('rdBoard').findByID(
			as('owner', ['site.shop']),
			boardDoc.id,
			{
				depth: 1
			}
		)) as Loose;
		expect(withShop.product.id).toBe(productDoc.id);
		expect(withShop.product.title).toBe('Mug');
	});

	it("leaves a reference to a type the caller's role can't read unresolved", async () => {
		const { memoDoc, boardDoc } = await seed();

		const editor = (await collection('rdBoard').findByID(as('editor'), boardDoc.id, {
			depth: 1
		})) as Loose;
		expect(editor.memo).toEqual(ref(memoDoc.id));

		const owner = (await collection('rdBoard').findByID(as('owner'), boardDoc.id, {
			depth: 1
		})) as Loose;
		expect(owner.memo.title).toBe('Layoffs');
	});

	it("strips the target's read-restricted fields, at every level", async () => {
		const { boardDoc } = await seed();

		const editor = (await collection('rdBoard').findByID(as('editor'), boardDoc.id, {
			depth: 2
		})) as Loose;
		const bob = editor.people[0];
		expect(bob.name).toBe('Bob');
		expect(bob).not.toHaveProperty('salary');
		expect(bob.friend.name).toBe('Ann');
		expect(bob.friend).not.toHaveProperty('salary');

		const owner = (await collection('rdBoard').findByID(as('owner'), boardDoc.id, {
			depth: 2
		})) as Loose;
		expect(owner.people[0].salary).toBe(80000);
		expect(owner.people[0].friend.salary).toBe(90000);
	});

	it('applies the same rules to find, not only findByID', async () => {
		const { memoDoc, boardDoc } = await seed();
		const result = await collection('rdBoard').find(as('editor'), {
			where: { id: { equals: boardDoc.id } },
			depth: 1
		});
		const board = result.docs[0] as Loose;
		expect(board.memo).toEqual(ref(memoDoc.id));
		expect(board.people[0]).not.toHaveProperty('salary');
	});
});

describe('depth keeps to the perspective', () => {
	it("resolves a published read to the target's published version, never its draft", async () => {
		const ann = await make('rdPerson', { name: 'Ann (published)' });
		await collection('rdPerson').update(system, ann.id, { name: 'Ann (draft)' } as never);
		const boardDoc = await make('rdBoard', { title: 'B', people: [ref(ann.id, 'a')] });

		const published = (await collection('rdBoard').findByID(as('owner'), boardDoc.id, {
			depth: 1,
			perspective: 'published'
		})) as Loose;
		expect(published.people[0].name).toBe('Ann (published)');
		expect(JSON.stringify(published)).not.toContain('Ann (draft)');

		const draft = (await collection('rdBoard').findByID(as('owner'), boardDoc.id, {
			depth: 1,
			perspective: 'draft'
		})) as Loose;
		expect(draft.people[0].name).toBe('Ann (draft)');
	});
});

describe('the shape of a resolved reference', () => {
	it('is the target as a direct read returns it, keeping an array item’s _key', async () => {
		const { bob, boardDoc } = await seed();
		const board = (await collection('rdBoard').findByID(as('owner'), boardDoc.id, {
			depth: 1
		})) as Loose;
		const direct = (await collection('rdPerson').findByID(as('owner'), bob.id)) as Loose;

		const { _key, ...resolved } = board.people[0];
		expect(_key).toBe('k1');
		expect(resolved).toEqual(direct);
		expect(resolved).not.toHaveProperty('draftData');
		expect(resolved).not.toHaveProperty('publishedData');
		// depth 1: the target's own references stay raw.
		expect(resolved.friend._ref).toBeDefined();
	});

	it('stops at a cycle and returns', async () => {
		const a = await make('rdPerson', { name: 'A' }, false);
		const b = await make('rdPerson', { name: 'B', friend: ref(a.id) }, false);
		await collection('rdPerson').update(system, a.id, { name: 'A', friend: ref(b.id) } as never);

		const read = (await collection('rdPerson').findByID(as('owner'), a.id, { depth: 5 })) as Loose;
		expect(read.friend.name).toBe('B');
		// B's friend is A again: following it would loop, so it stays a reference.
		expect(read.friend.friend).toEqual(ref(a.id));
	});
});

describe('depth and the cache', () => {
	it("doesn't let one caller's expanded read reach another caller, or a depth-0 read", async () => {
		const { memoDoc, boardDoc } = await seed();
		await cache.flush();

		// The owner reads first and warms the published cache for this board.
		const owner = (await collection('rdBoard').findByID(as('owner'), boardDoc.id, {
			depth: 1,
			perspective: 'published'
		})) as Loose;
		expect(owner.memo.title).toBe('Layoffs');

		const editor = (await collection('rdBoard').findByID(as('editor'), boardDoc.id, {
			depth: 1,
			perspective: 'published'
		})) as Loose;
		expect(editor.memo).toEqual(ref(memoDoc.id));

		const plain = (await collection('rdBoard').findByID(as('owner'), boardDoc.id, {
			perspective: 'published'
		})) as Loose;
		expect(plain.memo).toEqual(ref(memoDoc.id));

		const listed = await collection('rdBoard').find(as('editor'), {
			where: { id: { equals: boardDoc.id } },
			depth: 1,
			perspective: 'published'
		});
		expect((listed.docs[0] as Loose).memo).toEqual(ref(memoDoc.id));
	});
});

describe('REST', () => {
	it('GET /api/documents/:id?depth=1 follows the same rules', async () => {
		const { memoDoc, productDoc, boardDoc } = await seed();
		const app = createAphexApi();
		mountAphexBuiltins(app);
		const cms = { config, databaseAdapter: db, localAPI: api } as unknown as CMSInstances;

		const response = await app.fetch(
			new Request(`http://localhost/api/documents/${boardDoc.id}?depth=1`),
			{ aphexCMS: cms, auth: as('editor').auth }
		);
		expect(response.status).toBe(200);
		const body = (await response.json()) as { data: Loose };
		expect(body.data.memo).toEqual(ref(memoDoc.id));
		expect(body.data.product).toEqual(ref(productDoc.id));
		expect(body.data.people[0].name).toBe('Bob');
		expect(body.data.people[0]).not.toHaveProperty('salary');
	});
});
