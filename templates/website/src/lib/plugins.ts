/**
 * Client-safe plugin registry for the admin app.
 *
 * The admin page imports this directly (component parts can't cross SvelteKit
 * `load`); `aphex.config.ts` imports the same array so the server engine ingests
 * schema/route/transform parts. Keep this module free of server-only imports (DB
 * adapters, secrets) so it's safe in the browser bundle.
 *
 * Two plugins ship with this template:
 *
 *  - **SEO** injects the meta group into the types listed below — that's why
 *    `page.ts` and `post.ts` declare a `seo` group tab but no `seo` field.
 *  - **Forms** contributes the `form` and `formSubmission` collections, the
 *    public `POST /api/form-submissions` endpoint and the notification consumer.
 *    Nothing else is needed to make the Form block work; the block's *rendering*
 *    lives in the template (`$lib/blocks/FormBlock.svelte`), because a plugin
 *    shipping markup would be shipping a design with it.
 */
import { seoPlugin } from '@aphexcms/plugin-seo';
import { formsPlugin } from '@aphexcms/plugin-forms';

export const plugins = [
	// Notification emails go out as the address the CMS's own mail uses. Falls back
	// to APHEX_EMAIL_FROM; with neither set, submissions are still stored.
	formsPlugin(),
	seoPlugin({
		collections: ['page', 'post', 'category'],
		// Title and description fall back to each type's own `preview` config, so
		// only the public URL needs per-type wiring here — it's the one thing the
		// plugin can't infer from the schema.
		generateURL: (doc, { typeName }) => {
			const slug = typeof doc.slug === 'string' ? doc.slug : '';
			if (typeName === 'post') return `/posts/${slug}`;
			if (typeName === 'category') return `/posts?category=${slug}`;
			return slug === 'home' ? '/' : `/${slug}`;
		}
	})
];
