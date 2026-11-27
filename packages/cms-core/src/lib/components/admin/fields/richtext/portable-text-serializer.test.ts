import { describe, expect, it } from 'vitest';
import { portableTextToTiptap, tiptapToPortableText } from './portable-text-serializer';

const linked = [
	{
		_type: 'block',
		_key: 'b1',
		style: 'normal',
		markDefs: [{ _type: 'link', _key: 'm1', linkType: 'page', page: { _ref: 'p1' } }],
		children: [{ _type: 'span', _key: 's1', text: 'Our menu', marks: ['m1'] }]
	}
];

describe('a link mark on load', () => {
	it('is the built-in link when the schema has no link annotation', () => {
		const text = portableTextToTiptap(linked).content![0]!.content![0]!;
		expect(text.marks).toEqual([{ type: 'link', attrs: { href: undefined } }]);
	});

	it("keeps every field when the schema's own annotation is called link", () => {
		const doc = portableTextToTiptap(linked, { annotations: ['link'] });
		const text = doc.content![0]!.content![0]!;
		expect(text.marks).toEqual([
			{
				type: 'annotation_link',
				attrs: { _key: 'm1', data: { linkType: 'page', page: { _ref: 'p1' } } }
			}
		]);
		const [block] = tiptapToPortableText(doc) as any[];
		expect(block.markDefs).toEqual([
			{ _type: 'link', _key: 'm1', linkType: 'page', page: { _ref: 'p1' } }
		]);
	});
});
