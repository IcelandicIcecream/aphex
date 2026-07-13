/**
 * Client-safe plugin registry for the admin app.
 *
 * The admin page imports this directly (component parts can't cross SvelteKit
 * `load`); `aphex.config.ts` imports the same array so the server engine ingests
 * schema/route/transform parts. Keep this module free of server-only imports (DB
 * adapters, secrets) so it's safe in the browser bundle.
 */
import { definePlugin } from '@aphexcms/cms-core';
import { seoPlugin } from '@aphexcms/plugin-seo';
import { colorPickerPlugin } from '@aphexcms/plugin-color-picker';

/**
 * Demo of the plugin settings & secrets feature — remove once a real plugin (e.g.
 * the Plato integration) declares its own settings. Shows a plain field, a dropdown,
 * and a write-only encrypted secret in the admin's Settings → Plugins tab.
 */
const demoSettingsPlugin = definePlugin({
	name: '@studio/demo-settings',
	parts: [
		{
			implements: 'aphex/settings',
			pluginId: '@studio/demo-settings',
			title: 'Demo Settings',
			description: 'Illustrates plugin settings & secrets. Safe to remove.',
			fields: [
				{ name: 'siteTagline', type: 'string', title: 'Site tagline' },
				{
					name: 'environment',
					type: 'string',
					title: 'Environment',
					options: { layout: 'dropdown' },
					list: [
						{ title: 'Production', value: 'production' },
						{ title: 'Staging', value: 'staging' }
					]
				},
				{
					name: 'apiToken',
					type: 'secret',
					title: 'Example API token',
					description: 'Stored encrypted; never sent back to the browser.'
				}
			]
		}
	]
});

export const plugins = [
	seoPlugin({
		// Auto-enable SEO on these document types (injects the meta group if absent).
		collections: ['blog_post', 'page', 'author', 'tag'],
		// Title & description are left to the defaults, which read each type's own
		// `preview` config — so blog_post uses title/excerpt, author uses name/bio,
		// and tag uses title/description without per-type wiring here. Only the public
		// URL is route-specific, so that's the one thing we scope by collection.
		generateURL: (doc, { typeName }) => {
			const slug = typeof doc.slug === 'string' ? doc.slug : '';
			if (typeName === 'author') return `/author/${slug}`;
			if (typeName === 'tag') return `/tag/${slug}`;
			if (typeName === 'page') return `/${slug}`;
			return `/blog/${slug}`;
		}
	}),
	colorPickerPlugin(),
	demoSettingsPlugin
];
