import { describe, expect, it } from 'vitest';
import { collectStrongReferenceIds } from './reference-walk';
import type { SchemaType } from '../types/schemas';

const ref = (id: string) => ({ _type: 'reference', _ref: id });

const link: SchemaType = {
	type: 'object',
	name: 'link',
	title: 'Link',
	fields: [
		{ name: 'page', type: 'reference', title: 'Page', to: [{ type: 'page' }], weak: true },
		{ name: 'booking', type: 'reference', title: 'Booking', to: [{ type: 'bookingLink' }] }
	]
} as SchemaType;

const page: SchemaType = {
	type: 'document',
	name: 'page',
	title: 'Page',
	fields: [
		{ name: 'author', type: 'reference', title: 'Author', to: [{ type: 'person' }] },
		{ name: 'cta', type: 'link', title: 'Button' },
		{
			name: 'blocks',
			type: 'array',
			title: 'Blocks',
			of: [
				{
					type: 'hero',
					name: 'hero',
					fields: [{ name: 'links', type: 'array', title: 'Links', of: [{ type: 'link' }] }]
				},
				{ type: 'reference', to: [{ type: 'post' }], weak: true }
			]
		},
		{
			name: 'related',
			type: 'array',
			title: 'Related',
			of: [{ type: 'reference', to: [{ type: 'page' }] }]
		},
		{
			name: 'body',
			type: 'array',
			title: 'Body',
			of: [
				{
					type: 'block',
					marks: {
						annotations: [
							{
								name: 'internalLink',
								fields: [
									{
										name: 'page',
										type: 'reference',
										title: 'Page',
										to: [{ type: 'page' }],
										weak: true
									}
								]
							}
						]
					}
				}
			]
		}
	]
} as SchemaType;

describe('collectStrongReferenceIds', () => {
	it('leaves out weak references, wherever they sit, and keeps strong ones', () => {
		const data = {
			author: ref('person'),
			cta: { page: ref('a'), booking: ref('booking') },
			blocks: [
				{ _type: 'hero', _key: 'h', links: [{ _key: 'l', page: ref('b') }] },
				{ _key: 'p', ...ref('post') }
			],
			related: [{ _key: 'r', ...ref('c') }],
			body: [
				{
					_type: 'block',
					_key: 'k',
					markDefs: [{ _type: 'internalLink', _key: 'm', page: ref('d') }],
					children: [{ _type: 'span', _key: 's', text: 'hi', marks: ['m'] }]
				}
			]
		};
		expect(collectStrongReferenceIds(data, page, [link]).sort()).toEqual([
			'booking',
			'c',
			'person'
		]);
	});

	it('counts a reference the schema says nothing about as strong', () => {
		expect(
			collectStrongReferenceIds({ unknown: ref('x'), cta: { other: ref('y') } }, page, [
				link
			]).sort()
		).toEqual(['x', 'y']);
		expect(collectStrongReferenceIds({ cta: { page: ref('a') } }, null)).toEqual(['a']);
	});
});
