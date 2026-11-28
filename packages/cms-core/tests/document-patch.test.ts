import { describe, expect, it } from 'vitest';
import { applyPatch, parsePath, PatchError } from '../src/lib/local-api/patch';

const page = () => ({
	title: 'Home',
	blocks: [
		{ _type: 'hero', _key: 'h1', heading: 'Hello', links: [{ _key: 'l1', label: 'Go' }] },
		{
			_type: 'richText',
			_key: 'r1',
			content: [
				{
					_type: 'block',
					_key: 'p1',
					style: 'normal',
					markDefs: [],
					children: [
						{ _type: 'span', _key: 's1', text: 'We bake every morning ', marks: [] },
						{ _type: 'span', _key: 's2', text: 'from 6am', marks: ['strong'] }
					]
				}
			]
		},
		{ _type: 'cta', _key: 'c1', heading: 'Visit us' }
	]
});

describe('parsePath', () => {
	it('reads fields, keys and indexes', () => {
		expect(parsePath('blocks[_key=="h1"].links[0].label')).toEqual([
			{ field: 'blocks' },
			{ key: 'h1' },
			{ field: 'links' },
			{ index: 0 },
			{ field: 'label' }
		]);
		expect(parsePath("blocks[_key='h1']")).toEqual([{ field: 'blocks' }, { key: 'h1' }]);
	});

	it('refuses what it can’t read', () => {
		for (const bad of [
			'',
			'blocks.',
			'blocks[h1]',
			'.title',
			'a..b',
			'blocks[_key=="h1"]heading'
		]) {
			expect(() => parsePath(bad), bad).toThrow();
		}
	});
});

