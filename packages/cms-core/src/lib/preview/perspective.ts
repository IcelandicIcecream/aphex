import type { Auth } from '../types/auth.js';

export type PreviewPerspective = 'draft' | 'published';

/**
 * Resolve the content perspective for a SvelteKit load function.
 *
 * Returns `'draft'` only when the `?aphex-preview` query param is present
 * AND the request carries a valid authenticated session — so unauthenticated
 * visitors who manually append the param always get published content.
 *
 * @example
 * // +page.server.ts
 * import { getPreviewPerspective } from '@aphexcms/cms-core/server';
 *
 * export const load = async ({ locals, url }) => {
 *   const perspective = getPreviewPerspective(locals.auth, url);
 *   const post = await api.findOne({ perspective });
 * };
 */
export function getPreviewPerspective(auth: Auth | undefined, url: URL): PreviewPerspective {
	const isAuthenticated = auth?.type === 'session';
	return url.searchParams.has('aphex-preview') && isAuthenticated ? 'draft' : 'published';
}
