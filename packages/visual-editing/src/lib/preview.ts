/**
 * Returns the correct API perspective based on whether the current URL has
 * the aphex-preview marker. Drop this into any SvelteKit load function to
 * transparently switch between draft and published data.
 *
 * @example
 * // +page.server.ts
 * import { getPreviewPerspective } from '@aphexcms/visual-editing';
 *
 * export async function load({ url, locals }) {
 *   const perspective = getPreviewPerspective(url);
 *   const post = await locals.aphexCMS.localAPI.findOne('blogPost', {
 *     where: { slug: { eq: params.slug } },
 *     perspective,
 *   });
 *   return { post };
 * }
 */
export function getPreviewPerspective(url: URL): 'draft' | 'published' {
	return url.searchParams.has('aphex-preview') ? 'draft' : 'published';
}

export function isPreviewMode(url: URL): boolean {
	return url.searchParams.has('aphex-preview');
}