describe('applyPatch', () => {
	it('sets one field deep in a list, and reports only the top-level field it changed', () => {
		const before = page();
		const { data, fields } = applyPatch(before, [
			{ op: 'set', path: 'blocks[_key=="h1"].heading', value: 'Fresh bread' }
		]);
		expect((data.blocks as { heading?: string }[])[0].heading).toBe('Fresh bread');
		expect(fields).toEqual(['blocks']);
		expect(before.blocks[0].heading).toBe('Hello');
	});

	it('makes missing objects on the way to a field, but never invents list items', () => {
		const { data } = applyPatch({}, [{ op: 'set', path: 'seo.metaTitle', value: 'Bakery' }]);
		expect(data).toEqual({ seo: { metaTitle: 'Bakery' } });
		expect(() =>
			applyPatch(page(), [{ op: 'set', path: 'blocks[_key=="nope"].heading', value: 'x' }])
		).toThrow(/No item with _key "nope"/);
	});

	it('unsets a field or removes an item', () => {
		const { data } = applyPatch(page(), [
			{ op: 'unset', path: 'title' },
			{ op: 'unset', path: 'blocks[_key=="c1"]' }
		]);
		expect('title' in data).toBe(false);
		expect((data.blocks as unknown[]).length).toBe(2);
	});

	it('inserts beside an item or at either end, giving new items keys', () => {
		const { data } = applyPatch(page(), [
			{ op: 'insert', path: 'blocks[_key=="h1"]', position: 'after', items: [{ _type: 'faq' }] },
			{ op: 'insert', path: 'blocks', position: 'end', items: [{ _type: 'contact', _key: 'ct' }] },
			{ op: 'insert', path: 'tags', position: 'start', items: ['new'] }
		]);
		const blocks = data.blocks as { _type: string; _key: string }[];
		expect(blocks.map((b) => b._type)).toEqual(['hero', 'faq', 'richText', 'cta', 'contact']);
		expect(blocks[1]._key).toMatch(/^[a-z0-9]+$/);
		expect(data.tags).toEqual(['new']);
		expect(() =>
			applyPatch(page(), [
				{ op: 'insert', path: 'blocks', position: 'end', items: [{ _key: 'h1' }] }
			])
		).toThrow(/already in this list/);
		expect(() =>
			applyPatch(page(), [{ op: 'insert', path: 'blocks', position: 'after', items: [{}] }])
		).toThrow(/item’s path/);
	});

	it('moves an item before or after another', () => {
		const { data } = applyPatch(page(), [
			{ op: 'move', path: 'blocks[_key=="c1"]', position: 'before', target: 'blocks[_key=="h1"]' }
		]);
		expect((data.blocks as { _key: string }[]).map((b) => b._key)).toEqual(['c1', 'h1', 'r1']);
	});

	it('replaces text inside rich text without touching the marks around it', () => {
		const { data } = applyPatch(page(), [
			{
				op: 'replaceText',
				path: 'blocks[_key=="r1"].content',
				find: 'from 6am',
				replace: 'from 7am'
			}
		]);
		const block = (
			data.blocks as { content?: { children: { text: string; marks: string[] }[] }[] }[]
		)[1].content![0];
		expect(block.children[1]).toMatchObject({ text: 'from 7am', marks: ['strong'] });
		expect(block.children[0].text).toBe('We bake every morning ');
	});

	it('refuses text it can’t find once, and replacement text is taken literally', () => {
		expect(() =>
			applyPatch(page(), [
				{ op: 'replaceText', path: 'blocks', find: 'morning from', replace: 'x' }
			])
		).toThrow(/crosses bold/);
		expect(() =>
			applyPatch({ a: 'one one' }, [{ op: 'replaceText', path: 'a', find: 'one', replace: 'x' }])
		).toThrow(/2 times/);
		expect(
			applyPatch({ a: 'cost' }, [
				{ op: 'replaceText', path: 'a', find: 'cost', replace: '$& more' }
			]).data.a
		).toBe('$& more');
	});

	it('is all or none, and says which operation failed', () => {
		const before = page();
		let error: unknown;
		try {
			applyPatch(before, [
				{ op: 'set', path: 'title', value: 'Changed' },
				{ op: 'unset', path: 'blocks[_key=="missing"]' }
			]);
		} catch (caught) {
			error = caught;
		}
		expect(error).toBeInstanceOf(PatchError);
		expect(String(error)).toMatch(/^PatchError: Operation 2:/);
		expect(before.title).toBe('Home');
	});

	it('refuses a key two items share, rather than guessing which', () => {
		const twins = {
			blocks: [
				{ _key: 'a', heading: 'One' },
				{ _key: 'a', heading: 'Two' }
			]
		};
		expect(() =>
			applyPatch(twins, [{ op: 'set', path: 'blocks[_key=="a"].heading', value: 'x' }])
		).toThrow(/2 items in blocks share _key "a" \(at 0, 1\)/);
		const { data } = applyPatch(twins, [{ op: 'set', path: 'blocks[1]._key', value: 'b' }]);
		expect((data.blocks as { _key: string }[]).map((b) => b._key)).toEqual(['a', 'b']);
	});

	it('a replaced list item keeps its key and can’t take a neighbour’s', () => {
		const { data } = applyPatch(page(), [
			{ op: 'set', path: 'blocks[_key=="c1"]', value: { _type: 'cta', heading: 'New' } }
		]);
		expect((data.blocks as { _key: string }[])[2]._key).toBe('c1');
		expect(() =>
			applyPatch(page(), [{ op: 'set', path: 'blocks[_key=="c1"]', value: { _key: 'h1' } }])
		).toThrow(/already in this list/);
		expect(() =>
			applyPatch(page(), [{ op: 'set', path: 'blocks[_key=="c1"]._key', value: 'h1' }])
		).toThrow(/already in this list/);
	});

	it('never touches the document’s own columns', () => {
		for (const path of ['id', '_meta.revision', 'type']) {
			expect(() => applyPatch(page(), [{ op: 'set', path, value: 1 }]), path).toThrow(
				/isn't a field/
			);
		}
	});
});
