/**
 * Whether this instance serves the rendered API reference at `GET /api/docs`.
 *
 * Its own tiny module, no imports, for the same reason as `limits.ts`: the
 * route that mounts the page and the admin UI that links to it have to agree,
 * and two copies of `!== false` agree right up until someone changes one of
 * them. A link to a 404 is worse than no link.
 *
 * On by default. The page is authenticated, so anyone who can load it could
 * already read `/api/openapi.json` — this instance's whole content model — and
 * the page shows them nothing further. The one thing it does that the JSON
 * endpoint doesn't is load Scalar from a public CDN, so `docsUi: false` is the
 * switch for a deployment that shouldn't pull third-party scripts.
 */
export function isApiDocsEnabled(config: { openapi?: { docsUi?: boolean } } | null | undefined) {
	return config?.openapi?.docsUi !== false;
}

/** Where that reference lives, for anything that wants to link to it. */
export const API_DOCS_PATH = '/api/docs';
