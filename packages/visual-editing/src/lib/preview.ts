/**
 * Whether the current URL is in preview mode (has the `aphex-preview` marker).
 * Safe to call client-side — it only reports the param's presence and does NOT
 * grant access to draft content.
 *
 * To resolve the actual content perspective (draft vs published) use
 * `getPreviewPerspective(locals.auth, url)` from `@aphexcms/cms-core/server`
 * inside a load function — draft access is gated on an authenticated session,
 * so appending `?aphex-preview` alone never exposes drafts.
 */
export function isPreviewMode(url: URL): boolean {
	return url.searchParams.has('aphex-preview');
}
