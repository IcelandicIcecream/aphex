/**
 * A string field with a `list` is typed as the union of its values, like
 * Payload's select fields and Sanity TypeGen's `options.list`, so a typo in a
 * renderer's comparison is a type error. Without a list it stays `string`.
 */
import { describe, expect, it } from 'vitest';
import { generateTypes } from '../src/lib/type-gen';
import type { SchemaType } from '../src/lib/types/schemas';

const schemas: SchemaType[] = [
	{
		type: 'document',
		name: 'page',
		title: 'Page',
		fields: [
			{ name: 'title', type: 'string', title: 'Title' },
			{ name: 'size', type: 'string', title: 'Size', list: ['s', 'm', "it's"] },
			{
				name: 'fit',
				type: 'string',
				title: 'Fit',
				list: [
					{ value: 'fill', title: 'Fill' },
					{ value: 'whole', title: 'Whole' }
				]
			},
			{ name: 'kind', type: 'string', title: 'Kind', list: ['food', 'shop'] },
			{
				name: 'dish',
				type: 'string',
				title: 'Dish',
				list: {
					dependsOn: 'kind',
					options: { food: ['soup', 'cake'], shop: ['cake', { value: 'mug', title: 'Mug' }] }
				}
			},
			{ name: 'empty', type: 'string', title: 'Empty', list: [] }
		]
	}
];

describe('string fields with a list', () => {
	const out = generateTypes(schemas);
	it('are the union of their values', () => {
		expect(out).toMatch(/size\?: 's' \| 'm' \| 'it\\'s';/);
		expect(out).toMatch(/fit\?: 'fill' \| 'whole';/);
	});
	it('take every branch of a dependent list, once each', () => {
		expect(out).toMatch(/dish\?: 'soup' \| 'cake' \| 'mug';/);
	});
	it('stay string without one', () => {
		expect(out).toMatch(/title\?: string;/);
		expect(out).toMatch(/empty\?: string;/);
	});
});
