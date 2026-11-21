import { describe, expect, it } from 'vitest';
import { isFieldVisible, parentOf } from '../src/lib/schema-utils/visibility';
import type { Field } from '../src/lib/types/schemas';

const page = {
	title: 'Home',
	blocks: [
		{ _key: 'a', _type: 'features', variant: 'list', items: [{ _key: 'a1', title: 'One' }] },
		{
			_key: 'b',
			_type: 'priceList',
			variant: 'cards',
			categories: [{ _key: 'b1', name: 'Breakfast', items: [{ _key: 'b1x', name: 'Toast' }] }]
		}
	],
	seo: { title: 'Home' }
};

describe('parentOf', () => {
	it('finds the block that owns an array item', () => {
		expect(parentOf(page, page.blocks[0].items![0])).toBe(page.blocks[0]);
	});

	it('finds it by _key when given a copy, as the editor holds', () => {
		expect(parentOf(page, { _key: 'a1', title: 'Edited' })).toBe(page.blocks[0]);
	});

	it('goes further up when called again', () => {
		const toast = { _key: 'b1x' };
		const category = parentOf(page, toast);
		expect(category?.name).toBe('Breakfast');
		expect(parentOf(page, category)?.variant).toBe('cards');
	});

	it('finds the document as the parent of a top-level block or object', () => {
		expect(parentOf(page, page.blocks[1])).toBe(page);
		expect(parentOf(page, page.seo)).toBe(page);
	});

	it('is undefined for the document itself, or for something not in it', () => {
		expect(parentOf(page, page)).toBeUndefined();
		expect(parentOf(page, { _key: 'nowhere' })).toBeUndefined();
	});

	it('lets an item field follow its block in isFieldVisible', () => {
		const tag: Field = {
			name: 'tag',
			type: 'string',
			hidden: ({ siblingData, documentData }) =>
				parentOf(documentData, siblingData)?.variant === 'list'
		};
		expect(isFieldVisible(tag, page.blocks[0].items![0], page)).toBe(false);
		expect(isFieldVisible(tag, page.blocks[1].categories![0], page)).toBe(true);
	});
});
