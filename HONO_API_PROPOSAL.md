# Proposal: Hono-based API layer for dynamic route registration

## Problem

Today, every Aphex API endpoint requires creating a SvelteKit `+server.ts` file at the right path, even when the actual handler lives in `@aphexcms/cms-core`. Look at `apps/studio/src/routes/api/documents/+server.ts`:

```ts
export { getDocuments as GET, createDocument as POST } from '@aphexcms/cms-core/server';
```

This is a re-export shim. We have ~20 of these across `apps/studio/src/routes/api/**` and the same set duplicated in `templates/base/src/routes/api/**` and `packages/create-aphex/templates/base/src/routes/api/**`.

Two pain points:

1. **Plugins can't add endpoints.** A plugin loaded at runtime cannot create a `+server.ts` file — SvelteKit's router is static and built at compile time. The current plugin story (graphql plugin, etc.) has to ship its own `+server.ts` template that the user copies in, which defeats the point of a plugin.
2. **Adding a core endpoint is multi-file friction.** Add the handler in `cms-core/src/lib/routes/`, re-export it from `routes-exports.ts`, then create the matching `+server.ts` in `apps/studio` AND in both template copies.

## Proposal

Replace the per-endpoint `+server.ts` files with a single SvelteKit catch-all that forwards every `/api/**` request into a Hono app owned by `cms-core`. Plugins register routes onto that Hono app at boot.

### One-time SvelteKit shim

`apps/studio/src/routes/api/[...slug]/+server.ts`:

```ts
import { routes } from '@aphexcms/cms-core/server';
import type { RequestHandler } from '@sveltejs/kit';

const handler: RequestHandler = ({ request, getClientAddress }) => {
	request.headers.set('x-forwarded-for', getClientAddress());
	return routes.fetch(request);
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
export const HEAD = handler;
```

This is the **only** SvelteKit route file needed for the entire HTTP API. Same pattern lands in `templates/base` and `packages/create-aphex/templates/base`.

(Pattern lifted from `djc-image-prep/src/routes/api/[...slug]/+server.ts` — known to work in production behind a SvelteKit adapter-node deploy.)

### Core endpoints

`cms-core` exposes a Hono app with all built-in endpoints registered on it:

```ts
// packages/cms-core/src/lib/server/api/index.ts
import { Hono } from 'hono';
import { documentsRouter } from './routes/documents';
import { assetsRouter } from './routes/assets';
import { schemasRouter } from './routes/schemas';
// ...

export const app = new Hono().basePath('/api');

app.route('/documents', documentsRouter);
app.route('/assets', assetsRouter);
app.route('/schemas', schemasRouter);
// ...

export const routes = app;
export type ApiRoutes = typeof app;
```

Each existing `cms-core/src/lib/routes/*.ts` becomes a small Hono router. For example `documents.ts`:

```ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { listDocumentsQuery, createDocumentRequest } from '../api/schemas/documents';

export const documentsRouter = new Hono()
	.get('/', zValidator('query', listDocumentsQuery), async (c) => {
		const { localAPI } = c.var.aphexCMS;
		const q = c.req.valid('query');
		// ...same body as today's GET handler...
		return c.json({ success: true, data: result.docs, pagination: { ... } });
	})
	.post('/', zValidator('json', createDocumentRequest), async (c) => {
		// ...
	});
```

`hooks.server.ts` (or a Hono middleware) populates `c.var.aphexCMS` and `c.var.auth` from the SvelteKit `locals` once, and every handler reads from `c.var` — same data flow as today, just routed differently.

### Plugin registration

Plugins get an `app` reference at boot and call Hono's normal API to add routes:

```ts
// in a plugin's setup
defineAphexPlugin({
  name: 'graphql',
  routes: (app) => {
    app.post('/graphql', async (c) => { /* ... */ });
    app.get('/graphql/playground', (c) => c.html(playgroundHtml));
  }
});
```

Internally the plugin loader iterates plugins and invokes `plugin.routes?.(app)` before `routes` is exported. No new `+server.ts` files. No template copying.

