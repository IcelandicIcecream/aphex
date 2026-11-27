import { describe, expect, it } from 'vitest';
import { addedItem, itemKeysOf } from './added-item';

const page = (...keys: string[]) => ({
	title: 'Home',
	blocks: keys.map((_key) => ({ _key, _type: 'hero' }))
});

describe('addedItem', () => {
	it('finds the one section added, at its place', () => {
		expect(addedItem(itemKeysOf(page('a', 'b')), itemKeysOf(page('a', 'c', 'b')))).toEqual({
			field: 'blocks',
			index: 1
		});
	});

	it('finds the first section added to an empty page', () => {
		expect(addedItem(itemKeysOf({ title: 'Home' }), itemKeysOf(page('a')))).toEqual({
			field: 'blocks',
			index: 0
		});
	});

	it('ignores edits, moves and removals', () => {
		const before = itemKeysOf(page('a', 'b', 'c'));
		expect(addedItem(before, itemKeysOf(page('a', 'b', 'c')))).toBeNull();
		expect(addedItem(before, itemKeysOf(page('c', 'a', 'b')))).toBeNull();
		expect(addedItem(before, itemKeysOf(page('a', 'c')))).toBeNull();
	});

	it('follows nothing when several arrive at once', () => {
		expect(addedItem(itemKeysOf(page('a')), itemKeysOf(page('a', 'b', 'c')))).toBeNull();
	});

	it('skips arrays of plain values, which have no keys', () => {
		expect(itemKeysOf({ tags: ['x', 'y'] })).toEqual({});
	});

	it('does not follow a new paragraph of text', () => {
		const body = (...keys: string[]) => ({ body: keys.map((_key) => ({ _key, _type: 'block' })) });
		expect(addedItem(itemKeysOf(body('a')), itemKeysOf(body('a', 'b')))).toBeNull();
	});
});
