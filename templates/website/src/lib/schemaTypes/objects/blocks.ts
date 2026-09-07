import type { TypeReference } from '@aphexcms/cms-core';
import { LayoutGrid, Megaphone, Image as ImageIcon, Rows3, ClipboardList } from '@lucide/svelte';
import { linkGroupField, linkFields } from '../fields/link.js';

/**
 * The page-builder blocks — the entries in a `page`'s `layout` array.
 *
 * Each is a `TypeReference` with inline `fields`, which is how Aphex declares an
 * anonymous object type usable inside an array. Every one has a matching Svelte
 * component under `$lib/blocks/`, wired up in `RenderBlocks.svelte`. Add a block
 * by adding it here and adding one `{:else if}` arm there.
 *
 * `preview` decides what the collapsed row shows in the editor. Without it every
 * row reads "Call to Action" and a page of eight blocks is unnavigable.
 */

/** Call to action — a pitch and up to two buttons. */
export const callToAction: TypeReference = {
	type: 'cta',
	title: 'Call to Action',
	icon: Megaphone,
	fields: [
		{
			name: 'richText',
			type: 'array',
			title: 'Content',
			of: [{ type: 'block' }]
		},
		linkGroupField({ appearances: true })
	],
	preview: { title: 'Call to Action', select: { subtitle: 'links.0.label' } }
};

/**
 * Content — one to four columns of rich text, each with its own width.
 *
 * Payload's version stores `size` as `oneThird | half | twoThirds | full`; the
 * renderer maps those onto a 12-column grid, so `half` + `half` sit side by side
 * and a `full` clears the row.
 */
export const contentBlock: TypeReference = {
	type: 'content',
	title: 'Content',
	icon: LayoutGrid,
	fields: [
		{
			name: 'columns',
			type: 'array',
			title: 'Columns',
			of: [
				{
					type: 'object',
					name: 'column',
					title: 'Column',
					fields: [
						{
							name: 'size',
							type: 'string',
							title: 'Width',
							initialValue: 'oneThird',
							list: [
								{ title: 'One third', value: 'oneThird' },
								{ title: 'Half', value: 'half' },
								{ title: 'Two thirds', value: 'twoThirds' },
								{ title: 'Full', value: 'full' }
							],
							options: { layout: 'dropdown' }
						},
						{
							name: 'richText',
							type: 'array',
							title: 'Content',
							of: [{ type: 'block' }]
						},
						{
							name: 'enableLink',
							type: 'boolean',
							title: 'Add a link'
						},
						// `enabledBy` hides every link control until the box is ticked, so
						// the checkbox does something in the editor rather than only being
						// read by the renderer.
						...linkFields({ appearances: true, enabledBy: 'enableLink' })
					],
					/**
					 * The row label an editor reads in the collapsed list.
					 *
					 * `select` takes dot-paths into the item's data, and Portable Text is
					 * just nested arrays and objects — so the first block's first span
					 * reaches the column's own heading. That's the only thing that tells
					 * three columns apart; the width is secondary, so it goes in the
					 * subtitle, spelled out rather than shown as the raw `oneThird`.
					 */
					preview: {
						select: {
							heading: 'richText.0.children.0.text',
							label: 'label',
							size: 'size'
						},
						prepare: ({ heading, label, size }) => ({
							title: (heading as string) || (label as string) || 'Column',
							subtitle:
								{
									oneThird: 'One third',
									half: 'Half',
									twoThirds: 'Two thirds',
									full: 'Full width'
								}[size as string] ?? (size as string)
						})
					}
				}
			]
		}
	],
	preview: { title: 'Content' }
};

/** Media — one full-width image with an optional caption. */
export const mediaBlock: TypeReference = {
	type: 'mediaBlock',
	title: 'Media',
	icon: ImageIcon,
	fields: [
		{
			name: 'media',
			type: 'image',
			title: 'Media',
			validation: (Rule) => Rule.required()
		},
		{ name: 'caption', type: 'string', title: 'Caption' }
	],
	preview: { title: 'Media', select: { subtitle: 'caption', media: 'media' } }
};

/**
 * Archive — a list of posts, either queried or hand-picked.
 *
 * `populateBy: 'collection'` runs a query (optionally narrowed to categories);
 * `'selection'` renders exactly the documents chosen. The query runs server-side
 * in the page load, not in the component — see `loadArchiveBlocks()` in
 * `$lib/server/archive.ts`.
 */
