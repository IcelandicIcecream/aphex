import { describe, expect, it } from 'vitest';
import {
	mergeDocuments,
	replaceChanged,
	sameValue
} from '../src/lib/components/admin/document-merge';

// A page as the editor holds it: fields, an object, and blocks with keys.
const page = () => ({
	title: 'Home',
	seo: { title: 'Lily’s Bakery', description: 'Bread in Bangsar' },
	tags: ['bakery', 'kl'],
	blocks: [
		{ _key: 'hero', _type: 'hero', heading: 'Fresh bread daily', intro: 'Since 2014' },
		{ _key: 'faq', _type: 'faq', heading: 'Questions' },
		{ _key: 'cta', _type: 'cta', heading: 'Visit us' }
	]
});

const keys = (blocks: unknown) => (blocks as Array<{ _key: string }>).map((block) => block._key);
const block = (result: { merged: Record<string, unknown> }, key: string) =>
	(result.merged.blocks as Array<Record<string, unknown>>).find((item) => item._key === key);

describe('mergeDocuments: one side changed', () => {
	it('takes the other side’s edit when nothing was changed here', () => {
		const base = page();
		const remote = page();
		remote.title = 'Welcome';
		const result = mergeDocuments(base, page(), remote);
		expect(result.merged.title).toBe('Welcome');
		expect(result.conflicts).toEqual([]);
	});

	it('keeps an edit made here when the other side didn’t touch that field', () => {
		const local = page();
		local.title = 'My edit';
		const result = mergeDocuments(page(), local, page());
		expect(result.merged.title).toBe('My edit');
		expect(result.conflicts).toEqual([]);
	});

	it('keeps both when each changed a different field', () => {
		const local = page();
		local.seo.description = 'Sourdough in Bangsar';
		const remote = page();
		remote.title = 'Welcome';
		const result = mergeDocuments(page(), local, remote);
		expect(result.merged.title).toBe('Welcome');
		expect(result.merged.seo).toEqual({
			title: 'Lily’s Bakery',
			description: 'Sourdough in Bangsar'
		});
		expect(result.conflicts).toEqual([]);
	});

	it('keeps a field the other side removed only if this side changed it', () => {
		const remote = page() as Record<string, unknown>;
		delete remote.tags;
		expect(mergeDocuments(page(), page(), remote).merged).not.toHaveProperty('tags');
	});
});

describe('mergeDocuments: both changed the same thing', () => {
	it('is no conflict when both made the same change', () => {
		const local = page();
		local.title = 'Welcome';
		const remote = page();
		remote.title = 'Welcome';
		expect(mergeDocuments(page(), local, remote)).toEqual({ merged: local, conflicts: [] });
	});

	it('keeps what was typed here and names the field when they differ', () => {
		const local = page();
		local.title = 'Mine';
		const remote = page();
		remote.title = 'Theirs';
		const result = mergeDocuments(page(), local, remote);
		expect(result.merged.title).toBe('Mine');
		expect(result.conflicts).toEqual(['title']);
	});

	it('names the field inside an object, and merges the object’s other fields', () => {
		const local = page();
		local.seo.title = 'Mine';
		const remote = page();
		remote.seo.title = 'Theirs';
		remote.seo.description = 'New description';
		const result = mergeDocuments(page(), local, remote);
		expect(result.merged.seo).toEqual({ title: 'Mine', description: 'New description' });
		expect(result.conflicts).toEqual(['seo.title']);
	});

	it('treats a list without keys as one value', () => {
		const local = page();
		local.tags = ['bakery', 'cafe'];
		const remote = page();
		remote.tags = ['bakery', 'bangsar'];
		const result = mergeDocuments(page(), local, remote);
		expect(result.merged.tags).toEqual(['bakery', 'cafe']);
		expect(result.conflicts).toEqual(['tags']);
	});
});

