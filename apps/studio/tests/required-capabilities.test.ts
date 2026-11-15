import { describe, expect, it } from 'vitest';
import { ALL_CAPABILITIES, type Auth, type SchemaType } from '@aphexcms/cms-core';
import { createLocalAPI } from '@aphexcms/cms-core/server';
import { db } from './helpers/db';
import cmsConfig from './fixtures/config';
import { TEST_ORG_ID } from './helpers/test-constants';

/**
 * `requiredCapabilities`: a type exists only for organizations that have the
 * feature it needs. A document type is refused outright; a block can't be added,
 * but blocks a page already has are kept, so losing a feature loses no content.
 */
const product: SchemaType = {
	type: 'document',
	name: 'rcProduct',
	title: 'Product',
	requiredCapabilities: ['site.shop'],
	fields: [{ name: 'title', type: 'string', title: 'Title' }]
};

const bookNow: SchemaType = {
	type: 'object',
	name: 'rcBookNow',
	title: 'Book now',
	requiredCapabilities: ['site.bookings'],
	fields: [{ name: 'label', type: 'string', title: 'Label' }]
};

const text: SchemaType = {
	type: 'object',
	name: 'rcText',
	title: 'Text',
	fields: [{ name: 'body', type: 'string', title: 'Body' }]
};

const page: SchemaType = {
	type: 'document',
	name: 'rcPage',
	title: 'Page',
	fields: [
		{ name: 'title', type: 'string', title: 'Title' },
		{
			name: 'blocks',
			type: 'array',
			title: 'Blocks',
			of: [{ type: 'rcText' }, { type: 'rcBookNow' }]
		}
	]
};

const api = createLocalAPI(
	{ ...cmsConfig, schemaTypes: [product, bookNow, text, page], plugins: [] },
	db
);
const products = api.getCollection('rcProduct')!;
const pages = api.getCollection('rcPage')!;

/** An owner whose organization has the given features. */
function owner(features: string[]) {
	const auth: Auth = {
		type: 'session',
		user: { id: 'user-1', email: 'owner@example.com', name: 'Owner', role: 'super_admin' },
		session: { id: 's', expiresAt: new Date(Date.now() + 60_000) },
		organizationId: TEST_ORG_ID,
		organizationRole: 'owner',
		capabilities: [...ALL_CAPABILITIES, ...features]
	} as Auth;
	return { organizationId: TEST_ORG_ID, auth };
}

const block = (type: string, key: string) => ({ _type: type, _key: key });

describe('requiredCapabilities on a document type', () => {
	it('refuses every operation without the feature, even for an owner and a super admin', async () => {
		await expect(products.create(owner([]), { title: 'Mug' })).rejects.toThrow(
			"Product isn't available in this organization."
		);
		await expect(products.find(owner([]), {})).rejects.toThrow("isn't available");
	});

	it('works with the feature, and for system contexts', async () => {
		const made = await products.create(owner(['site.shop']), { title: 'Mug' });
		const id = (made.document as { id: string }).id;
		expect(await products.findByID(owner(['site.shop']), id)).toBeTruthy();
		expect(
			await products.findByID({ organizationId: TEST_ORG_ID, overrideAccess: true }, id)
		).toBeTruthy();
	});
});

describe('requiredCapabilities on a block', () => {
	it("refuses adding one without the feature, and names what's missing", async () => {
		await expect(
			pages.create(owner([]), { title: 'Home', blocks: [block('rcBookNow', 'b1')] })
		).rejects.toThrow(
			"Book now isn't available in this organization, so it can't be added (at blocks[0])."
		);
	});

	it('keeps blocks a page already has after the feature is lost', async () => {
		const made = await pages.create(owner(['site.bookings']), {
			title: 'Home',
			blocks: [block('rcText', 't1'), block('rcBookNow', 'b1')]
		});
		const id = (made.document as { id: string }).id;

		// The feature is gone: editing the page, block included, still saves.
		await pages.update(owner([]), id, {
			title: 'Home, edited',
			blocks: [block('rcBookNow', 'b1'), block('rcText', 't1')]
		});

		// Adding another is refused…
		await expect(
			pages.update(owner([]), id, {
				blocks: [block('rcText', 't1'), block('rcBookNow', 'b1'), block('rcBookNow', 'b2')]
			})
		).rejects.toThrow("can't be added (at blocks[2])");

		// …and so is one without a key, which can't be told apart from a new one.
		await expect(pages.update(owner([]), id, { blocks: [{ _type: 'rcBookNow' }] })).rejects.toThrow(
			"can't be added"
		);

		// Removing it is fine.
		await pages.update(owner([]), id, { blocks: [block('rcText', 't1')] });
	});

	it('lets a removed block come back while the published version still has it', async () => {
		const made = await pages.create(
			owner(['site.bookings']),
			{ title: 'Booking', blocks: [block('rcBookNow', 'b1')] },
			{ publish: true }
		);
		const id = (made.document as { id: string }).id;
		await pages.update(owner([]), id, { blocks: [] });
		await pages.update(owner([]), id, { blocks: [block('rcBookNow', 'b1')] });
	});
});
