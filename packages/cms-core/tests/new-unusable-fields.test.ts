import { describe, expect, it } from 'vitest';
import { newUnusableFields } from '../src/lib/field-validation/new-fields';
import { findOrphanedFields, withoutField } from '../src/lib/schema-utils/cleanup';
import { viewDocument } from '../src/lib/mcp/document-view';
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
const check = (data: unknown, ...previous: unknown[]) => {
	const { unknown, deprecated } = newUnusableFields(page, data, previous, schemas);
	return [...unknown, ...deprecated];
};
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

	it('knows a leftover whose keys the database returned in another order', () => {
		expect(
			check(
				{ blocks: [block({ old: { a: 1, b: 2 } })] },
				{ blocks: [block({ old: { b: 2, a: 1 } })] }
			)
		).toEqual([]);
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

describe('leftovers, for whoever reads or clears them', () => {
	const doc = () => ({
		id: 'p1',
		_meta: { revision: 3 },
		title: 'Home',
		gone: 1,
		blocks: [
			{
				_type: 'features',
				_key: 'a',
				legacy: 'red',
				style: { _type: 'style', tone: 'dark', old: true },
				items: [{ _type: 'featureItem', _key: 'x', emoji: 'pin', lost: 'y' }]
			}
		]
	});
	const content = () => {
		const { id: _id, _meta, ...data } = doc();
		return data;
	};
	const read = (options = {}) => {
		const meta = viewDocument(doc(), options, page, schemas)._meta;
		return JSON.parse(JSON.stringify(meta)).notInSchema?.paths;
	};

	it('tells an agent where they are, as patch paths, and not about retired fields', () => {
		expect(read()).toEqual([
			'gone',
			'blocks[_key=="a"].legacy',
			'blocks[_key=="a"].style.old',
			'blocks[_key=="a"].items[_key=="x"].lost'
		]);
		expect(read({ skim: true })).toHaveLength(4);
	});

	it('mentions only those in the part being read', () => {
		expect(read({ fields: ['title'] })).toBeUndefined();
		expect(read({ path: 'blocks[_key=="a"].items' })).toEqual([
			'blocks[_key=="a"].items[_key=="x"].lost'
		]);
		expect(read({ path: 'blocks[0].style' })).toEqual(['blocks[_key=="a"].style.old']);
	});

	it('clears them everywhere and keeps _type, _key and retired fields', () => {
		const data = content();
		const before = JSON.stringify(data);
		const { cleanedData, orphanedFields } = findOrphanedFields(data, page, schemas);
		expect(orphanedFields.map((f) => f.path)).toEqual([
			'gone',
			'blocks[0].legacy',
			'blocks[0].style.old',
			'blocks[0].items[0].lost'
		]);
		expect(cleanedData).toEqual({
			title: 'Home',
			blocks: [
				{
					_type: 'features',
					_key: 'a',
					style: { _type: 'style', tone: 'dark' },
					items: [{ _type: 'featureItem', _key: 'x', emoji: 'pin' }]
				}
			]
		});
		expect(JSON.stringify(data)).toBe(before);
	});

	it('clears one at a time', () => {
		const data = content();
		const { orphanedFields } = findOrphanedFields(data, page, schemas);
		const last = orphanedFields[3];
		if (!last) throw new Error('expected four');
		const after = findOrphanedFields(withoutField(data, last), page, schemas).orphanedFields;
		expect(after.map((f) => f.path)).toEqual(['gone', 'blocks[0].legacy', 'blocks[0].style.old']);
	});
});
