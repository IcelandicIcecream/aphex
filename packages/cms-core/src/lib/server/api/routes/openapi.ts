import { Hono } from 'hono';
import { generateOpenApiDocument } from '../openapi/generate';
import { isApiDocsEnabled } from '../../../api/docs-ui';
import type { AphexEnv } from '../index';

/**
 * `GET /api/openapi.json` — the spec for *this* instance.
 *
 * Generated per request rather than served from a file, because half of it only
 * exists at runtime: the per-collection document shapes come from
 * `cmsEngine.config.schemaTypes`. A checked-in file would describe `draftData`
 * as an untyped record forever.
 *
 * Authenticated (see `protectedApiRoutes` in `auth/auth-hooks.ts`): the document
 * enumerates this deployment's entire content model, which is not something to
 * hand to anonymous callers even though no content is included.
 *
 * Not cached: generation is pure object-building over schemas already in memory,
 * and a stale spec after a schema change is worse than the microseconds saved.
 */
export const openapiRouter: Hono<AphexEnv> = new Hono<AphexEnv>().get('/', (c) => {
	const { cmsEngine } = c.var.aphexCMS;
	const url = new URL(c.req.url);

	const doc = generateOpenApiDocument({
		schemaTypes: cmsEngine.config.schemaTypes,
		serverUrl: `${url.protocol}//${url.host}`
	});

	return c.json(doc);
});

/**
 * The Scalar build this page loads, pinned by exact version with an integrity
 * hash.
 *
 * Pinned because the page is same-origin with the admin: whatever this script
 * is, it runs with the signed-in user's cookies and can call the whole write API
 * as them. An unpinned `@scalar/api-reference` resolves to whatever jsDelivr
 * serves today, which means a third party can change what executes on your admin
 * origin without anyone here deciding to upgrade. The SRI hash makes that
 * concrete rather than trusted: if the bytes differ, the browser refuses to run
 * them and the page degrades to empty instead of running something unreviewed.
 *
 * Bumping this is a deliberate two-step: change the version, recompute the hash
 * (`curl -sL <url> | openssl dgst -sha384 -binary | openssl base64 -A`).
 */
const SCALAR_VERSION = '1.68.0';
const SCALAR_SRC = `https://cdn.jsdelivr.net/npm/@scalar/api-reference@${SCALAR_VERSION}`;
const SCALAR_INTEGRITY = 'sha384-ayGz8N+NChlUEfR0zr5Zy3T6Q4lhcdiASJNoshS6+vxV56ZE300qfWNBjj9pqsLN';

/**
 * `GET /api/docs` — a rendered reference for the spec above.
 *
 * Scalar rather than Swagger UI: it reads OpenAPI 3.1 natively (Swagger UI still
 * treats 3.1 as a best-effort downgrade, and 3.1 is what `z.toJSONSchema` emits
 * cleanly), and it's a single script tag with no build step.
 *
 * Authenticated, though the page carries no content of its own. Two reasons: an
 * unauthenticated visitor can't read `/api/openapi.json` anyway, so they'd get a
 * shell that fails to load its document and renders a cryptic error; and an
 * Aphex-branded API console answering on every content site is a fingerprint
 * nobody asked for. Signed out, this redirects to the login page — which says
 * what happened, unlike a 401 rendered inside a spec viewer.
 */
export const openapiDocsRouter: Hono<AphexEnv> = new Hono<AphexEnv>().get('/', (c) => {
	const { config } = c.var.aphexCMS.cmsEngine;

	if (!isApiDocsEnabled(config)) {
		return c.notFound();
	}

	// The auth hook resolves a session for any `/api/*` path but only rejects the
	// routes it protects, so this is a populated principal or null.
	if (!c.var.auth) {
		const loginUrl = config.auth?.loginUrl || '/login';
		return c.redirect(loginUrl, 302);
	}

	return c.html(
		`<!doctype html>
<html>
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="robots" content="noindex" />
		<title>AphexCMS API reference</title>
	</head>
	<body>
		<div id="app"></div>
		<script
			src="${SCALAR_SRC}"
			integrity="${SCALAR_INTEGRITY}"
			crossorigin="anonymous"
		></script>
		<script>
			Scalar.createApiReference('#app', {
				url: '/api/openapi.json',
				// Send the admin session cookie with the spec fetch.
				fetch: (input, init) => fetch(input, { ...init, credentials: 'same-origin' }),
				theme: 'default',
				hideDownloadButton: false
			});
		</script>
	</body>
</html>`
	);
});
