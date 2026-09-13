import { Hono } from 'hono';
import { generateOpenApiDocument } from '../openapi/generate';
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
 * `GET /api/docs` — a rendered reference for the spec above.
 *
 * Scalar rather than Swagger UI: it reads OpenAPI 3.1 natively (Swagger UI still
 * treats 3.1 as a best-effort downgrade, and 3.1 is what `z.toJSONSchema` emits
 * cleanly), and it's a single script tag with no build step.
 *
 * The page is a static shell — it fetches `/api/openapi.json` from the browser,
 * with the session cookie, so the spec stays behind the same auth as everything
 * else and this route serves no content of its own. A viewer who isn't signed in
 * gets an empty reference rather than a leak.
 *
 * The CDN is a deliberate tradeoff and the reason this is opt-out: a self-hosted
 * instance may not want its admin pulling a third-party script. Set
 * `api.docsUi: false` to unmount it — the JSON endpoint is unaffected.
 */
export const openapiDocsRouter: Hono<AphexEnv> = new Hono<AphexEnv>().get('/', (c) => {
	if (c.var.aphexCMS.cmsEngine.config.openapi?.docsUi === false) {
		return c.notFound();
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
		<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
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