export const archiveBlock: TypeReference = {
	type: 'archive',
	title: 'Archive',
	icon: Rows3,
	fields: [
		{
			name: 'introContent',
			type: 'array',
			title: 'Intro content',
			of: [{ type: 'block' }]
		},
		{
			name: 'populateBy',
			type: 'string',
			title: 'Populate by',
			initialValue: 'collection',
			list: [
				{ title: 'Collection', value: 'collection' },
				{ title: 'Individual selection', value: 'selection' }
			],
			options: { layout: 'tabs' }
		},
		{
			name: 'categories',
			type: 'array',
			title: 'Categories to show',
			description: 'Leave empty for all posts.',
			of: [{ type: 'reference', to: [{ type: 'category' }] }],
			hidden: ({ siblingData }) => siblingData.populateBy !== 'collection'
		},
		{
			name: 'limit',
			type: 'number',
			title: 'Limit',
			initialValue: 10,
			hidden: ({ siblingData }) => siblingData.populateBy !== 'collection',
			min: 1,
			max: 50,
			step: 1
		},
		{
			name: 'selectedDocs',
			type: 'array',
			title: 'Selection',
			of: [{ type: 'reference', to: [{ type: 'post' }] }],
			hidden: ({ siblingData }) => siblingData.populateBy !== 'selection'
		}
	],
	preview: { title: 'Archive', select: { subtitle: 'populateBy' } }
};

/**
 * Form — embeds a form built in the studio.
 *
 * The form itself is a `form` document contributed by `@aphexcms/plugin-forms`;
 * this block only says which one to show and whether to repeat its title. That
 * separation is why one form can appear on several pages without being rebuilt.
 */
export const formBlock: TypeReference = {
	type: 'formBlock',
	title: 'Form',
	icon: ClipboardList,
	fields: [
		{
			name: 'form',
			type: 'reference',
			title: 'Form',
			to: [{ type: 'form' }],
			validation: (Rule) => Rule.required()
		},
		{
			name: 'introContent',
			type: 'array',
			title: 'Intro content',
			description: 'Shown above the form.',
			of: [{ type: 'block' }]
		}
	],
	preview: { title: 'Form' }
};

/**
 * Blocks that live *inside* rich text (a post's body), as siblings of `block`
 * in the field's `of` array. They render between paragraphs, not in the text
 * flow.
 */

/** Banner — a toned callout inside a post. */
export const banner: TypeReference = {
	type: 'banner',
	title: 'Banner',
	fields: [
		{
			name: 'style',
			type: 'string',
			title: 'Style',
			initialValue: 'info',
			list: [
				{ title: 'Info', value: 'info' },
				{ title: 'Warning', value: 'warning' },
				{ title: 'Error', value: 'error' },
				{ title: 'Success', value: 'success' }
			],
			options: { layout: 'dropdown' }
		},
		{
			name: 'content',
			type: 'text',
			title: 'Content',
			rows: 3,
			validation: (Rule) => Rule.required()
		}
	],
	preview: { select: { title: 'style', subtitle: 'content' } }
};

/** Code — a language label and a code body. */
export const codeBlock: TypeReference = {
	type: 'code',
	title: 'Code',
	fields: [
		{
			name: 'language',
			type: 'string',
			title: 'Language',
			initialValue: 'typescript',
			list: [
				{ title: 'TypeScript', value: 'typescript' },
				{ title: 'JavaScript', value: 'javascript' },
				{ title: 'Svelte', value: 'svelte' },
				{ title: 'HTML', value: 'html' },
				{ title: 'CSS', value: 'css' },
				{ title: 'Shell', value: 'bash' },
				{ title: 'JSON', value: 'json' }
			],
			options: { layout: 'dropdown' }
		},
		{
			name: 'code',
			type: 'text',
			title: 'Code',
			rows: 10,
			validation: (Rule) => Rule.required()
		}
	],
	preview: { select: { title: 'language', subtitle: 'code' } }
};

/** The page builder's full set, in the order they appear in the "add" menu. */
export const layoutBlocks: TypeReference[] = [
	callToAction,
	contentBlock,
	mediaBlock,
	archiveBlock,
	formBlock
];

/** What a post's body can contain besides text. */
export const richTextBlocks: TypeReference[] = [banner, codeBlock, mediaBlock];
