import { describe, expect, it } from 'vitest';
import { newUnusableFields } from '../src/lib/field-validation/new-fields';
import { schemaOutline } from '../src/lib/mcp/schema-outline';
import type { SchemaType } from '../src/lib/types/schemas';

const icon: SchemaType = {
	type: 'object',
	name: 'compIcon',
	title: 'Icon',
	fields: [
		{ name: 'symbol', type: 'string', title: 'Symbol' },
		{ name: 'size', type: 'string', title: 'Size' }
	]
};
const features: SchemaType = {
	type: 'object',
	name: 'features',
	title: 'Features',
	fields: [
		{
			name: 'style',
			type: 'object',
			title: 'Style',
			fields: [{ name: 'tone', type: 'string', title: 'Tone' }]
		},
		{
			name: 'items',
			type: 'array',
			title: 'Items',
			of: [
				{
					type: 'object',
					name: 'featureItem',
					title: 'Item',
					fields: [
						{ name: 'symbol', type: 'string', title: 'Symbol' },
						{
							name: 'emoji',
							type: 'string',
							title: 'Emoji',
							deprecated: { reason: 'Use "symbol".' }
						}
					]
				}
			]
		},
		{ name: 'children', type: 'array', title: 'Children', of: [{ type: 'compIcon' }] },
		{ name: 'words', type: 'array', title: 'Words', of: [{ type: 'block' }] }
	]
};
const page: SchemaType = {
	type: 'document',
	name: 'page',
	title: 'Page',
	fields: [
		{ name: 'title', type: 'string', title: 'Title' },
		{ name: 'blocks', type: 'array', title: 'Blocks', of: [{ type: 'features' }] }
	]
};
const schemas = [page, features, icon];
const check = (data: unknown, ...previous: unknown[]) =>
	newUnusableFields(page, data, previous, schemas);
const block = (extra: object, key = 'a') => ({ _type: 'features', _key: key, ...extra });

describe('newUnusableFields', () => {
	it('names the fields a block has when a write guesses another', () => {
		const [error, ...rest] = check({
			blocks: [block({ children: [{ _type: 'compIcon', _key: 'i', icon: 'calendar' }] })]
		});
		expect(rest).toEqual([]);
		expect(error).toMatchObject({
			field: 'blocks[0].children[0].icon',
			errors: ["isn't a field of Icon. Its fields: symbol, size"],
			kind: 'structural'
		});
	});

	it('looks inside object fields and at the document itself', () => {
		expect(
			check({ bogus: 1, blocks: [block({ style: { tne: 'dark' } })] }).map((e) => e.field)
		).toEqual(['bogus', 'blocks[0].style.tne']);
	});

	it('passes a leftover already stored, even when its block has moved', () => {
		const old = block({ legacy: 'red' });
		expect(check({ blocks: [block({}, 'new'), old] }, { blocks: [old] })).toEqual([]);
		expect(check({ blocks: [old] }, { blocks: [] }, { blocks: [old] })).toEqual([]);
	});

	it('refuses a changed leftover, and one on another block', () => {
		const stored = { blocks: [block({ legacy: 'red' })] };
		expect(check({ blocks: [block({ legacy: 'blue' })] }, stored)).toHaveLength(1);
		expect(check({ blocks: [block({ legacy: 'red' }, 'b')] }, stored)).toHaveLength(1);
	});

	it('refuses a new value in a deprecated field, keeps a stored one and lets it be cleared', () => {
		const item = (extra: object) => ({
			blocks: [block({ items: [{ _type: 'featureItem', _key: 'x', ...extra }] })]
		});
		expect(check(item({ emoji: 'pin' }))[0]?.errors).toEqual(['is no longer used. Use "symbol".']);
		expect(check(item({ emoji: 'pin' }), item({ emoji: 'pin' }))).toEqual([]);
		expect(check(item({ emoji: '' }), item({ emoji: 'pin' }))).toEqual([]);
		expect(check(item({ emoji: null }))).toEqual([]);
	});

	it('leaves rich text, odd shapes and missing data to ordinary validation', () => {
		expect(
			check({ blocks: [block({ words: [{ _type: 'block', _key: 'w', markDefs: [] }] })] })
		).toEqual([]);
		expect(check({ blocks: 'nope' })).toEqual([]);
		expect(check({ blocks: [{ _type: 'unknown', x: 1 }, 'text', null] })).toEqual([]);
		expect(check(null)).toEqual([]);
	});
});
