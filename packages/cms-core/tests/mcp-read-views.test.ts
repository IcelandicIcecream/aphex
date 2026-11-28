import { describe, expect, it } from 'vitest';
import { schemaOutline, SUMMARIZE_OVER } from '../src/lib/mcp/schema-outline';
import { skim, viewDocument } from '../src/lib/mcp/document-view';
import type { Field, SchemaType } from '../src/lib/types/schemas';

const link: Field = {
	name: 'links',
	type: 'array',
	title: 'Buttons',
	of: [
		{
			type: 'object',
			name: 'linkItem',
			fields: [
				{ name: 'label', type: 'string', title: 'Label', description: 'The text people click.' },
				{ name: 'page', type: 'reference', title: 'Page', to: [{ type: 'page' }] }
			]
		}
	]
};

const block = (type: string, extra: Field[] = []) => ({
	type,
	title: type,
	description: `The ${type} block.`,
	fields: [
		{
			name: 'variant',
			type: 'string',
			title: 'Layout',
			list: [
				{ title: 'Banner', value: 'banner' },
				{ title: 'Text and image', value: 'split' }
			]
		},
		{ name: 'heading', type: 'string', title: 'Heading', validation: (rule) => rule.required() },
		{ name: 'image', type: 'image', title: 'Image' },
		link,
		...extra
	] satisfies Field[]
});

const page = (count: number): SchemaType => ({
	type: 'document',
	name: 'page',
	title: 'Page',
	fields: [
		{ name: 'title', type: 'string', title: 'Title' },
		{
			name: 'blocks',
			type: 'array',
			title: 'Blocks',
			of: Array.from({ length: count }, (_, i) => block(i === 0 ? 'hero' : `block${i}`))
		}
	]
});

describe('schemaOutline', () => {
	it('declares a repeated object once, inlines list values, and keeps what a field means', () => {
		const { types, values } = schemaOutline(page(2), []);
		expect(types.match(/^type LinkItem = /gm)).toHaveLength(1);
		expect(types).toContain("variant?: 'banner' | 'split' // split = Text and image");
		expect(types).toContain('heading: string');
		expect(types).toContain('label?: string // The text people click');
		expect(types).toContain('page?: Ref<page>');
		expect(types).toContain('// The hero block\ntype Hero = {');
		expect(Object.keys(values).sort()).toEqual(['Image', 'Ref']);
	});

	it('lists a long page builder’s blocks when summarizing, and outlines only those asked for', () => {
		const schema = page(SUMMARIZE_OVER + 1);
		const summary = schemaOutline(schema, [], { summarize: true });
		expect(summary.types).toContain('blocks?: Block[]');
		expect(summary.types).toContain('//   hero: The hero block');
		expect(summary.types).not.toContain('type Hero');

		const one = schemaOutline(schema, [], { only: ['hero'], summarize: true });
		expect(one.types).toContain('type Hero = {');
		expect(one.types).not.toContain('type Block1 =');
		expect(one.types).toContain('also: block1');
		expect(schemaOutline(schema, [], { only: ['nope'] }).unknown).toEqual(['nope']);
	});

	it('names a type that contains itself rather than recursing forever', () => {
		const group: SchemaType = {
			type: 'object',
			name: 'group',
			title: 'Group',
			fields: [
				{ name: 'parts', type: 'array', title: 'Parts', of: [{ type: 'group' }, { type: 'text' }] }
			]
		};
		const doc: SchemaType = {
			type: 'document',
			name: 'layout',
			title: 'Layout',
			fields: [{ name: 'root', type: 'array', title: 'Root', of: [{ type: 'group' }] }]
		};
		expect(schemaOutline(doc, [group, doc]).types).toContain('parts?: (Group | string)[]');
	});
});

describe('viewDocument', () => {
	const doc = {
		id: 'd1',
		title: 'Home',
		blocks: [
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
							{ _type: 'span', _key: 's1', text: 'Fresh bread ', marks: [] },
							{ _type: 'span', _key: 's2', text: 'every morning', marks: ['strong'] }
						]
					}
				]
			},
			{
				_type: 'hero',
				_key: 'h1',
				heading: 'x'.repeat(200),
				image: { _type: 'image', asset: { _type: 'reference', _ref: 'a1' }, crop: { top: 0 } }
			}
		],
		_meta: {
			type: 'page',
			status: 'draft',
			revision: 4,
			organizationId: 'org',
			createdBy: 'u',
			publishedHash: 'h'
		}
	};

	it('keeps only the meta an agent acts on', () => {
		expect(viewDocument(doc)._meta).toEqual({ type: 'page', status: 'draft', revision: 4 });
	});

	it('keeps whether a live document has edits the site doesn’t show yet', () => {
		const live = {
			...doc,
			_meta: { ...doc._meta, status: 'published', hasUnpublishedChanges: true }
		};
		expect(viewDocument(live, { skim: true })._meta).toEqual({
			type: 'page',
			status: 'published',
			hasUnpublishedChanges: true,
			revision: 4
		});
	});

	it('picks fields, or one value by path', () => {
		expect(Object.keys(viewDocument(doc, { fields: ['title'] }))).toEqual(['id', '_meta', 'title']);
		expect(viewDocument(doc, { path: 'blocks[_key=="h1"].heading' }).value).toBe('x'.repeat(200));
		expect(() => viewDocument(doc, { path: 'blocks[_key=="gone"]' })).toThrow(/No item/);
	});

	it('skims to an index: each item’s key, type and label, lists two deep', () => {
		const view = viewDocument(doc, { skim: true });
		expect(view.title).toBe('Home');
		expect(view.blocks).toEqual([
			{
				_key: 'r1',
				_type: 'richText',
				_skim: '',
				content: [{ _key: 'p1', _type: 'block', _skim: 'Fresh bread every morning' }]
			},
			{ _key: 'h1', _type: 'hero', _skim: `${'x'.repeat(59)}…` }
		]);
	});
});
