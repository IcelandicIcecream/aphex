import type { Field } from '@aphexcms/cms-core';

/**
 * A reusable "SEO & Social" object field. Embed it in any document with
 * `seoField('seo')` (or pass a group name). Everything is optional — the
 * frontend falls back to the document's own title / excerpt / cover image —
 * so editors only fill these in when they want to override the defaults.
 */
export function seoField(group?: string): Field {
	return {
		name: 'seo',
		type: 'object',
		title: 'SEO & Social',
		description:
			'Optional. Control how this appears in Google and on social media. Leave blank to use sensible defaults from the fields above.',
		...(group ? { group } : {}),
		fields: [
			{
				name: 'metaTitle',
				type: 'string',
				title: 'Meta title',
				description:
					'Overrides the title in search results and social cards. Best around 60 characters.',
				validation: (Rule) => Rule.max(70)
			},
			{
				name: 'metaDescription',
				type: 'text',
				title: 'Meta description',
				rows: 3,
				description:
					'The snippet shown under the title in search results. ~155 characters. Falls back to the excerpt.',
				validation: (Rule) => Rule.max(160)
			},
			{
				name: 'ogImage',
				type: 'image',
				title: 'Social share image',
				description:
					'Shown when this is shared on social media. Ideally 1200×630. Falls back to the cover image.'
			},
			{
				name: 'noIndex',
				type: 'boolean',
				title: 'Hide from search engines',
				description:
					'Stops Google and others from indexing this page (it stays publicly reachable).'
			}
		]
	};
}
