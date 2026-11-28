import { describe, expect, it } from 'vitest';
import { stegaDecode, stegaEncodeDocument } from '../src/lib/preview/stega';
import type { Field, SchemaType } from '../src/lib/types/schemas';

/**
 * What the editor marks for click-to-edit before sending a document to the
 * preview: text, with the way down to it, and nothing a renderer compares or
 * uses as a value.
 */
const column: SchemaType = {
	type: 'object',
	name: 'column',
	title: 'Column',
	fields: [
		{ name: 'heading', type: 'string', title: 'Heading' },
		{
			name: 'align',
			type: 'string',
			title: 'Align',
			list: [
				{ title: 'Left', value: 'start' },
				{ title: 'Centre', value: 'center' }
			]
		},
		{ name: 'colour', type: 'string', title: 'Colour', stega: false },
		{
			name: 'style',
			type: 'object',
			title: 'Style',
			stega: false,
			fields: [{ name: 'css', type: 'text', title: 'CSS' }]
		},
		{ name: 'body', type: 'array', title: 'Body', of: [{ type: 'block' }] }
	]
};

const section: SchemaType = {
	type: 'object',
	name: 'section',
	title: 'Section',
	fields: [{ name: 'columns', type: 'array', title: 'Columns', of: [{ type: 'column' }] }]
};

const fields: Field[] = [
	{ name: 'blocks', type: 'array', title: 'Blocks', of: [{ type: 'section' }] }
];

const doc = {
	blocks: [
		{ _type: 'section', _key: 'a' },
		{
			_type: 'section',
			_key: 'b',
			columns: [
				{
					_type: 'column',
					_key: 'c',
					heading: 'Hello',
					align: 'center',
					colour: '#e11d48',
					style: { css: 'padding: 2rem;' },
					body: [{ _type: 'block', _key: 'p', children: [{ _type: 'span', text: 'Body text' }] }]
				}
			]
		}
	]
};

const encoded = stegaEncodeDocument(doc, fields, [column, section]) as typeof doc;
const col = (encoded.blocks[1] as unknown as { columns: Record<string, any>[] }).columns[0]!;

describe('stegaEncodeDocument', () => {
	it('marks nested text with the path down to it', () => {
		expect(stegaDecode(col.heading)).toEqual({
			field: 'blocks',
			objectPath: '[1].columns[0].heading',
			arrayIndex: 1
		});
	});

	it('leaves a value from a list alone, since renderers compare it', () => {
		expect(col.align).toBe('center');
	});

	it('leaves fields marked `stega: false` alone, with everything inside them', () => {
		expect(col.colour).toBe('#e11d48');
		expect(col.style.css).toBe('padding: 2rem;');
	});

	it('gives rich text nested in an object the path to its body', () => {
		const span = col.body[0].children[0].text as string;
		expect(stegaDecode(span)).toEqual({
			field: 'blocks',
			blockIndex: 0,
			arrayIndex: 1,
			objectPath: '[1].columns[0].body'
		});
	});
});
