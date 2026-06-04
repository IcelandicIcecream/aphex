import { describe, it, expect } from 'vitest';
import {
	tiptapToPortableText,
	portableTextToTiptap,
	type PortableTextValue
} from '../../../packages/cms-core/src/lib/components/admin/fields/richtext/portable-text-serializer';

describe('Portable Text Serializer', () => {
	describe('tiptapToPortableText', () => {
		it('converts a simple paragraph', () => {
			const doc = {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'Hello world' }]
					}
				]
			};

			const result = tiptapToPortableText(doc);
			expect(result).toHaveLength(1);
			expect(result[0]._type).toBe('block');
			expect(result[0]).toHaveProperty('style', 'normal');
			const block = result[0] as any;
			expect(block.children).toHaveLength(1);
			expect(block.children[0]._type).toBe('span');
			expect(block.children[0].text).toBe('Hello world');
		});

		it('converts headings with correct style', () => {
			const doc = {
				type: 'doc',
				content: [
					{
						type: 'heading',
						attrs: { level: 2 },
						content: [{ type: 'text', text: 'Title' }]
					}
				]
			};

			const result = tiptapToPortableText(doc);
			expect(result[0]).toHaveProperty('style', 'h2');
		});

		it('converts bold/italic decorators', () => {
			const doc = {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{ type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
							{ type: 'text', text: ' and ' },
							{ type: 'text', text: 'italic', marks: [{ type: 'italic' }] }
						]
					}
				]
			};

			const result = tiptapToPortableText(doc);
			const block = result[0] as any;
			expect(block.children).toHaveLength(3);
			expect(block.children[0].marks).toContain('strong');
			expect(block.children[1].marks).toBeUndefined();
			expect(block.children[2].marks).toContain('em');
		});

		it('converts link marks to markDefs', () => {
			const doc = {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'click here',
								marks: [{ type: 'link', attrs: { href: 'https://example.com' } }]
							}
						]
					}
				]
			};

			const result = tiptapToPortableText(doc);
			const block = result[0] as any;
			expect(block.markDefs).toHaveLength(1);
			expect(block.markDefs[0]._type).toBe('link');
			expect(block.markDefs[0].href).toBe('https://example.com');
			expect(block.children[0].marks).toContain(block.markDefs[0]._key);
		});

		it('converts annotation marks to markDefs', () => {
			const doc = {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'footnote text',
								marks: [
									{
										type: 'annotation_footnote',
										attrs: { _key: 'fn1', data: { text: 'A note' } }
									}
								]
							}
						]
					}
				]
			};

			const result = tiptapToPortableText(doc);
			const block = result[0] as any;
			expect(block.markDefs).toHaveLength(1);
			expect(block.markDefs[0]._type).toBe('footnote');
			expect(block.markDefs[0]._key).toBe('fn1');
			expect(block.markDefs[0].text).toBe('A note');
		});

		it('converts bullet lists', () => {
			const doc = {
				type: 'doc',
				content: [
					{
						type: 'bulletList',
						content: [
							{
								type: 'listItem',
								content: [
									{
										type: 'paragraph',
										content: [{ type: 'text', text: 'Item 1' }]
									}
								]
							},
							{
								type: 'listItem',
								content: [
									{
										type: 'paragraph',
										content: [{ type: 'text', text: 'Item 2' }]
									}
								]
							}
						]
					}
				]
			};

			const result = tiptapToPortableText(doc);
			expect(result).toHaveLength(2);
			expect((result[0] as any).listItem).toBe('bullet');
			expect((result[0] as any).level).toBe(1);
			expect((result[1] as any).listItem).toBe('bullet');
		});

		it('converts custom block objects', () => {
			const doc = {
				type: 'doc',
				content: [
					{
						type: 'portableTextObject',
						attrs: {
							_type: 'image',
							_key: 'img1',
							data: { asset: { _ref: 'asset-123' } }
						}
					}
				]
			};

			const result = tiptapToPortableText(doc);
			expect(result).toHaveLength(1);
			expect(result[0]._type).toBe('image');
			expect(result[0]._key).toBe('img1');
			expect((result[0] as any).asset._ref).toBe('asset-123');
		});

		it('converts inline objects within block children', () => {
			const doc = {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{ type: 'text', text: 'See ' },
							{
								type: 'portableTextInlineObject',
								attrs: {
									_type: 'footnote',
									_key: 'fn1',
									data: { text: 'A footnote' }
								}
							},
							{ type: 'text', text: ' here.' }
						]
					}
				]
			};

			const result = tiptapToPortableText(doc);
			const block = result[0] as any;
			expect(block.children).toHaveLength(3);
			expect(block.children[0]._type).toBe('span');
			expect(block.children[0].text).toBe('See ');
			expect(block.children[1]._type).toBe('footnote');
			expect(block.children[1].text).toBe('A footnote');
			expect(block.children[2]._type).toBe('span');
			expect(block.children[2].text).toBe(' here.');
		});

		it('converts blockquotes', () => {
			const doc = {
				type: 'doc',
				content: [
					{
						type: 'blockquote',
						content: [
							{
								type: 'paragraph',
								content: [{ type: 'text', text: 'A quote' }]
							}
						]
					}
				]
			};

			const result = tiptapToPortableText(doc);
			expect(result[0]).toHaveProperty('style', 'blockquote');
		});

		it('converts hard breaks to newline spans', () => {
			const doc = {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{ type: 'text', text: 'Line 1' },
							{ type: 'hardBreak' },
							{ type: 'text', text: 'Line 2' }
						]
					}
				]
			};

			const result = tiptapToPortableText(doc);
			const block = result[0] as any;
			expect(block.children).toHaveLength(3);
			expect(block.children[1].text).toBe('\n');
		});

		it('produces empty span for empty paragraphs', () => {
			const doc = { type: 'doc', content: [{ type: 'paragraph' }] };
			const result = tiptapToPortableText(doc);
			const block = result[0] as any;
			expect(block.children).toHaveLength(1);
			expect(block.children[0].text).toBe('');
		});

		it('returns empty array for empty doc', () => {
			const doc = { type: 'doc' };
			expect(tiptapToPortableText(doc)).toEqual([]);
		});
	});

	describe('portableTextToTiptap', () => {
		it('converts a simple block to paragraph', () => {
			const pt: PortableTextValue = [
				{
					_type: 'block',
					_key: 'b1',
					style: 'normal',
					children: [{ _type: 'span', _key: 's1', text: 'Hello' }]
				}
			];

			const doc = portableTextToTiptap(pt);
			expect(doc.type).toBe('doc');
			expect(doc.content).toHaveLength(1);
			expect(doc.content![0].type).toBe('paragraph');
			expect(doc.content![0].content![0].text).toBe('Hello');
		});

		it('converts heading blocks', () => {
			const pt: PortableTextValue = [
				{
					_type: 'block',
					_key: 'b1',
					style: 'h3',
					children: [{ _type: 'span', _key: 's1', text: 'Title' }]
				}
			];

			const doc = portableTextToTiptap(pt);
			expect(doc.content![0].type).toBe('heading');
			expect(doc.content![0].attrs?.level).toBe(3);
		});

		it('converts blockquote blocks', () => {
			const pt: PortableTextValue = [
				{
					_type: 'block',
					_key: 'b1',
					style: 'blockquote',
					children: [{ _type: 'span', _key: 's1', text: 'A quote' }]
				}
			];

			const doc = portableTextToTiptap(pt);
			expect(doc.content![0].type).toBe('blockquote');
		});

		it('converts decorator marks on spans', () => {
			const pt: PortableTextValue = [
				{
					_type: 'block',
					_key: 'b1',
					style: 'normal',
					children: [{ _type: 'span', _key: 's1', text: 'bold', marks: ['strong'] }]
				}
			];

			const doc = portableTextToTiptap(pt);
			const textNode = doc.content![0].content![0];
			expect(textNode.marks).toHaveLength(1);
			expect(textNode.marks![0]).toEqual({ type: 'bold' });
		});

		it('converts link markDefs', () => {
			const pt: PortableTextValue = [
				{
					_type: 'block',
					_key: 'b1',
					style: 'normal',
					children: [{ _type: 'span', _key: 's1', text: 'click', marks: ['lk1'] }],
					markDefs: [{ _type: 'link', _key: 'lk1', href: 'https://example.com' }]
				}
			];

			const doc = portableTextToTiptap(pt);
			const textNode = doc.content![0].content![0];
			expect(textNode.marks).toHaveLength(1);
			expect(textNode.marks![0].type).toBe('link');
			expect(textNode.marks![0].attrs?.href).toBe('https://example.com');
		});

		it('converts annotation markDefs', () => {
			const pt: PortableTextValue = [
				{
					_type: 'block',
					_key: 'b1',
					style: 'normal',
					children: [{ _type: 'span', _key: 's1', text: 'annotated', marks: ['a1'] }],
					markDefs: [{ _type: 'footnote', _key: 'a1', text: 'Note text' }]
				}
			];

			const doc = portableTextToTiptap(pt);
			const textNode = doc.content![0].content![0];
			expect(textNode.marks).toHaveLength(1);
			expect(textNode.marks![0].type).toBe('annotation_footnote');
			expect(textNode.marks![0].attrs?._key).toBe('a1');
			expect(textNode.marks![0].attrs?.data?.text).toBe('Note text');
		});

		it('converts custom blocks to portableTextObject', () => {
			const pt: PortableTextValue = [
				{
					_type: 'image',
					_key: 'img1',
					asset: { _ref: 'asset-123' }
				}
			];

			const doc = portableTextToTiptap(pt);
			expect(doc.content![0].type).toBe('portableTextObject');
			expect(doc.content![0].attrs?._type).toBe('image');
			expect(doc.content![0].attrs?.data?.asset?._ref).toBe('asset-123');
		});

		it('converts inline objects in block children', () => {
			const pt: PortableTextValue = [
				{
					_type: 'block',
					_key: 'b1',
					style: 'normal',
					children: [
						{ _type: 'span', _key: 's1', text: 'See ' },
						{ _type: 'footnote', _key: 'fn1', text: 'A note' },
						{ _type: 'span', _key: 's2', text: ' here.' }
					]
				}
			];

			const doc = portableTextToTiptap(pt);
			const paragraph = doc.content![0];
			expect(paragraph.content).toHaveLength(3);
			expect(paragraph.content![0].type).toBe('text');
			expect(paragraph.content![0].text).toBe('See ');
			expect(paragraph.content![1].type).toBe('portableTextInlineObject');
			expect(paragraph.content![1].attrs?._type).toBe('footnote');
			expect(paragraph.content![1].attrs?.data?.text).toBe('A note');
			expect(paragraph.content![2].type).toBe('text');
		});

		it('converts list blocks', () => {
			const pt: PortableTextValue = [
				{
					_type: 'block',
					_key: 'b1',
					style: 'normal',
					listItem: 'bullet',
					level: 1,
					children: [{ _type: 'span', _key: 's1', text: 'Item 1' }]
				},
				{
					_type: 'block',
					_key: 'b2',
					style: 'normal',
					listItem: 'bullet',
					level: 1,
					children: [{ _type: 'span', _key: 's2', text: 'Item 2' }]
				}
			];

			const doc = portableTextToTiptap(pt);
			expect(doc.content![0].type).toBe('bulletList');
			expect(doc.content![0].content).toHaveLength(2);
		});

		it('returns empty paragraph for null/empty input', () => {
			const doc = portableTextToTiptap([]);
			expect(doc.content).toHaveLength(1);
			expect(doc.content![0].type).toBe('paragraph');
		});
	});

	describe('round-trip', () => {
		it('round-trips a complex document', () => {
			const original: PortableTextValue = [
				{
					_type: 'block',
					_key: 'b1',
					style: 'h1',
					children: [{ _type: 'span', _key: 's1', text: 'Welcome' }]
				},
				{
					_type: 'block',
					_key: 'b2',
					style: 'normal',
					children: [
						{ _type: 'span', _key: 's2', text: 'This is ' },
						{ _type: 'span', _key: 's3', text: 'bold', marks: ['strong'] },
						{ _type: 'span', _key: 's4', text: ' text with a ' },
						{ _type: 'span', _key: 's5', text: 'link', marks: ['lk1'] }
					],
					markDefs: [{ _type: 'link', _key: 'lk1', href: 'https://example.com' }]
				},
				{
					_type: 'image',
					_key: 'img1',
					asset: { _ref: 'asset-abc', _type: 'reference' }
				},
				{
					_type: 'block',
					_key: 'b3',
					style: 'normal',
					children: [
						{ _type: 'span', _key: 's6', text: 'See note ' },
						{ _type: 'footnote', _key: 'fn1', text: 'Important' },
						{ _type: 'span', _key: 's7', text: ' here.' }
					]
				}
			];

			const tiptap = portableTextToTiptap(original);
			const result = tiptapToPortableText(tiptap);

			// Verify structure (keys will differ due to regeneration)
			expect(result).toHaveLength(4);
			expect(result[0]._type).toBe('block');
			expect((result[0] as any).style).toBe('h1');

			expect(result[1]._type).toBe('block');
			const block2 = result[1] as any;
			expect(block2.children).toHaveLength(4);
			expect(block2.children[1].marks).toContain('strong');
			expect(block2.markDefs).toHaveLength(1);
			expect(block2.markDefs[0]._type).toBe('link');
			expect(block2.markDefs[0].href).toBe('https://example.com');

			expect(result[2]._type).toBe('image');
			expect((result[2] as any).asset._ref).toBe('asset-abc');

			expect(result[3]._type).toBe('block');
			const block4 = result[3] as any;
			expect(block4.children).toHaveLength(3);
			expect(block4.children[0]._type).toBe('span');
			expect(block4.children[1]._type).toBe('footnote');
			expect(block4.children[1].text).toBe('Important');
			expect(block4.children[2]._type).toBe('span');
		});
	});
});