describe('mergeDocuments: blocks', () => {
	it('merges an edit to one block with an edit to another', () => {
		const local = page();
		local.blocks[1].heading = 'Your questions';
		const remote = page();
		remote.blocks[0].heading = 'Bread, baked at 5am';
		const result = mergeDocuments(page(), local, remote);
		expect(block(result, 'hero')?.heading).toBe('Bread, baked at 5am');
		expect(block(result, 'faq')?.heading).toBe('Your questions');
		expect(result.conflicts).toEqual([]);
	});

	it('merges two edits to different fields of the same block', () => {
		const local = page();
		local.blocks[0].intro = 'Since 2015';
		const remote = page();
		remote.blocks[0].heading = 'Bread, baked at 5am';
		const result = mergeDocuments(page(), local, remote);
		expect(block(result, 'hero')).toMatchObject({
			heading: 'Bread, baked at 5am',
			intro: 'Since 2015'
		});
		expect(result.conflicts).toEqual([]);
	});

	it('names the block and field when both changed the same one', () => {
		const local = page();
		local.blocks[0].heading = 'Mine';
		const remote = page();
		remote.blocks[0].heading = 'Theirs';
		const result = mergeDocuments(page(), local, remote);
		expect(block(result, 'hero')?.heading).toBe('Mine');
		expect(result.conflicts).toEqual(['blocks[_key=="hero"].heading']);
	});

	it('keeps a block added on each side, each where its side put it', () => {
		const local = page();
		local.blocks.splice(1, 0, { _key: 'mine', _type: 'stats', heading: 'Numbers' });
		const remote = page();
		remote.blocks.push({ _key: 'theirs', _type: 'gallery', heading: 'Photos' });
		const result = mergeDocuments(page(), local, remote);
		expect(keys(result.merged.blocks)).toEqual(['hero', 'mine', 'faq', 'cta', 'theirs']);
		expect(result.conflicts).toEqual([]);
	});

	it('removes a block the other side removed, when it wasn’t edited here', () => {
		const remote = page();
		remote.blocks.splice(1, 1);
		const local = page();
		local.blocks[0].heading = 'Mine';
		const result = mergeDocuments(page(), local, remote);
		expect(keys(result.merged.blocks)).toEqual(['hero', 'cta']);
		expect(block(result, 'hero')?.heading).toBe('Mine');
		expect(result.conflicts).toEqual([]);
	});

	it('removes a block removed here, when the other side didn’t edit it', () => {
		const local = page();
		local.blocks.splice(2, 1);
		const remote = page();
		remote.title = 'Welcome';
		const result = mergeDocuments(page(), local, remote);
		expect(keys(result.merged.blocks)).toEqual(['hero', 'faq']);
		expect(result.conflicts).toEqual([]);
	});

	it('keeps a block removed on one side but edited on the other, and says so', () => {
		const local = page();
		local.blocks[1].heading = 'Edited here';
		const remote = page();
		remote.blocks.splice(1, 1);
		const kept = mergeDocuments(page(), local, remote);
		expect(block(kept, 'faq')?.heading).toBe('Edited here');
		expect(kept.conflicts).toEqual(['blocks[_key=="faq"]']);

		const edited = page();
		edited.blocks[1].heading = 'Edited there';
		const removedHere = page();
		removedHere.blocks.splice(1, 1);
		const theirs = mergeDocuments(page(), removedHere, edited);
		expect(block(theirs, 'faq')?.heading).toBe('Edited there');
		expect(theirs.conflicts).toEqual(['blocks[_key=="faq"]']);
	});

	it('follows a reorder made on the other side, with this side’s edits', () => {
		const remote = page();
		remote.blocks.reverse();
		const local = page();
		local.blocks[0].heading = 'Mine';
		const result = mergeDocuments(page(), local, remote);
		expect(keys(result.merged.blocks)).toEqual(['cta', 'faq', 'hero']);
		expect(block(result, 'hero')?.heading).toBe('Mine');
	});

	it('keeps a reorder made here, and adds the other side’s new block after its neighbour', () => {
		const local = page();
		local.blocks = [local.blocks[2], local.blocks[0], local.blocks[1]];
		const remote = page();
		remote.blocks.splice(1, 0, { _key: 'theirs', _type: 'gallery', heading: 'Photos' });
		const result = mergeDocuments(page(), local, remote);
		expect(keys(result.merged.blocks)).toEqual(['cta', 'hero', 'theirs', 'faq']);
	});

	it('merges rich text by its blocks and their spans', () => {
		const text = () => [
			{
				_key: 'p1',
				_type: 'block',
				children: [{ _key: 's1', _type: 'span', text: 'Open daily.' }]
			},
			{ _key: 'p2', _type: 'block', children: [{ _key: 's2', _type: 'span', text: 'Cash only.' }] }
		];
		const local = { body: text() };
		local.body[0].children[0].text = 'Open every day.';
		const remote = { body: text() };
		remote.body[1].children[0].text = 'Cards welcome.';
		const result = mergeDocuments({ body: text() }, local, remote);
		expect(result.merged.body).toEqual([
			{
				_key: 'p1',
				_type: 'block',
				children: [{ _key: 's1', _type: 'span', text: 'Open every day.' }]
			},
			{
				_key: 'p2',
				_type: 'block',
				children: [{ _key: 's2', _type: 'span', text: 'Cards welcome.' }]
			}
		]);
		expect(result.conflicts).toEqual([]);
	});
});

describe('mergeDocuments: never changes its inputs', () => {
	it('leaves base, local and remote as they were', () => {
		const base = page();
		const local = page();
		local.blocks[0].heading = 'Mine';
		const remote = page();
		remote.blocks.push({ _key: 'new', _type: 'cta', heading: 'More' });
		const copies = JSON.stringify([base, local, remote]);
		mergeDocuments(base, local, remote);
		expect(JSON.stringify([base, local, remote])).toBe(copies);
	});
});

describe('sameValue', () => {
	it('ignores key order and missing versus undefined', () => {
		expect(sameValue({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true);
		expect(sameValue({ a: 1, b: undefined }, { a: 1 })).toBe(true);
		expect(sameValue([1, 2], [2, 1])).toBe(false);
	});
});

describe('replaceChanged', () => {
	it('is a new object, so what watches the document is told', () => {
		const current = page();
		expect(replaceChanged(current, page())).not.toBe(current);
	});

	it('keeps the very same value where nothing changed, and drops a field that went', () => {
		const current = page();
		const { tags: _tags, ...rest } = page();
		const next = replaceChanged(current, { ...rest, title: 'Welcome' });
		expect(next.title).toBe('Welcome');
		expect(next.blocks).toBe(current.blocks);
		expect(next).not.toHaveProperty('tags');
	});
});
