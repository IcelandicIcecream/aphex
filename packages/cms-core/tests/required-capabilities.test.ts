import { describe, expect, it } from 'vitest';
import {
	findArrayItemsOfTypes,
	hasRequiredCapabilities,
	validateRequiredCapabilities
} from '../src/lib/schema-utils/required-capabilities';
import { typeNavGroups } from '../src/lib/admin/type-nav';
import type { SchemaType } from '../src/lib/types/schemas';

describe('hasRequiredCapabilities', () => {
	it('needs every listed capability', () => {
		const gated = { requiredCapabilities: ['site.shop', 'site.pro'] };
		expect(hasRequiredCapabilities(gated, ['site.shop'])).toBe(false);
		expect(hasRequiredCapabilities(gated, ['site.shop', 'site.pro', 'x'])).toBe(true);
		expect(hasRequiredCapabilities(gated, new Set(['site.shop', 'site.pro']))).toBe(true);
	});

	it('lets an ungated or unknown type through', () => {
		expect(hasRequiredCapabilities({}, [])).toBe(true);
		expect(hasRequiredCapabilities({ requiredCapabilities: [] }, [])).toBe(true);
		expect(hasRequiredCapabilities(undefined, [])).toBe(true);
	});
});

describe('findArrayItemsOfTypes', () => {
	it('finds items at any depth, including inside rich text and nested arrays', () => {
		const data = {
			blocks: [
				{ _type: 'book', _key: 'a' },
				{
					_type: 'section',
					_key: 's',
					columns: [{ _type: 'column', _key: 'c', items: [{ _type: 'book', _key: 'b' }] }]
				}
			],
			body: [{ _type: 'block', children: [{ _type: 'book', _key: 'inline' }] }],
			// An object field's value isn't an inserted item.
			hero: { _type: 'book' }
		};
		expect(findArrayItemsOfTypes(data, new Set(['book']))).toEqual([
			{ type: 'book', key: 'a', path: 'blocks[0]' },
			{ type: 'book', key: 'b', path: 'blocks[1].columns[0].items[0]' },
			{ type: 'book', key: 'inline', path: 'body[0].children[0]' }
		]);
	});

	it('returns nothing for no types or no data', () => {
		expect(findArrayItemsOfTypes({ a: [{ _type: 'x' }] }, new Set())).toEqual([]);
		expect(findArrayItemsOfTypes(null, new Set(['x']))).toEqual([]);
	});
});

describe('validateRequiredCapabilities', () => {
	it('fails on a capability nothing declares, naming the schema', () => {
		expect(() =>
			validateRequiredCapabilities(
				[{ name: 'product', requiredCapabilities: ['site.shopp'] }],
				['site.shop']
			)
		).toThrow('Schema "product" requires the capability "site.shopp", which nothing declares.');
	});

	it('passes when every id is declared', () => {
		expect(() =>
			validateRequiredCapabilities(
				[{ name: 'product', requiredCapabilities: ['site.shop'] }, { name: 'page' }],
				['site.shop']
			)
		).not.toThrow();
	});
});

describe('typeNavGroups', () => {
	const schemas = [
		{ type: 'document', name: 'page', title: 'Page', fields: [] },
		{
			type: 'document',
			name: 'product',
			title: 'Product',
			requiredCapabilities: ['site.shop'],
			fields: []
		}
	] as SchemaType[];

	const labels = (capabilities: string[]) =>
		typeNavGroups(schemas, 'owner', capabilities).flatMap((g) => g.items!.map((i) => i.label));

	it('leaves out a type the organization lacks', () => {
		expect(labels([])).toEqual(['Pages']);
		expect(labels(['site.shop'])).toEqual(['Pages', 'Products']);
	});
});
