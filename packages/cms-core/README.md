# @aphexcms/cms-core

The core engine behind [AphexCMS](https://github.com/IcelandicIcecream/aphex) — a Sanity-inspired, database-agnostic CMS that runs **inside your SvelteKit app** rather than beside it.

The same app that serves your site serves the admin, so there is no separate CMS deployment, no content API hop between them, and live preview is a route in your own project instead of an integration.

📚 **Full documentation: [docs.getaphex.com](https://docs.getaphex.com)**

## Install

You'll normally get this via the scaffolder rather than by hand:

```bash
pnpm create aphex my-app
```

To add it to an existing SvelteKit project:

```bash
pnpm add @aphexcms/cms-core @aphexcms/ui
pnpm add @aphexcms/sqlite-adapter   # or @aphexcms/postgresql-adapter
```

## What's in the box

- **Admin UI** — a responsive three-panel editor with auto-save, validation, draft/publish, and version history.
- **Schemas in TypeScript** — `document` and `object` types with thirteen field types, Sanity-style validation rules, and conditional visibility.
- **Portable Text** — a TipTap-backed block editor with custom blocks, inline objects, marks, and annotations.
- **Four APIs over one engine** — a type-safe Local API, a Zod-validated HTTP API, a generated GraphQL schema, and a Streamable HTTP MCP server.
- **Multi-tenancy** — organizations with parent/child hierarchy, capability-based RBAC, and field-level access control.
- **Events and durable jobs** — an append-only event log, a transactional outbox, and a database-backed job queue with leases, backoff and dead-lettering. No Redis, no broker.

## Ports and adapters

`cms-core` defines the interfaces; separate packages implement them. That's what makes the engine database-agnostic, and it's the seam you extend.

| Port              | Implementations                                                           |
| ----------------- | ------------------------------------------------------------------------- |
| `DatabaseAdapter` | `@aphexcms/postgresql-adapter` (incl. PGlite), `@aphexcms/sqlite-adapter` |
| `StorageAdapter`  | Local filesystem (built in), `@aphexcms/storage-s3`                       |
| `EmailAdapter`    | `@aphexcms/nodemailer-adapter`, `@aphexcms/resend-adapter`                |
| `AuthProvider`    | `@aphexcms/auth` (Better Auth), or your own                               |
| `CacheAdapter`    | In-memory (built in), or your own                                         |

## Usage

Adapters are constructed by your app and handed to the config — the engine never reaches for a singleton of its own:

```ts title="aphex.config.ts"
import { createCMSConfig } from '@aphexcms/cms-core/server';
import { schemaTypes } from '$lib/schemaTypes/index.js';
import { db } from '$lib/server/db/index.js';
import { authProvider } from '$lib/server/auth/index.js';

export default createCMSConfig({
	schemaTypes,
	database: db,
	auth: { provider: authProvider, loginUrl: '/login' }
});
```

Then initialise the engine in your hooks, which injects the services into `event.locals.aphexCMS`:

```ts title="src/hooks.server.ts"
import { sequence } from '@sveltejs/kit/hooks';
import { createCMSHook } from '@aphexcms/cms-core/server';
import config from '../aphex.config.js';

export const handle = sequence(authHook, createCMSHook(config));
```

Read content anywhere you have a request — a `load`, an endpoint, a job:

```ts title="src/routes/[slug]/+page.server.ts"
import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';

export async function load({ params, locals }) {
	const [org] = await locals.aphexCMS.databaseAdapter.findAllOrganizations();
	const context = { ...systemContext(org.id), perspective: 'published' as const };

	const { docs } = await locals.aphexCMS.localAPI.collections.page.find(context, {
		where: { slug: { equals: params.slug } },
		limit: 1,
		// Strips organizationId / createdBy / updatedBy / publishedHash before this
		// reaches the hydration payload. Use it on every public-facing read.
		public: true
	});

	return { page: docs[0] };
}
```

## Entry points

| Import                        | For                                                                   |
| ----------------------------- | --------------------------------------------------------------------- |
| `@aphexcms/cms-core`          | Plain-JS helpers and types. Svelte-free, safe to import anywhere.     |
| `@aphexcms/cms-core/server`   | `createCMSConfig`, `createCMSHook`, the Local API, adapter interfaces |
| `@aphexcms/cms-core/client`   | Browser API clients and admin components                              |
| `@aphexcms/cms-core/schema`   | `defineType` and schema helpers                                       |
| `@aphexcms/cms-core/image`    | Responsive image URL building                                         |
| `@aphexcms/cms-core/vite`     | The `aphex()` Vite plugin                                             |
| `@aphexcms/cms-core/routes/*` | Route handlers to re-export from your own `src/routes/api/`           |

The root barrel is deliberately Svelte-free — anything that pulls in Svelte lives under `/client`, so a server-only import doesn't drag the admin bundle along with it.

## CLI

The package ships an `aphex` binary for the two things that need to happen outside a request:

```bash
aphex generate:types ./src/lib/schemaTypes/index.ts ./src/lib/generated-types.ts ./src/lib/plugins.ts
aphex migrate
```

`generate:types` is what makes `localAPI.collections.page` typed. Pass the plugins path as the third argument or collections contributed by plugins stay untyped.

## Requirements

- Node.js 22+
- SvelteKit 2 / Svelte 5

## License

MIT