For users adding **one custom endpoint** in their app, the same hook works in their `aphex.config.ts`:

```ts
export default defineAphexConfig({
  // ...
  api: (app) => {
    app.get('/hello', (c) => c.json({ hello: 'world' }));
  }
});
```

## What changes vs. what stays

**Stays the same:**

- All existing handler logic in `cms-core/src/lib/routes/*.ts` — bodies port over almost line-for-line.
- Zod schemas in `cms-core/src/lib/api/schemas/` — `zValidator` consumes them directly.
- Auth model — `authToContext(locals.auth)` becomes `authToContext(c.var.auth)`.
- The wire format (URL paths, response envelope) — clients see no change.

**Changes:**

- ~20 `+server.ts` shims in `apps/studio` deleted, replaced by 1 catch-all.
- Same deletion in `templates/base` and `packages/create-aphex/templates/base`.
- `cms-core` adds `hono` + `@hono/zod-validator` as deps.
- `routes-exports.ts` becomes irrelevant for HTTP routes (still useful for type exports).

## Tradeoffs

**Wins:**

- **Plugins can register endpoints** — the original motivation. No template copying, no codegen.
- **Adding an endpoint is one line** instead of a new file + a re-export.
- **Middleware composition** is native (`zValidator`, auth, rate-limit chain) — see `djc-image-prep/src/lib/server/api/users/users.controller.ts:34-46` for how clean the chained-middleware pattern reads.
- **Type-safe RPC client** for free — `hono/client` can consume `ApiRoutes` and give Aphex's frontend fully-typed `apiClient.documents.$get({ query: { type: 'post' } })` calls. This is a meaningful DX win on top of solving the plugin problem.
- **End-to-end testable without SvelteKit** — `app.request('/api/documents?type=post')` in unit tests, no need to spin up the dev server.

**Costs:**

- We own routing, error mapping, and 404 behavior. Hono's defaults are sensible but it's another surface.
- SvelteKit can no longer statically enumerate the API surface at build time. (No real consequence — we don't use it for prerendering anyway.)
- One more dep in `cms-core`. Hono is small (~14kB) and zero-config.
- Migration touches every existing route file. Mechanical but not free.

## Out of scope (intentionally)

- **needle-di / DI container**: `djc-image-prep` uses needle-di for service wiring (see `application.controller.ts`). We **don't** need that — Aphex services are already exposed via `locals.aphexCMS`. The Controller-class abstraction in djc-image-prep is overkill for our case; functional Hono routers are simpler and match what `cms-core` looks like today.
- **Replacing non-API SvelteKit routes**: this proposal is scoped to `/api/**`. Studio UI routes stay as normal SvelteKit pages.
- **OpenAPI generation**: `hono/zod-openapi` would give us spec generation from the existing zod schemas. Worth doing later, not part of the migration.

## Migration path

1. Add `hono` + `@hono/zod-validator` to `packages/cms-core`.
2. Create `cms-core/src/lib/server/api/index.ts` exporting an empty Hono app.
3. Port one route file (e.g. `schemas.ts`) to a Hono router as a proof-of-concept. Verify the catch-all `+server.ts` forwards correctly.
4. Port remaining routes one at a time. Each port deletes one `+server.ts` shim.
5. Delete `routes-exports.ts` HTTP exports once the last route is ported.
6. Add the plugin `routes(app)` hook and migrate the graphql plugin to use it.
7. Update `templates/base` and `packages/create-aphex/templates/base` to ship only the catch-all.
8. Document the plugin route registration API in `docs/`.

Each step is independently shippable — the catch-all and per-endpoint `+server.ts` files coexist fine during migration since SvelteKit prefers specific routes over catch-alls.

## Reference

- Working example: `/Volumes/Satechi 1TB/Documents/djcity/Code/djc-image-prep/`
  - Catch-all: `src/routes/api/[...slug]/+server.ts`
  - App composition: `src/lib/server/api/application.controller.ts`
  - Controller pattern: `src/lib/server/api/users/users.controller.ts`
- Hono on SvelteKit adapter-node is in production at djcity.
