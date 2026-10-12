<div align="center">
  <img src="./apps/studio/static/favicon.svg" alt="AphexCMS logo" width="72" />
  <h1>AphexCMS</h1>
  <p>
    <strong>An open-source CMS for SvelteKit. Content lives in your own database.</strong>
  </p>
  <p>
    Schemas are TypeScript. The admin UI, APIs, and your site deploy as one SvelteKit app.
  </p>

  <p>
    <a href="https://getaphex.com"><strong>Website</strong></a> ·
    <a href="https://getaphex.com/admin"><strong>Try the demo</strong></a> ·
    <a href="https://docs.getaphex.com"><strong>Documentation</strong></a> ·
    <a href="https://docs.getaphex.com/getting-started"><strong>Get started</strong></a>
  </p>

  <p>
    <a href="https://github.com/IcelandicIcecream/aphex/actions/workflows/ci.yml"><img src="https://github.com/IcelandicIcecream/aphex/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
    <a href="https://www.npmjs.com/package/@aphexcms/cms-core"><img src="https://img.shields.io/npm/v/%40aphexcms%2Fcms-core?label=npm" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/@aphexcms/cms-core"><img src="https://img.shields.io/npm/dm/%40aphexcms%2Fcms-core" alt="npm downloads" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-f0a04d" alt="MIT license" /></a>
  </p>
</div>

<img
  src="./admin-screenshot.webp"
  alt="The Aphex Studio showing a page's fields beside its live site, with the hero selected for editing in place"
  width="100%"
/>

## Quick start

```bash
pnpm create aphex my-app
cd my-app
pnpm install
pnpm dev
```

Open **[localhost:5173/admin](http://localhost:5173/admin)**. The first user to sign up
becomes super admin.

New projects use SQLite by default and create their tables on first boot, so there is nothing
to install or migrate. Postgres is one env var away (`APHEX_DATABASE=postgres`). Schemas and
code don't change between adapters, but content doesn't move between databases — pick the
one you'll ship with early. See [Database](https://docs.getaphex.com/database).

## Schemas

Content types are defined in TypeScript:

```ts
import { defineType } from '@aphexcms/cms-core';

export const menuItem = defineType({
	type: 'document',
	name: 'menuItem',
	title: 'Menu Item',
	fields: [
		{ name: 'name', type: 'string', title: 'Name' },
		{ name: 'price', type: 'number', title: 'Price' },
		{ name: 'image', type: 'image', title: 'Image' }
	]
});
```

From that one definition you get:

| Interface     | What you get                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| **Local API** | Typed queries from your SvelteKit `load` functions, no HTTP round trip                                 |
| **HTTP API**  | REST endpoints with zod-validated request bodies                                                       |
| **GraphQL**   | A schema generated from your content types                                                             |
| **Studio**    | An admin UI with validation, drafts, version history, and publishing                                   |
| **MCP**       | A Streamable HTTP MCP server so AI clients can read and write content, subject to the same permissions |

## Editing

- Visual editing: live preview of your SvelteKit pages with click-to-edit (stega-encoded).
- Drafts, auto-save, scheduled publish/unpublish, and version history.
- Rich text is Portable Text, edited with TipTap. Supports custom block types, inline
  objects, marks, and annotations.
- The admin and the site are the same SvelteKit app, so there is one deploy and no webhook
  sync between a CMS host and a frontend host.

## Adapters

Infrastructure is behind adapter interfaces, so the core has no dependency on a specific
database, storage, auth, or email provider.

| Concern        | First-party support                                   |
| -------------- | ----------------------------------------------------- |
| Database       | PostgreSQL, PGlite, SQLite, Turso/libSQL              |
| Storage        | Local filesystem, S3, Cloudflare R2, MinIO            |
| Authentication | Better Auth                                           |
| Email          | SMTP/Nodemailer, Resend                               |
| AI             | OpenAI-compatible providers, MCP for external clients |

Both database adapters run the same conformance test suite. SQLite is a full adapter, not a
reduced one for local development.

## Also included

- Multi-tenancy: organizations with parent/child hierarchy, role-based permissions,
  field-level access rules, and row-level security on PostgreSQL
- Events and jobs: an append-only domain event log, a transactional outbox, and a
  database-backed job queue with leases, retries, exponential backoff, and dead-lettering
- Assets: local or S3-compatible storage, private assets, image variants, direct uploads
- Plugins: add schemas, admin UI, routes, permissions, MCP tools, event consumers, and job
  handlers from a package
- An AI assistant in the admin UI that uses the same schemas and permissions as everything
  else

## Packages

| Package                        | Purpose                                                  |
| ------------------------------ | -------------------------------------------------------- |
| `@aphexcms/cms-core`           | Content engine, Studio, API handlers, GraphQL, and MCP   |
| `@aphexcms/postgresql-adapter` | PostgreSQL and PGlite database adapters                  |
| `@aphexcms/sqlite-adapter`     | SQLite and Turso/libSQL database adapters                |
| `@aphexcms/storage-s3`         | S3-compatible object storage                             |
| `@aphexcms/nodemailer-adapter` | SMTP email, including a Mailpit development helper       |
| `@aphexcms/resend-adapter`     | Resend email for production                              |
| `@aphexcms/ai-openai`          | OpenAI-compatible model backend for the Studio assistant |
| `@aphexcms/visual-editing`     | Live preview, stega helpers, and click-to-edit overlays  |
| `@aphexcms/plugin-forms`       | Editor-composed forms, submissions, and notifications    |
| `@aphexcms/plugin-seo`         | SEO fields, previews, and metadata generation            |
| `@aphexcms/ui`                 | Shared shadcn-svelte component library                   |
| `create-aphex`                 | Project scaffolder used by `pnpm create aphex`           |

## Documentation

- [Getting started](https://docs.getaphex.com/getting-started)
- [Schemas](https://docs.getaphex.com/schemas) — fields, validation, hooks, conditional fields
- [APIs](https://docs.getaphex.com/local-api) — Local API, HTTP, GraphQL, MCP
- [Visual editing](https://docs.getaphex.com/visual-editing)
- [Events and jobs](https://docs.getaphex.com/events-and-jobs)
- [Deployment](https://docs.getaphex.com/deployment) — Docker, Railway, Render, Coolify/Dokploy

The docs also publish an [llms.txt](https://docs.getaphex.com/llms.txt) and a Markdown
version of every page.

## License and contributing

Everything in this repository is [MIT licensed](./LICENSE): the admin UI, the content
engine, the APIs, the adapters, and the job system.

Contributions are welcome. See the
[contributing guide](https://docs.getaphex.com/contributing) for setup, architecture, code
standards, and the release process. [`CLAUDE.md`](./CLAUDE.md) documents the architectural
boundaries and common traps for anyone working in the repo with an AI agent.

Development is supported by [White Raven Brands](https://github.com/whiteravenbrands) and
[sponsors](https://github.com/sponsors/IcelandicIcecream).

---

<div align="center">
  <a href="https://github.com/IcelandicIcecream/aphex/issues">Report an issue</a> ·
  <a href="https://github.com/IcelandicIcecream/aphex/discussions">Discussions</a>
</div>
