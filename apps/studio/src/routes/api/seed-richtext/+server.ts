import { dev } from '$app/environment';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!dev) throw error(404);

	const auth = locals.auth;
	if (!auth || auth.type !== 'session') {
		throw error(401, 'Not authenticated');
	}

	const localAPI = locals.aphexCMS.localAPI;
	const context = { organizationId: auth.organizationId!, overrideAccess: true };

	const blockContent = [
		{
			_type: 'block',
			_key: 'h1',
			style: 'h1',
			children: [{ _type: 'span', _key: 's1', text: 'Heading 1 — The Main Title' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'p1',
			style: 'normal',
			children: [
				{
					_type: 'span',
					_key: 's2',
					text: 'This is normal body text. It demonstrates the base paragraph style with '
				},
				{ _type: 'span', _key: 's3', text: 'bold', marks: ['strong'] },
				{ _type: 'span', _key: 's4', text: ', ' },
				{ _type: 'span', _key: 's5', text: 'italic', marks: ['em'] },
				{ _type: 'span', _key: 's6', text: ', ' },
				{ _type: 'span', _key: 's7', text: 'underline', marks: ['underline'] },
				{ _type: 'span', _key: 's8', text: ', ' },
				{ _type: 'span', _key: 's9', text: 'strikethrough', marks: ['strike-through'] },
				{ _type: 'span', _key: 's10', text: ', and ' },
				{ _type: 'span', _key: 's11', text: 'inline code', marks: ['code'] },
				{ _type: 'span', _key: 's12', text: ' decorators.' }
			],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'h2',
			style: 'h2',
			children: [{ _type: 'span', _key: 's13', text: 'Heading 2 — Section Title' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'p2',
			style: 'normal',
			children: [
				{
					_type: 'span',
					_key: 's14',
					text: 'Each heading level has its own distinct size and weight. Check the visual hierarchy below.'
				}
			],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'h3',
			style: 'h3',
			children: [{ _type: 'span', _key: 's15', text: 'Heading 3 — Subsection' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'p3',
			style: 'normal',
			children: [
				{
					_type: 'span',
					_key: 's16',
					text: 'H3 is slightly smaller than H2 but still bold and prominent.'
				}
			],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'h4',
			style: 'h4',
			children: [{ _type: 'span', _key: 's17', text: 'Heading 4 — Sub-subsection' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'h5',
			style: 'h5',
			children: [{ _type: 'span', _key: 's19', text: 'Heading 5 — Minor Heading' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'h6',
			style: 'h6',
			children: [{ _type: 'span', _key: 's21', text: 'Heading 6 — Label Style' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'bq',
			style: 'blockquote',
			children: [
				{
					_type: 'span',
					_key: 's23',
					text: 'This is a blockquote. It has a left border and muted color — useful for quotes, callouts, or highlighted notes.'
				}
			],
			markDefs: []
		},

		// Lists section
		{
			_type: 'block',
			_key: 'h2-lists',
			style: 'h2',
			children: [{ _type: 'span', _key: 's24', text: 'Lists' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'li1',
			style: 'normal',
			listItem: 'bullet',
			level: 1,
			children: [{ _type: 'span', _key: 's25', text: 'Bullet item one' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'li2',
			style: 'normal',
			listItem: 'bullet',
			level: 1,
			children: [{ _type: 'span', _key: 's26', text: 'Bullet item two' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'li3',
			style: 'normal',
			listItem: 'bullet',
			level: 2,
			children: [{ _type: 'span', _key: 's27', text: 'Nested bullet' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'li4',
			style: 'normal',
			listItem: 'bullet',
			level: 2,
			children: [{ _type: 'span', _key: 's27b', text: 'Another nested bullet' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'li5',
			style: 'normal',
			listItem: 'bullet',
			level: 1,
			children: [{ _type: 'span', _key: 's26c', text: 'Back to level one' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'nl1',
			style: 'normal',
			listItem: 'number',
			level: 1,
			children: [{ _type: 'span', _key: 's28', text: 'Numbered step one' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'nl2',
			style: 'normal',
			listItem: 'number',
			level: 1,
			children: [{ _type: 'span', _key: 's29', text: 'Numbered step two' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'nl3',
			style: 'normal',
			listItem: 'number',
			level: 1,
			children: [{ _type: 'span', _key: 's29b', text: 'Numbered step three' }],
			markDefs: []
		},

		// Links, annotations, and inline objects
		{
			_type: 'block',
			_key: 'h2-links',
			style: 'h2',
			children: [{ _type: 'span', _key: 's30', text: 'Links & Annotations' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'p7',
			style: 'normal',
			children: [
				{ _type: 'span', _key: 's31', text: 'Here is a ' },
				{ _type: 'span', _key: 's32', text: 'link to Portable Text', marks: ['link1'] },
				{ _type: 'span', _key: 's33', text: ' — the spec powering this editor.' }
			],
			markDefs: [{ _type: 'link', _key: 'link1', href: 'https://portabletext.org' }]
		},
		{
			_type: 'block',
			_key: 'p-footnote',
			style: 'normal',
			children: [
				{ _type: 'span', _key: 'sf1', text: 'This paragraph has a ' },
				{
					_type: 'span',
					_key: 'sf2',
					text: 'footnote annotation',
					marks: ['footnote1']
				},
				{
					_type: 'span',
					_key: 'sf3',
					text: ' — hover over the dashed underline to see the tooltip.'
				}
			],
			markDefs: [
				{
					_type: 'footnote',
					_key: 'footnote1',
					text: 'This is extra context provided via a footnote annotation. It appears on hover.'
				}
			]
		},

		// Inline objects
		{
			_type: 'block',
			_key: 'h2-inline',
			style: 'h2',
			children: [{ _type: 'span', _key: 'si0', text: 'Inline Objects' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'p-inline1',
			style: 'normal',
			children: [
				{
					_type: 'span',
					_key: 'si1',
					text: 'Inline objects appear within the text flow. Here is one: '
				},
				{
					_type: 'inlineNote',
					_key: 'in1',
					text: 'This is an inline note — it renders as a small chip in the editor and a tooltip on the rendered page.'
				},
				{
					_type: 'span',
					_key: 'si2',
					text: ' — and the text continues right after it.'
				}
			],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'p-inline2',
			style: 'normal',
			children: [
				{
					_type: 'span',
					_key: 'si3',
					text: 'You can have multiple inline objects in one paragraph. First note: '
				},
				{
					_type: 'inlineNote',
					_key: 'in2',
					text: 'Important implementation detail here.'
				},
				{ _type: 'span', _key: 'si4', text: ' — and a second note: ' },
				{
					_type: 'inlineNote',
					_key: 'in3',
					text: 'Another note with different content.'
				},
				{ _type: 'span', _key: 'si5', text: ' — both inline within the same block.' }
			],
			markDefs: []
		},

		// Custom blocks
		{
			_type: 'block',
			_key: 'h2-custom',
			style: 'h2',
			children: [{ _type: 'span', _key: 'sc0', text: 'Custom Blocks' }],
			markDefs: []
		},
		{
			_type: 'callout',
			_key: 'callout1',
			tone: 'info',
			text: 'This is an info callout — a custom block type that sits between paragraphs.'
		},
		{
			_type: 'callout',
			_key: 'callout2',
			tone: 'warning',
			text: 'This is a warning callout. Different tones render with different colors.'
		},
		{
			_type: 'codeBlock',
			_key: 'code1',
			language: 'ts',
			code: "const schema = {\n  name: 'content',\n  type: 'array',\n  of: [\n    { type: 'block' },\n    { type: 'image' },\n    { type: 'callout', fields: [...] }\n  ]\n};"
		}
	];

	const result = await localAPI.collections.simple_document.create(
		context,
		{
			title: 'Rich Text',
			description: 'Richtext demo',
			content: blockContent
		} as any,
		{ publish: true }
	);

	return json({
		success: true,
		message: 'Seeded and published simple_document with block content',
		documentId: result.document.id
	});
};
