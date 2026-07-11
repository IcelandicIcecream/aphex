import type { Field, SchemaType } from '@aphexcms/cms-core';

/**
 * The SEO plugin's schema contribution — a reusable "SEO & Social" object field.
 *
 * This module is SERVER-SAFE (plain TypeScript, no Svelte components), because it's
 * imported into document schemas which are evaluated on both the server (engine)
 * and the client (admin). The plugin's component parts live in ./index.ts, which
 * must NOT be imported from here.
 *
 * Embed it in any document with `seoField('seo')` (or pass a group name).
 * Everything is optional — the frontend falls back to the document's own title /
 * excerpt / cover image — so editors only fill these in to override the defaults.
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
				// Render with this plugin's length-metered input (aphex/field/component).
				input: 'seo-length',
				validation: (Rule) => Rule.max(70)
			},
			{
				name: 'metaDescription',
				type: 'text',
				title: 'Meta description',
				rows: 3,
				description:
					'The snippet shown under the title in search results. ~155 characters. Falls back to the excerpt.',
				// Length-metered textarea (aphex/field/component).
				input: 'seo-length',
				validation: (Rule) => Rule.max(200)
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
			},
			{
				// UI-only: renders a live Google-style search-result preview.
				name: 'seoPreview',
				type: 'string',
				title: 'Search preview',
				input: 'seo-preview'
			}
		]
	};
}

/**
 * Inject the SEO field group into a document schema (adds the `seo` field and a
 * `SEO` group tab if absent). Idempotent — a schema that already has a `seo` field
 * is returned untouched. Used by the plugin's schema-transform part to auto-enable
 * SEO on chosen collections, like Payload's `collections: [...]`.
 */
export function injectSeoField(schema: SchemaType, group = 'seo'): SchemaType {
	if (schema.type !== 'document') return schema;
	if (schema.fields.some((f) => f.name === 'seo')) return schema;
	const groups = schema.groups ?? [];
	const withGroup = groups.some((g) => g.name === group)
		? groups
		: [...groups, { name: group, title: 'SEO' }];
	return { ...schema, groups: withGroup, fields: [...schema.fields, seoField(group)] };
}
