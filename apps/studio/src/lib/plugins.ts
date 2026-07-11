/**
 * Client-safe plugin registry for the admin app.
 *
 * The admin page imports this directly (component parts can't cross SvelteKit
 * `load`); `aphex.config.ts` imports the same array so the server engine ingests
 * schema/route/transform parts. Keep this module free of server-only imports (DB
 * adapters, secrets) so it's safe in the browser bundle.
 */
import { seoPlugin } from '@aphexcms/plugin-seo';
import { colorPickerPlugin } from '@aphexcms/plugin-color-picker';

export const plugins = [
	// Color is not a built-in field type — this plugin provides the `color-picker`
	// widget used by `{ type: 'string', input: 'color-picker' }` fields (site
	// settings, theme schemes, etc.).
	colorPickerPlugin(),
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
	})
];
