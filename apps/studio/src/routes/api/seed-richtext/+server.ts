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

	const richtextContent = [
		{
			_type: 'block',
			_key: 'h1-intro',
			style: 'h1',
			children: [{ _type: 'span', _key: 's1', text: 'Welcome to Aphex CMS' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'p1',
			style: 'normal',
			children: [
				{ _type: 'span', _key: 's2', text: 'This is a ' },
				{ _type: 'span', _key: 's3', text: 'richtext field', marks: ['strong'] },
				{ _type: 'span', _key: 's4', text: ' powered by ' },
				{ _type: 'span', _key: 's5', text: 'TipTap', marks: ['em'] },
				{ _type: 'span', _key: 's6', text: ' and stored as ' },
				{ _type: 'span', _key: 's7', text: 'Portable Text', marks: ['strong', 'em'] },
				{ _type: 'span', _key: 's8', text: ' JSON.' }
			],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'h2-features',
			style: 'h2',
			children: [{ _type: 'span', _key: 's9', text: 'Features' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'li1',
			style: 'normal',
			listItem: 'bullet',
			level: 1,
			children: [
				{ _type: 'span', _key: 's10', text: 'Headings, ' },
				{ _type: 'span', _key: 's11', text: 'bold', marks: ['strong'] },
				{ _type: 'span', _key: 's12', text: ', ' },
				{ _type: 'span', _key: 's13', text: 'italic', marks: ['em'] },
				{ _type: 'span', _key: 's14', text: ', ' },
				{ _type: 'span', _key: 's15', text: 'underline', marks: ['underline'] },
				{ _type: 'span', _key: 's16', text: ', and ' },
				{ _type: 'span', _key: 's17', text: 'code', marks: ['code'] }
			],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'li2',
			style: 'normal',
			listItem: 'bullet',
			level: 1,
			children: [{ _type: 'span', _key: 's18', text: 'Bullet and numbered lists with nesting' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'li3',
			style: 'normal',
			listItem: 'bullet',
			level: 1,
			children: [
				{ _type: 'span', _key: 's19', text: 'Links like ' },
				{ _type: 'span', _key: 's20', text: 'portabletext.org', marks: ['link1'] }
			],
			markDefs: [{ _type: 'link', _key: 'link1', href: 'https://portabletext.org' }]
		},
		{
			_type: 'block',
			_key: 'li4',
			style: 'normal',
			listItem: 'bullet',
			level: 1,
			children: [{ _type: 'span', _key: 's21', text: 'Custom block types (see below)' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'h2-num',
			style: 'h2',
			children: [{ _type: 'span', _key: 'sn0', text: 'Numbered List' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'nl1',
			style: 'normal',
			listItem: 'number',
			level: 1,
			children: [{ _type: 'span', _key: 'sn1', text: 'Step one' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'nl2',
			style: 'normal',
			listItem: 'number',
			level: 1,
			children: [{ _type: 'span', _key: 'sn2', text: 'Step two' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'nl3',
			style: 'normal',
			listItem: 'number',
			level: 1,
			children: [{ _type: 'span', _key: 'sn3', text: 'Step three' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'bq1',
			style: 'blockquote',
			children: [
				{
					_type: 'span',
					_key: 's22',
					text: 'The data format is the contract. Store standard Portable Text, render with any compatible library.'
				}
			],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'h2-custom',
			style: 'h2',
			children: [{ _type: 'span', _key: 'sc0', text: 'Custom Blocks (below are custom types)' }],
			markDefs: []
		},
		{
			_type: 'callout',
			_key: 'callout1',
			tone: 'info',
			text: 'This callout is a CUSTOM BLOCK TYPE — defined in the schema, edited in a modal, rendered by @portabletext/svelte on the frontend.'
		},
		{
			_type: 'block',
			_key: 'h3-code',
			style: 'h3',
			children: [{ _type: 'span', _key: 's23', text: 'Code Example (also a custom block)' }],
			markDefs: []
		},
		{
			_type: 'block',
			_key: 'p2',
			style: 'normal',
			children: [
				{
					_type: 'span',
					_key: 's24',
					text: 'Here is how you render Portable Text on the frontend:'
				}
			],
			markDefs: []
		},
		{
			_type: 'codeBlock',
			_key: 'code1',
			language: 'svelte',
			code: "<script>\n  import { PortableText } from '@portabletext/svelte'\n</script>\n\n<PortableText value={document.content} />"
		},
		{
			_type: 'youtube',
			_key: 'yt1',
			url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			caption: 'A YouTube embed — this is a custom block type'
		},
		{
			_type: 'callout',
			_key: 'callout2',
			tone: 'warning',
			text: 'Remember to publish your document before visiting /admin/render-test — it only shows published content.'
		}
	];

	const result = await localAPI.collections.simple_document.create(
		context,
		{
			title: 'Rich Text',
			description: 'Richtext demo',
			content: richtextContent
		} as any,
		{ publish: true }
	);

	return json({
		success: true,
		message: 'Seeded and published simple_document with richtext content',
		documentId: result.document.id
	});
};
