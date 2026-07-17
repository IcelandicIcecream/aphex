import type { Field, SchemaType, BaseField } from '@aphexcms/cms-core';
import { desugarFieldType } from '@aphexcms/cms-core';

/**
 * The SEO plugin's schema contribution — a reusable "SEO & Social" object field.
 *
 * This module is SERVER-SAFE (plain TypeScript, no Svelte components), because it's
 * imported into document schemas which are evaluated on both the server (engine)
 * and the client (admin). The plugin's component parts live in ./index.ts, which
 * must NOT be imported from here.
 *
 * Three ways to add it, all storing the same `seo` object:
 *   - `seoPlugin({ collections: ['blog_post'] })` — auto-inject on chosen types.
 *   - `{ type: 'seo' }` — the literal. Registering `seoPlugin()` augments core's
 *     `FieldTypeMap` (see below) so it's type-safe with no import, and the plugin's
 *     schema-transform desugars it into the object.
 *   - `seoField('seo')` — the builder, for when you'd rather import it than rely on
 *     the ambient type.
 */

/** The `type` keyword this plugin desugars (authored as `{ type: 'seo' }`). */
export const SEO_TYPE = 'seo';

/**
 * The authored shape of a `{ type: 'seo' }` field. The plugin's schema-transform
 * expands it into the SEO `object` before the engine/codegen see it. Extra props
 * (`name`, `title`, `group`, …) come from `BaseField`.
 */
export interface SeoField extends BaseField {
	type: 'seo';
}

// Register `seo` into core's field-type registry so `{ type: 'seo' }` is a
// first-class, type-safe field wherever this plugin is installed. Picked up
// globally once the app imports the plugin (e.g. in `plugins.ts`).
declare module '@aphexcms/cms-core' {
	interface FieldTypeMap {
		seo: SeoField;
	}
}

interface SeoFieldConfig {
	name?: string;
	title?: string;
	description?: string;
	group?: string;
}

/** Build the "SEO & Social" object field. Everything is optional — the frontend
 *  falls back to the document's own title / excerpt / cover image. */
function buildSeoField(config: SeoFieldConfig = {}): Field {
	const {
		name = 'seo',
		title = 'SEO & Social',
		description = 'Optional. Control how this appears in Google and on social media. Leave blank to use sensible defaults from the fields above.',
		group
	} = config;
	return {
		name,
		type: 'object',
		title,
		description,
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
 * The reusable "SEO & Social" object field. Embed it in any document with
 * `seoField('seo')` (or pass a group name), or use the `{ type: 'seo' }` literal.
 */
export function seoField(group?: string): Field {
	return buildSeoField({ group });
}

/**
 * Schema-transform: desugar every `{ type: 'seo' }` field into the SEO `object`,
 * everywhere in the schema list. Registered as an `aphex/schema/transform` part so
 * it runs in the engine, admin, and type generator alike — the engine never sees a
 * `seo` primitive.
 */
export function expandSeoTypes(schemas: SchemaType[]): SchemaType[] {
	return desugarFieldType(schemas, {
		type: SEO_TYPE,
		build: (f) => buildSeoField({ name: f.name, title: f.title })
	});
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
