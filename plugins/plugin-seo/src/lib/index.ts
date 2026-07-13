/**
 * First-party SEO plugin — feature-comparable to @payloadcms/plugin-seo.
 *
 * `seoPlugin({ collections, generateTitle, ... })`:
 *  - `collections` auto-injects the SEO meta field group into those document types
 *    (via an aphex/schema/transform part) — you don't add `seoField` by hand.
 *  - the `generate*` functions drive the ✨ Generate action and the live search
 *    preview.
 *
 * Contributes: a document action (Generate SEO), an admin tool (SEO audit), the
 * length-metered inputs, the search-result preview, a schema transform that
 * desugars the `{ type: 'seo' }` literal, and — when `collections` is set — a
 * second transform that auto-injects SEO on those types. Everything is client-plane
 * except the transforms, which are pure and run on both the engine and the admin.
 */
import { definePlugin } from '@aphexcms/cms-core';
import type { PluginPart } from '@aphexcms/cms-core';
import { Sparkles } from '@lucide/svelte';
import GenerateSeoAction from './GenerateSeoAction.svelte';
import SeoTool from './SeoTool.svelte';
import MetaLengthInput from './MetaLengthInput.svelte';
import SeoPreview from './SeoPreview.svelte';
import { injectSeoField, expandSeoTypes } from './schema';
import { configureSeo, type SeoGenerators } from './config';

export interface SeoPluginOptions extends Partial<SeoGenerators> {
	/** Document type names to auto-enable SEO on (injects the meta field group). */
	collections?: string[];
	/** Field group the SEO fields go in. Default `'seo'`. */
	group?: string;
}

export function seoPlugin(options: SeoPluginOptions = {}) {
	const { collections, group = 'seo', ...generators } = options;
	configureSeo(generators);

	const parts: PluginPart[] = [
		{
			implements: 'aphex/document/action',
			id: 'seo.generate',
			title: 'Generate SEO',
			component: GenerateSeoAction,
			appliesTo: collections
		},
		{
			implements: 'aphex/admin/tool',
			id: 'seo',
			title: 'SEO',
			icon: Sparkles,
			component: SeoTool,
			placement: 'sidebar'
		},
		{ implements: 'aphex/field/component', input: 'seo-length', component: MetaLengthInput },
		{ implements: 'aphex/field/component', input: 'seo-preview', component: SeoPreview },
		// Desugar the `{ type: 'seo' }` literal into the SEO object, everywhere.
		{ implements: 'aphex/schema/transform', transform: expandSeoTypes }
	];

	if (collections && collections.length > 0) {
		parts.push({
			implements: 'aphex/schema/transform',
			transform: (schemas) =>
				schemas.map((s) => (collections.includes(s.name) ? injectSeoField(s, group) : s))
		});
	}

	return definePlugin({ name: '@aphexcms/plugin-seo', version: '0.1.0', parts });
}
